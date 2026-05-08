import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { requireBranch } from '../../middleware/requireBranch';
import * as controller from './pos.controller';
import * as service from './pos.service';

const router = Router();

router.use(authenticate, requireRole('cashier', 'manager', 'owner'), requireBranch);

router.get('/menu', controller.searchMenu);

router.get('/orders', async (req, res, next) => {
  const branchId = (req.query.branchId as string) || req.user!.branchId!;
  const page = parseInt(req.query.page as string || '1');
  const limit = parseInt(req.query.limit as string || '20');
  try {
    res.json({ success: true, data: await service.listOrders(branchId, page, limit) });
  } catch (err) { next(err); }
});

router.post('/orders', controller.createOrder);
router.put('/orders/:id', controller.updateOrder);
router.post('/orders/:id/payment', controller.processPayment);
router.post('/orders/:id/discount', requireRole('manager', 'owner'), controller.applyDiscount);

router.get('/allergens/:menuItemId', controller.getAllergens);
router.post('/allergens/confirm', controller.confirmAllergens);

router.get('/tables', controller.getTables);
router.put('/tables/:id', controller.updateTable);

export default router;
