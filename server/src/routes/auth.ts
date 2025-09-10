import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({ pin: z.string() });
router.post('/login', (req, res) => {
  const { pin } = loginSchema.parse(req.body);
  if (pin === '1234') {
    res.json({ token: 'demo-token', user: { id: 'u1', role: 'admin' } });
  } else {
    res.status(401).json({ error: 'Invalid PIN' });
  }
});

router.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

router.get('/me', (_req, res) => {
  res.json({ id: 'u1', role: 'admin' });
});

export default router;
