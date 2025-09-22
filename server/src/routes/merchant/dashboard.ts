// @ts-nocheck
import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { requireRoles } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

function startOfToday(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfToday(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

const router = Router({ mergeParams: true });

router.get(
  '/dashboard/summary',
  requireRoles('admin', 'cashier'),
  asyncHandler(async (req, res) => {
    const merchantId = req.merchant!.id;
    const now = new Date();
    const start = startOfToday(now);
    const end = endOfToday(now);
    const [openOrders, paymentsAggregate, lowStockItems] = await Promise.all([
      prisma.order.count({
        where: {
          restaurantId: merchantId,
          status: { in: ['open', 'sent', 'in_progress'] }
        }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true, tipAmount: true },
        _count: true,
        where: {
          restaurantId: merchantId,
          status: 'captured',
          paidAt: { gte: start, lte: end }
        }
      }),
      prisma.inventoryItem.findMany({
        where: {
          restaurantId: merchantId,
          isActive: true,
          parLevel: { not: null }
        },
        orderBy: { name: 'asc' }
      })
    ]);

    const lowStock = lowStockItems.filter(item => item.parLevel !== null && item.currentStock < (item.parLevel ?? 0));
    const paymentsSum = paymentsAggregate._sum.amount ?? 0;
    const tipSum = paymentsAggregate._sum.tipAmount ?? 0;

    res.json({
      openOrders,
      payments: {
        count: paymentsAggregate._count,
        amount: Number(paymentsSum.toFixed(2)),
        tips: Number(tipSum.toFixed(2))
      },
      lowStock: lowStock.map(item => ({
        id: item.id,
        name: item.name,
        unit: item.unit,
        stock: item.currentStock,
        parLevel: item.parLevel
      }))
    });
  })
);

export const dashboardRouter = router;
