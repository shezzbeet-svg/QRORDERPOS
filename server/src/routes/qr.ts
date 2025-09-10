import { Router } from 'express';
import { prisma } from '../prisma';
import QR from 'qrcode';

const router = Router();

router.get('/qr-cards', async (_req, res) => {
  const codes = await prisma.qRCode.findMany({ include: { table: true } });
  let html = '<html><body style="font-family:sans-serif">';
  for (const c of codes) {
    const url = `http://localhost:5173/q/${c.slug}`;
    const data = await QR.toDataURL(url);
    html += `<div style="display:inline-block;margin:16px;text-align:center;">
      <img src="${data}" alt="QR" />
      <div>Table ${c.table.number}</div>
    </div>`;
  }
  html += '</body></html>';
  res.send(html);
});

export default router;
