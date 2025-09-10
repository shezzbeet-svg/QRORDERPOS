import { Router } from 'express';
import { z } from 'zod';
import { io } from '../ws';

const router = Router();

const startSchema = z.object({ tableId: z.string(), pax: z.number().int() });
router.post('/', (req, res) => {
  const data = startSchema.parse(req.body);
  // demo: return session id
  res.json({ id: `sess-${data.tableId}` });
});

router.post('/:id/call-waiter', (req, res) => {
  const schema = z.object({ reason: z.string() });
  const { reason } = schema.parse(req.body);
  io.emit('call_waiter:created', { sessionId: req.params.id, reason });
  res.json({ ok: true });
});

export default router;
