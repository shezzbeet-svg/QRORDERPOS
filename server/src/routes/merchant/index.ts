// @ts-nocheck
import { Router } from 'express';
import { loadMerchant } from '../../middleware/merchant.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import { menuRouter } from './menu.js';
import { ordersRouter } from './orders.js';
import { inventoryRouter } from './inventory.js';
import { devicesRouter } from './devices.js';
import { dashboardRouter } from './dashboard.js';

const router = Router({ mergeParams: true });

router.use(loadMerchant);

router.get('/meta', optionalAuth, (req, res) => {
  const merchant = req.merchant!;
  res.json({
    id: merchant.id,
    slug: merchant.slug,
    name: merchant.name,
    currency: merchant.currency,
    locale: merchant.locale,
    timezone: merchant.timezone,
    serviceFee: merchant.serviceFee,
    tipOptions: merchant.tipOptions
  });
});

router.use('/menu', menuRouter);

router.use(authenticate);
router.use('/orders', ordersRouter);
router.use('/inventory', inventoryRouter);
router.use('/', devicesRouter);
router.use('/dashboard', dashboardRouter);

export const merchantRouter = router;
