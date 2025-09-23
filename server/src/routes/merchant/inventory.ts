// @ts-nocheck
import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { requireRoles } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { enforceIdempotency } from '../../middleware/idempotency.js';
import { applyManualAdjustment, recordStockCount } from '../../services/inventoryService.js';

const router = Router({ mergeParams: true });

function validationError(message: string) {
  const err = new Error(message);
  (err as any).status = 400;
  throw err;
}

function parseAdjustment(body: any) {
  if (!body || typeof body !== 'object') {
    validationError('Invalid request body');
  }
  const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
  const delta = Number(body.delta);
  const reason = body.reason != null ? String(body.reason) : undefined;
  if (!itemId) {
    validationError('itemId is required');
  }
  if (!Number.isFinite(delta)) {
    validationError('delta must be a number');
  }
  return { itemId, delta, reason };
}

function parseStockCount(body: any) {
  if (!body || typeof body !== 'object') {
    validationError('Invalid request body');
  }
  const entriesInput = body.entries;
  if (!Array.isArray(entriesInput) || !entriesInput.length) {
    validationError('entries must be a non-empty array');
  }
  const entries = entriesInput.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      validationError(`entries[${index}] must be an object`);
    }
    const itemId = typeof entry.itemId === 'string' ? entry.itemId.trim() : '';
    const counted = Number(entry.counted);
    if (!itemId) {
      validationError(`entries[${index}].itemId is required`);
    }
    if (!Number.isFinite(counted)) {
      validationError(`entries[${index}].counted must be a number`);
    }
    return { itemId, counted };
  });
  return { entries };
}

router.get(
  '/items/stock',
  requireRoles('admin', 'cashier'),
  asyncHandler(async (req, res) => {
    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId: req.merchant!.id, isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(
      items.map(item => ({
        id: item.id,
        name: item.name,
        stock: item.currentStock,
        unit: item.unit,
        parLevel: item.parLevel,
        isLow: typeof item.parLevel === 'number' ? item.currentStock < item.parLevel : false
      }))
    );
  })
);

router.post(
  '/stock-adjustments',
  requireRoles('admin', 'cashier'),
  enforceIdempotency,
  asyncHandler(async (req, res) => {
    const body = parseAdjustment(req.body);
    const result = await applyManualAdjustment({
      merchantId: req.merchant!.id,
      userId: req.user!.id,
      inventoryItemId: body.itemId,
      delta: body.delta,
      reason: body.reason
    });
    res.json({
      adjustmentId: result.adjustment.id,
      item: {
        id: result.item.id,
        name: result.item.name,
        stock: result.item.currentStock,
        unit: result.item.unit,
        parLevel: result.item.parLevel
      }
    });
  })
);

router.get(
  '/alerts/low-stock',
  requireRoles('admin', 'cashier', 'manager'),
  asyncHandler(async (req, res) => {
    const items = await prisma.inventoryItem.findMany({
      where: {
        restaurantId: req.merchant!.id,
        isActive: true,
        parLevel: { not: null }
      },
      orderBy: { name: 'asc' }
    });
    res.json(
      items
        .filter(item => item.parLevel !== null && item.currentStock < (item.parLevel ?? 0))
        .map(item => ({
          id: item.id,
          name: item.name,
          stock: item.currentStock,
          parLevel: item.parLevel,
          unit: item.unit
        }))
    );
  })
);

router.post(
  '/stock-counts',
  requireRoles('admin', 'cashier'),
  enforceIdempotency,
  asyncHandler(async (req, res) => {
    const body = parseStockCount(req.body);
    const result = await recordStockCount({
      merchantId: req.merchant!.id,
      userId: req.user!.id,
      entries: body.entries.map(e => ({ inventoryItemId: e.itemId, counted: e.counted }))
    });
    res.json(result);
  })
);

export const inventoryRouter = router;
