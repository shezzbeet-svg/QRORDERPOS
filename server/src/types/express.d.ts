import type { Restaurant, User, UserRole } from '../data/types.js';

declare global {
  namespace Express {
    interface Request {
      merchant?: Restaurant;
      user?: User;
      auth?: { userId: string; merchantId: string; role: UserRole };
      idempotencyContext?: {
        clientUuid: string;
        idempotencyKey: string;
        path: string;
        method: string;
      };
    }
  }
}

export {};
