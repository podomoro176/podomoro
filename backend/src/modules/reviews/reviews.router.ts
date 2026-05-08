import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import * as controller from './reviews.controller';

const router = Router();

router.use(authenticate, requireRole('owner', 'partner', 'manager'));

router.get('/', controller.getReviews);
router.post('/', requireRole('owner', 'manager'), controller.createReview);

export default router;
