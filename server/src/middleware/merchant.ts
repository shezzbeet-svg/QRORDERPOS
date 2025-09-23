import { asyncHandler } from './asyncHandler.js';
import { prisma } from '../prisma.js';

export const loadMerchant = asyncHandler(async (req: any, res: any, next: any) => {
  const slug = req.params.merchantSlug;
  if (!slug) {
    return res.status(400).json({ error: 'Merchant slug missing' });
  }
  const merchant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!merchant) {
    return res.status(404).json({ error: 'Merchant not found' });
  }
  req.merchant = merchant;
  next();
});
