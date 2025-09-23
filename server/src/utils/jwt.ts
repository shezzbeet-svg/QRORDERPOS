// @ts-nocheck
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { UserRole } from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS || '7');

export const accessTokenTtl = ACCESS_TOKEN_TTL;
export const refreshTokenTtlDays = REFRESH_TOKEN_TTL_DAYS;

export interface AccessTokenPayload {
  sub: string;
  restaurantId: string;
  role: UserRole;
  exp?: number;
}

function parseDuration(value: string): number {
  const match = String(value).trim().match(/^(\d+)(ms|s|m|h|d)?$/i);
  if (!match) {
    return 15 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return amount * 1000;
  }
}

function sign(data: string) {
  return createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
}

export function signAccessToken(payload: AccessTokenPayload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const ttl = parseDuration(ACCESS_TOKEN_TTL);
  const exp = Math.floor((Date.now() + ttl) / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = sign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  if (!token) {
    throw new Error('Invalid token');
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }
  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`);
  const actual = Buffer.from(signature, 'base64url');
  const expectedBuf = Buffer.from(expected, 'base64url');
  if (actual.length !== expectedBuf.length || !timingSafeEqual(actual, expectedBuf)) {
    throw new Error('Invalid token');
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AccessTokenPayload;
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    throw new Error('Token expired');
  }
  return payload;
}

export function generateRefreshTokenString() {
  return randomBytes(48).toString('base64url');
}

export function refreshTokenExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
