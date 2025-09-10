import { Router } from 'express';
import { menuItemSchema } from '@qrorderpos/types';

const router = Router();

router.get('/', async (_req, res) => {
  // demo items
  const items = [
    menuItemSchema.parse({
      id: 'item1',
      categoryId: 'cat1',
      name: 'Burger',
      price: 500,
      tags: [],
      allergens: [],
      active: true
    })
  ];
  res.json(items);
});

export default router;
