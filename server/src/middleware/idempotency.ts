// @ts-nocheck
import { prisma } from '../prisma.js';
import { asyncHandler } from './asyncHandler.js';

const METHODS_REQUIRING_IDEMPOTENCY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const enforceIdempotency = asyncHandler(async (req: any, res: any, next: any) => {
  if (!METHODS_REQUIRING_IDEMPOTENCY.has(req.method.toUpperCase())) {
    return next();
  }
  if (!req.merchant) {
    const err = new Error('Merchant context missing');
    (err as any).status = 500;
    throw err;
  }
  const clientUuid = req.get('x-client-uuid');
  const idempotencyKey = req.get('idempotency-key');
  if (!clientUuid || !idempotencyKey) {
    return res.status(400).json({ error: 'MissingClientHeaders', message: 'X-Client-UUID and Idempotency-Key headers are required' });
  }
  const path = `${req.baseUrl}${req.path}`;
  const method = req.method.toUpperCase();
  const existing = await prisma.idempotencyRecord.findUnique({
    where: {
      restaurantId_clientUuid_idempotencyKey_path_method: {
        restaurantId: req.merchant.id,
        clientUuid,
        idempotencyKey,
        path,
        method
      }
    }
  });
  if (existing) {
    return res.status(existing.statusCode).json(existing.response);
  }

  req.idempotencyContext = { clientUuid, idempotencyKey, path, method };
  const originalJson = res.json.bind(res);
  res.json = body => {
    const payload = JSON.parse(JSON.stringify(body)) as unknown;
    try {
      const persistence = prisma.idempotencyRecord.create({
        data: {
          restaurantId: req.merchant!.id,
          clientUuid,
          idempotencyKey,
          path,
          method,
          response: payload,
          statusCode: res.statusCode
        }
      });
      void Promise.resolve(persistence).catch(err => {
        console.error('Idempotency persistence failed', err);
      });
    } catch (err) {
      console.error('Idempotency persistence failed', err);
    }
    return originalJson(body);
  };
  next();
});
