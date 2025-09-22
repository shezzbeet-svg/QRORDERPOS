// @ts-nocheck
import type { StockAdjustmentSource, StockCountStatus } from '../prisma.js';
import type { StockAdjustment } from '../data/types.js';
import { prisma } from '../prisma.js';

export async function applyManualAdjustment(params: {
  merchantId: string;
  userId?: string;
  inventoryItemId: string;
  delta: number;
  reason?: string;
}) {
  const item = await prisma.inventoryItem.findFirst({
    where: { id: params.inventoryItemId, restaurantId: params.merchantId }
  });
  if (!item) {
    const err = new Error('Inventory item not found');
    (err as any).status = 404;
    throw err;
  }
  const newStock = item.currentStock + params.delta;
  const adjustment = await prisma.$transaction(async tx => {
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: newStock }
    });
    return tx.stockAdjustment.create({
      data: {
        restaurantId: params.merchantId,
        inventoryItemId: item.id,
        userId: params.userId,
        delta: params.delta,
        reason: params.reason || 'Manual adjustment',
        source: 'manual' as StockAdjustmentSource,
        metadata: undefined
      }
    });
  });
  const updatedItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
  return { adjustment, item: updatedItem! };
}

interface StockCountEntryInput {
  inventoryItemId: string;
  counted: number;
}

export async function recordStockCount(params: {
  merchantId: string;
  userId?: string;
  entries: StockCountEntryInput[];
}) {
  if (!params.entries.length) {
    const err = new Error('Stock count requires entries');
    (err as any).status = 400;
    throw err;
  }
  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: params.entries.map(e => e.inventoryItemId) }, restaurantId: params.merchantId }
  });
  const itemMap = new Map(items.map(item => [item.id, item]));
  for (const entry of params.entries) {
    if (!itemMap.has(entry.inventoryItemId)) {
      const err = new Error(`Inventory item ${entry.inventoryItemId} not found`);
      (err as any).status = 400;
      throw err;
    }
  }
  const count = await prisma.$transaction(async tx => {
    const stockCount = await tx.stockCount.create({
      data: {
        restaurantId: params.merchantId,
        userId: params.userId,
        status: 'completed' as StockCountStatus
      }
    });
    const adjustments: Array<Omit<StockAdjustment, 'id' | 'createdAt'>> = [];
    for (const entry of params.entries) {
      const item = itemMap.get(entry.inventoryItemId)!;
      const variance = entry.counted - item.currentStock;
      await tx.stockCountEntry.create({
        data: {
          stockCountId: stockCount.id,
          inventoryItemId: item.id,
          expected: item.currentStock,
          counted: entry.counted,
          variance
        }
      });
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: entry.counted }
      });
      if (variance !== 0) {
        adjustments.push({
          restaurantId: params.merchantId,
          inventoryItemId: item.id,
          userId: params.userId,
          delta: variance,
          reason: `Stock count variance (${stockCount.id})`,
          source: 'count' as StockAdjustmentSource,
          metadata: { stockCountId: stockCount.id }
        });
      }
    }
    if (adjustments.length) {
      await tx.stockAdjustment.createMany({ data: adjustments });
    }
    return stockCount;
  });

  const entries = await prisma.stockCountEntry.findMany({
    where: { stockCountId: count.id },
    include: { inventoryItem: true }
  });
  const varianceTotal = entries.reduce((sum, entry) => sum + entry.variance, 0);
  return {
    id: count.id,
    varianceTotal,
    entries: entries.map(entry => {
      const inventoryItem = entry.inventoryItem ?? { name: 'Unknown Item', unit: '' };
      return {
        id: entry.id,
        inventoryItemId: entry.inventoryItemId,
        name: inventoryItem.name,
        expected: entry.expected,
        counted: entry.counted,
        variance: entry.variance,
        unit: inventoryItem.unit
      };
    })
  };
}
