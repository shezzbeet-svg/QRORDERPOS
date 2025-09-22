// @ts-nocheck
import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../../prisma.js';
import { requireRoles } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { enforceIdempotency } from '../../middleware/idempotency.js';

const DEVICE_TYPE_VALUES = new Set(['kds', 'printer', 'display', 'tablet']);

const router = Router({ mergeParams: true });

function validationError(message: string) {
  const err = new Error(message);
  (err as any).status = 400;
  throw err;
}

function parseRegistration(body: any) {
  if (!body || typeof body !== 'object') {
    validationError('Invalid request body');
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const type = body.type != null ? String(body.type) : 'tablet';
  const location = body.location != null ? String(body.location) : undefined;
  if (!name) {
    validationError('name is required');
  }
  if (!DEVICE_TYPE_VALUES.has(type)) {
    validationError('Invalid device type');
  }
  return { name, type, location };
}

router.get(
  '/devices',
  requireRoles('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const devices = await prisma.device.findMany({
      where: { restaurantId: req.merchant!.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(
      devices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        location: device.location,
        pairingCode: device.pairingCode,
        lastSeenAt: device.lastSeenAt
      }))
    );
  })
);

router.post(
  '/devices',
  requireRoles('admin'),
  enforceIdempotency,
  asyncHandler(async (req, res) => {
    const body = parseRegistration(req.body);
    const prefix = body.type === 'printer' ? 'PR' : 'DV';
    const pairingCode = `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const device = await prisma.device.create({
      data: {
        restaurantId: req.merchant!.id,
        name: body.name,
        type: body.type,
        location: body.location,
        pairingCode
      }
    });
    res.json({
      id: device.id,
      name: device.name,
      type: device.type,
      location: device.location,
      pairingCode: device.pairingCode
    });
  })
);

router.post(
  '/printers/test',
  requireRoles('admin', 'cashier'),
  asyncHandler(async (_req, res) => {
    res.json({ ok: true, message: 'Test print dispatched' });
  })
);

export const devicesRouter = router;
