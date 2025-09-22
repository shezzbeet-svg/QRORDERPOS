// @ts-nocheck
import { Router } from 'express';
import { requireRoles } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { enforceIdempotency } from '../../middleware/idempotency.js';
import { createOrder, listOrders } from '../../services/orderService.js';
import type { OrderSource, OrderStatus } from '../../prisma.js';

const ORDER_STATUS_VALUES = new Set(['open', 'sent', 'in_progress', 'ready', 'served', 'void']);
const ORDER_SOURCE_VALUES = new Set(['customer', 'waiter', 'kiosk']);

const router = Router({ mergeParams: true });

function validationError(message: string) {
  const err = new Error(message);
  (err as any).status = 400;
  throw err;
}

function parseListQuery(query: any) {
  const result: { waiterId?: string; status?: OrderStatus | 'open'; limit?: number } = {};
  if (query.waiterId) {
    result.waiterId = String(query.waiterId);
  }
  if (query.status) {
    const status = String(query.status);
    if (status !== 'open' && !ORDER_STATUS_VALUES.has(status)) {
      validationError('Invalid status filter');
    }
    result.status = status as OrderStatus | 'open';
  }
  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
      validationError('limit must be between 1 and 200');
    }
    result.limit = Math.floor(limit);
  }
  return result;
}

function parseOrderItems(items: any) {
  if (!Array.isArray(items) || items.length === 0) {
    validationError('items must be a non-empty array');
  }
  return items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      validationError(`items[${index}] must be an object`);
    }
    const menuItemId = typeof item.menuItemId === 'string' ? item.menuItemId.trim() : '';
    const qty = Number(item.qty);
    const notes = item.notes != null ? String(item.notes) : undefined;
    if (!menuItemId) {
      validationError(`items[${index}].menuItemId is required`);
    }
    if (!Number.isInteger(qty) || qty < 1) {
      validationError(`items[${index}].qty must be a positive integer`);
    }
    return { menuItemId, qty, notes };
  });
}

function parseCreateBody(body: any) {
  if (!body || typeof body !== 'object') {
    validationError('Invalid request body');
  }
  const items = parseOrderItems(body.items);
  const sessionId = body.sessionId != null ? String(body.sessionId) : undefined;
  let source: OrderSource | undefined;
  if (body.source != null) {
    const raw = String(body.source);
    if (!ORDER_SOURCE_VALUES.has(raw)) {
      validationError('Invalid order source');
    }
    source = raw as OrderSource;
  }
  return { items, sessionId, source };
}

router.get(
  '/',
  requireRoles('admin', 'cashier', 'waiter'),
  asyncHandler(async (req, res) => {
    const params = parseListQuery(req.query);
    const orders = await listOrders(req.merchant!.id, params);
    res.json(orders);
  })
);

router.post(
  '/',
  requireRoles('admin', 'cashier', 'waiter'),
  enforceIdempotency,
  asyncHandler(async (req, res) => {
    if (!req.idempotencyContext) {
      const err = new Error('Idempotency context missing');
      (err as any).status = 500;
      throw err;
    }
    const body = parseCreateBody(req.body);
    const result = await createOrder({
      merchantId: req.merchant!.id,
      userId: req.user?.id,
      sessionId: body.sessionId,
      source: (body.source ?? 'waiter') as OrderSource,
      items: body.items,
      clientUuid: req.idempotencyContext.clientUuid,
      idempotencyKey: req.idempotencyContext.idempotencyKey,
      serviceFeeRate: req.merchant!.serviceFee
    });
    res.json(result);
  })
);

export const ordersRouter = router;
