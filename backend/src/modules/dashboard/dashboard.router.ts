import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import * as controller from './dashboard.controller';

const router = Router();

router.use(authenticate, requireRole('owner', 'partner'));

router.get('/kpis', controller.getKpis);
router.get('/revenue', controller.getRevenueChart);
router.get('/alerts', controller.getAlerts);
router.get('/orders/recent', controller.getRecentOrders);

export default router;
