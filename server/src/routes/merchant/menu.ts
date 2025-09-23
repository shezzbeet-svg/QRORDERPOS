// @ts-nocheck
import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

const router = Router({ mergeParams: true });

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const merchantId = req.merchant!.id;
    const items = await prisma.menuItem.findMany({
      where: { restaurantId: merchantId, active: true },
      include: { category: true },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { name: 'asc' }
      ]
    });
    res.json(
      items.map(item => ({
        id: item.id,
        categoryId: item.categoryId,
        categoryName: item.category?.name ?? '',
        name: item.name,
        description: item.description,
        price: item.price,
        photoUrl: item.photoUrl,
        tags: item.tags,
        allergens: item.allergens,
        active: item.active
      }))
    );
  })
);

router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const merchantId = req.merchant!.id;
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId: merchantId, visible: true },
      orderBy: { sortOrder: 'asc' },
      include: { items: { where: { active: true } } }
    });
    res.json(
      categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
        items: (cat.items ?? []).map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          description: item.description,
          tags: item.tags,
          allergens: item.allergens
        }))
      }))
    );
  })
);

export const menuRouter = router;
