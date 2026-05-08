import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import * as controller from './waste.controller';

const router = Router();

router.use(authenticate);

router.post('/', requireRole('staff', 'manager', 'owner'), controller.createEntry);
router.put('/:id/cost', requireRole('manager', 'owner'), controller.updateCost);
router.get('/', requireRole('manager', 'owner', 'boekhouder'), controller.listEntries);
router.get('/totals', requireRole('manager', 'owner', 'boekhouder'), controller.getTotals);

export default router;
