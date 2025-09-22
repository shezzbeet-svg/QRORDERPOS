import { createHash, timingSafeEqual } from 'node:crypto';

export function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

export function verifyPin(pin: string, hash: string): boolean {
  try {
    const computed = Buffer.from(hashPin(pin), 'hex');
    const expected = Buffer.from(hash, 'hex');
    if (computed.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}
