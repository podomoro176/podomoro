import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { requireBranch } from '../../middleware/requireBranch';
import * as controller from './distributors.controller';

const router = Router();
router.use(authenticate, requireBranch);

const staffOrManager = requireRole('staff', 'manager', 'owner');
const managerOnly = requireRole('manager', 'owner');

// Suppliers
router.get('/suppliers', staffOrManager, controller.listSuppliers);
router.post('/suppliers', managerOnly, controller.createSupplier);
router.put('/suppliers/:id', managerOnly, controller.updateSupplier);
router.delete('/suppliers/:id', managerOnly, controller.deleteSupplier);

// Products
router.post('/products', managerOnly, controller.createProduct);
router.put('/products/:id', managerOnly, controller.updateProduct);
router.delete('/products/:id', managerOnly, controller.deleteProduct);

// Orders
router.get('/orders/checklist/:supplierId', staffOrManager, controller.getChecklist);
router.get('/orders', staffOrManager, controller.listOrders);
router.post('/orders', staffOrManager, controller.createOrder);
router.put('/orders/:id/submit', staffOrManager, controller.submitOrder);
router.put('/orders/:id/receive', staffOrManager, controller.receiveOrder);

export default router;
