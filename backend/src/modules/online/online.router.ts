import { Router } from 'express';
import express from 'express';
import * as controller from './online.controller';

const router = Router();

// Public routes
router.get('/menu', controller.getMenu);
router.post('/cart', controller.validateCart);
router.post('/checkout', controller.checkout);
router.get('/orders/:id/status', controller.getOrderStatus);
router.post('/reservations', controller.createReservation);

export default router;

// Stripe webhook router — must use raw body, mounted separately in app.ts
export const stripeWebhookRouter = Router();
stripeWebhookRouter.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  controller.stripeWebhook,
);
