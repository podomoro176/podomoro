import { Request, Response, NextFunction } from 'express';
import { checkoutSchema, reservationSchema } from './online.schema';
import * as service from './online.service';

export async function getMenu(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = req.query.branchId as string | undefined;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '50');
    res.json({ success: true, data: await service.getOnlineMenu(branchId, page, limit) });
  } catch (err) { next(err); }
}

export async function validateCart(req: Request, res: Response, next: NextFunction) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(422).json({ success: false, error: 'items must be an array' });
    const result = await service.validateCart(items);
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function checkout(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const result = await service.createCheckout(parsed.data);
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function stripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) return res.status(400).json({ success: false, error: 'Missing stripe-signature header' });
    const result = await service.handleStripeWebhook(req.body as Buffer, sig);
    res.json(result);
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function getOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await service.getOrderStatus(req.params.id as string);
    res.json({ success: true, data: order });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function createReservation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = reservationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const result = await service.createReservation(parsed.data);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}
