import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import * as controller from './menu.controller';

const router = Router();

// Public endpoints — no auth required
router.get('/', controller.list);
router.get('/:id', controller.getOne);

// Manager / owner only
router.post('/', authenticate, requireRole('manager', 'owner'), controller.create);
router.put('/:id', authenticate, requireRole('manager', 'owner'), controller.update);
router.delete('/:id', authenticate, requireRole('manager', 'owner'), controller.deactivate);

export default router;
