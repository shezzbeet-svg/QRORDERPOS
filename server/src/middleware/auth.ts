// @ts-nocheck
import { prisma } from '../prisma.js';
import type { UserRole } from '../prisma.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { asyncHandler } from './asyncHandler.js';

async function attachUserFromToken(req: any) {
  const header = req.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    const err = new Error('Unauthorized');
    (err as any).status = 401;
    throw err;
  }
  const token = header.slice('Bearer '.length);
  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    const err = new Error('User not found');
    (err as any).status = 401;
    throw err;
  }
  if (req.merchant && user.restaurantId !== req.merchant.id) {
    const err = new Error('Forbidden');
    (err as any).status = 403;
    throw err;
  }
  req.user = user;
  req.auth = { userId: user.id, merchantId: user.restaurantId, role: payload.role };
}

export const authenticate = asyncHandler(async (req: any, _res: any, next: any) => {
  await attachUserFromToken(req);
  next();
});

export const optionalAuth = asyncHandler(async (req: any, _res: any, next: any) => {
  try {
    await attachUserFromToken(req);
  } catch {
    // ignore
  }
  next();
});

export const requireRoles = (...roles: UserRole[]) =>
  (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
