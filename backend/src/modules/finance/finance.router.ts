import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import * as controller from './finance.controller';

const router = Router();

router.use(authenticate, requireRole('owner', 'boekhouder'));

router.get('/dashboard', controller.getDashboard);
router.get('/transactions', controller.listTransactions);
router.get('/transactions/export', controller.exportTransactions);
router.get('/payroll', controller.getPayroll);
router.get('/payroll/export', controller.exportPayroll);
router.get('/waste', controller.getWasteFinance);
router.get('/cogs', controller.getCogs);
router.post('/periods', requireRole('owner'), controller.closePeriod);

export default router;
