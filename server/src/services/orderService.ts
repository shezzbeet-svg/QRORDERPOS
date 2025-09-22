// @ts-nocheck
import type { OrderSource, OrderStatus, StockAdjustmentSource } from '../prisma.js';
import type { StockAdjustment } from '../data/types.js';
import { prisma } from '../prisma.js';

interface OrderItemInput {
  menuItemId: string;
  qty: number;
  notes?: string;
}

interface CreateOrderInput {
  merchantId: string;
  userId?: string;
  sessionId?: string;
  source?: OrderSource;
  items: OrderItemInput[];
  clientUuid: string;
  idempotencyKey: string;
  serviceFeeRate: number;
}

export async function createOrder(input: CreateOrderInput) {
  if (!input.items.length) {
    const err = new Error('Order requires at least one item');
    (err as any).status = 400;
    throw err;
  }
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: input.items.map(i => i.menuItemId) }, restaurantId: input.merchantId },
    include: { recipeComponents: true }
  });
  const menuItemMap = new Map(menuItems.map(item => [item.id, item]));
  for (const item of input.items) {
    if (!menuItemMap.has(item.menuItemId)) {
      const err = new Error(`Menu item ${item.menuItemId} not found`);
      (err as any).status = 400;
      throw err;
    }
  }
  const now = new Date();
  const order = await prisma.$transaction(async tx => {
    const orderRecord = await tx.order.create({
      data: {
        restaurantId: input.merchantId,
        sessionId: input.sessionId ?? null,
        takenByUserId: input.userId,
        source: input.source ?? ('waiter' as OrderSource),
        status: 'sent' as OrderStatus,
        sentAt: now.toISOString(),
        clientUuid: input.clientUuid,
        idempotencyKey: input.idempotencyKey,
        items: {
          createMany: {
            data: input.items.map(item => {
              const menuItem = menuItemMap.get(item.menuItemId)!;
              return {
                menuItemId: menuItem.id,
                qty: item.qty,
                notes: item.notes,
                priceEach: menuItem.price
              };
            })
          }
        }
      },
      include: { items: true }
    });

    const inventoryAdjustments = new Map<string, number>();
    for (const inputItem of input.items) {
      const menuItem = menuItemMap.get(inputItem.menuItemId)!;
      for (const component of menuItem.recipeComponents ?? []) {
        const qty = component.quantity * inputItem.qty;
        if (!qty) continue;
        const delta = -(qty);
        inventoryAdjustments.set(
          component.inventoryItemId,
          (inventoryAdjustments.get(component.inventoryItemId) ?? 0) + delta
        );
      }
    }
    if (inventoryAdjustments.size) {
      for (const [inventoryItemId, delta] of inventoryAdjustments) {
        await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { currentStock: { increment: delta } }
        });
      }
      const data: Array<Omit<StockAdjustment, 'id' | 'createdAt'>> = Array.from(inventoryAdjustments.entries()).map(
        ([inventoryItemId, delta]) => ({
          restaurantId: input.merchantId,
          inventoryItemId,
          userId: input.userId,
          delta,
          reason: `Recipe usage for order ${orderRecord.id}`,
          source: 'recipe' as StockAdjustmentSource,
          metadata: { orderId: orderRecord.id }
        })
      );
      await tx.stockAdjustment.createMany({ data });
    }

    return orderRecord;
  });

  const items = await prisma.orderItem.findMany({
    where: { orderId: order.id },
    include: { menuItem: true }
  });
  const subtotal = items.reduce((sum, item) => sum + item.priceEach * item.qty, 0);
  const serviceFee = Number((subtotal * input.serviceFeeRate).toFixed(2));
  const total = Number((subtotal + serviceFee).toFixed(2));

  return {
    id: order.id,
    status: order.status,
    source: order.source,
    sentAt: order.sentAt,
    totals: {
      subtotal,
      serviceFee,
      tax: 0,
      total
    },
    items: items.map(item => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.menuItem?.name ?? 'Unknown Item',
      qty: item.qty,
      priceEach: item.priceEach,
      notes: item.notes
    }))
  };
}

export async function listOrders(merchantId: string, params: { waiterId?: string; status?: OrderStatus | 'open'; limit?: number }) {
  const where: Record<string, unknown> = { restaurantId: merchantId };
  if (params.waiterId) {
    where.takenByUserId = params.waiterId;
  }
  if (params.status) {
    if (params.status === 'open') {
      where.status = { in: ['open', 'sent', 'in_progress'] };
    } else {
      where.status = params.status;
    }
  }
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: params.limit ?? 50,
    include: { items: { include: { menuItem: true } }, takenBy: true }
  });
  return orders.map(order => {
    const orderItems = order.items ?? [];
    const subtotal = orderItems.reduce((sum, item) => sum + item.priceEach * item.qty, 0);
    return {
      id: order.id,
      status: order.status,
      source: order.source,
      takenBy: order.takenBy ? { id: order.takenBy.id, name: order.takenBy.name, code: order.takenBy.code } : null,
      createdAt: order.createdAt,
      sentAt: order.sentAt,
      subtotal,
      items: orderItems.map(item => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem?.name ?? 'Unknown Item',
        qty: item.qty,
        priceEach: item.priceEach
      }))
    };
  });
}
