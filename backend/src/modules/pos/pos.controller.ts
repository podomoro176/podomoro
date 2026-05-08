import { Request, Response, NextFunction } from 'express';
import {
  createOrderSchema, updateOrderSchema, paymentSchema,
  discountSchema, allergenConfirmSchema, updateTableSchema, menuSearchSchema,
} from './pos.schema';
import * as service from './pos.service';

export async function searchMenu(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = menuSearchSchema.safeParse(req.query);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.json({ success: true, data: await service.searchMenu(parsed.data) });
  } catch (err) { next(err); }
}

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const order = await service.createOrder(parsed.data, req.user!.id);
    res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
}

export async function updateOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const order = await service.updateOrder(req.params.id as string, parsed.data, req.user!.id);
    res.json({ success: true, data: order });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function processPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const result = await service.processPayment(req.params.id as string, parsed.data, req.user!.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function applyDiscount(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = discountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const order = await service.applyDiscount(req.params.id as string, parsed.data);
    res.json({ success: true, data: order });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function getAllergens(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.getAllergens(req.params.menuItemId as string);
    res.json({ success: true, data: item });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function confirmAllergens(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = allergenConfirmSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const log = await service.confirmAllergens(parsed.data, req.user!.id);
    res.status(201).json({ success: true, data: log });
  } catch (err) { next(err); }
}

export async function getTables(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId;
    if (!branchId) return res.status(422).json({ success: false, error: 'branchId required' });
    res.json({ success: true, data: await service.getTables(branchId) });
  } catch (err) { next(err); }
}

export async function updateTable(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateTableSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const table = await service.updateTable(req.params.id as string, parsed.data);
    res.json({ success: true, data: table });
  } catch (err) { next(err); }
}
