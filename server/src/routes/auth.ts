// @ts-nocheck
import { Router } from 'express';
import { prisma } from '../prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import {
  accessTokenTtl,
  generateRefreshTokenString,
  refreshTokenExpiry,
  refreshTokenTtlDays,
  signAccessToken
} from '../utils/jwt.js';
import { verifyPin } from '../utils/pin.js';

const router = Router();

function validationError(message: string) {
  const err = new Error(message);
  (err as any).status = 400;
  throw err;
}

function parseLogin(body: any) {
  if (!body || typeof body !== 'object') {
    validationError('Invalid request body');
  }
  const merchantSlug = typeof body.merchantSlug === 'string' ? body.merchantSlug.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
  const deviceId = body.deviceId != null ? String(body.deviceId) : undefined;
  if (!merchantSlug) validationError('merchantSlug is required');
  if (!code) validationError('code is required');
  if (pin.length < 4) validationError('pin must be at least 4 digits');
  return { merchantSlug, code, pin, deviceId };
}

function parseRefresh(body: any) {
  if (!body || typeof body !== 'object') {
    validationError('Invalid request body');
  }
  const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken.trim() : '';
  const deviceId = body.deviceId != null ? String(body.deviceId) : undefined;
  if (!refreshToken) validationError('refreshToken is required');
  return { refreshToken, deviceId };
}

function parseLogout(body: any) {
  if (!body || typeof body !== 'object') {
    return {};
  }
  const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken.trim() : undefined;
  return { refreshToken: refreshToken && refreshToken.length ? refreshToken : undefined };
}

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = parseLogin(req.body);
    const merchant = await prisma.restaurant.findUnique({ where: { slug: body.merchantSlug } });
    if (!merchant) {
      return res.status(401).json({ error: 'InvalidCredentials' });
    }
    const user = await prisma.user.findFirst({ where: { restaurantId: merchant.id, code: body.code } });
    if (!user) {
      return res.status(401).json({ error: 'InvalidCredentials' });
    }
    const validPin = verifyPin(body.pin, user.pinHash);
    if (!validPin) {
      return res.status(401).json({ error: 'InvalidCredentials' });
    }
    const accessToken = signAccessToken({ sub: user.id, restaurantId: merchant.id, role: user.role });
    const refreshTokenValue = generateRefreshTokenString();
    const expiresAt = refreshTokenExpiry();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt,
        deviceId: body.deviceId
      }
    });
    res.json({
      merchant: {
        id: merchant.id,
        slug: merchant.slug,
        name: merchant.name,
        currency: merchant.currency,
        locale: merchant.locale,
        timezone: merchant.timezone
      },
      user: {
        id: user.id,
        code: user.code,
        name: user.name,
        role: user.role.toLowerCase()
      },
      tokens: {
        accessToken,
        accessTokenExpiresIn: accessTokenTtl,
        refreshToken: refreshTokenValue,
        refreshTokenExpiresAt: expiresAt.toISOString(),
        refreshTokenTtlDays: refreshTokenTtlDays
      }
    });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const body = parseRefresh(req.body);
    const tokenRecord = await prisma.refreshToken.findUnique({ where: { token: body.refreshToken } });
    if (!tokenRecord) {
      return res.status(401).json({ error: 'InvalidRefreshToken' });
    }
    const expiresAt = new Date(tokenRecord.expiresAt);
    const revokedAt = tokenRecord.revokedAt ? new Date(tokenRecord.revokedAt) : null;
    if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date() || (revokedAt && revokedAt <= new Date())) {
      return res.status(401).json({ error: 'InvalidRefreshToken' });
    }
    if (tokenRecord.deviceId && body.deviceId && tokenRecord.deviceId !== body.deviceId) {
      return res.status(401).json({ error: 'InvalidRefreshToken' });
    }
    const user = await prisma.user.findUnique({ where: { id: tokenRecord.userId } });
    if (!user) {
      return res.status(401).json({ error: 'InvalidRefreshToken' });
    }
    const merchant = await prisma.restaurant.findUnique({ where: { id: user.restaurantId } });
    if (!merchant) {
      return res.status(401).json({ error: 'InvalidRefreshToken' });
    }
    const newAccessToken = signAccessToken({ sub: user.id, restaurantId: merchant.id, role: user.role });
    const newRefreshToken = generateRefreshTokenString();
    const newExpiry = refreshTokenExpiry();
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        token: newRefreshToken,
        expiresAt: newExpiry,
        revokedAt: null,
        deviceId: body.deviceId ?? tokenRecord.deviceId
      }
    });
    res.json({
      merchant: {
        id: merchant.id,
        slug: merchant.slug,
        name: merchant.name,
        currency: merchant.currency,
        locale: merchant.locale,
        timezone: merchant.timezone
      },
      user: {
        id: user.id,
        code: user.code,
        name: user.name,
        role: user.role.toLowerCase()
      },
      tokens: {
        accessToken: newAccessToken,
        accessTokenExpiresIn: accessTokenTtl,
        refreshToken: newRefreshToken,
        refreshTokenExpiresAt: newExpiry.toISOString(),
        refreshTokenTtlDays: refreshTokenTtlDays
      }
    });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const body = parseLogout(req.body);
    if (body.refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: body.refreshToken },
        data: { revokedAt: new Date() }
      });
    }
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const merchant = await prisma.restaurant.findUnique({ where: { id: user.restaurantId } });
    res.json({
      merchant: merchant && {
        id: merchant.id,
        slug: merchant.slug,
        name: merchant.name,
        currency: merchant.currency,
        locale: merchant.locale,
        timezone: merchant.timezone
      },
      user: {
        id: user.id,
        code: user.code,
        name: user.name,
        role: user.role.toLowerCase()
      }
    });
  })
);

export const authRouter = router;
