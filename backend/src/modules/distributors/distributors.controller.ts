import { Request, Response, NextFunction } from 'express';
import {
  createSupplierSchema, createProductSchema, createOrderSchema,
  receiveOrderSchema, updateStockSchema,
} from './distributors.schema';
import * as service from './distributors.service';

export async function listSuppliers(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId!;
    res.json({ success: true, data: await service.listSuppliers(branchId) });
  } catch (err) { next(err); }
}

export async function createSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createSupplierSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.status(201).json({ success: true, data: await service.createSupplier(parsed.data) });
  } catch (err) { next(err); }
}

export async function updateSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.updateSupplier(req.params.id as string, req.body) });
  } catch (err) { next(err); }
}

export async function deleteSupplier(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteSupplier(req.params.id as string);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.status(201).json({ success: true, data: await service.createProduct(parsed.data) });
  } catch (err) { next(err); }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.updateProduct(req.params.id as string, req.body) });
  } catch (err) { next(err); }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteProduct(req.params.id as string);
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
}

export async function getChecklist(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId!;
    res.json({ success: true, data: await service.getOrderChecklist(req.params.supplierId as string, branchId) });
  } catch (err) { next(err); }
}

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.status(201).json({ success: true, data: await service.createOrder(parsed.data, req.user!.id) });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function submitOrder(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.submitOrder(req.params.id as string) });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function receiveOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = receiveOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.json({ success: true, data: await service.receiveOrder(req.params.id as string, parsed.data) });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId!;
    const supplierId = req.query.supplierId as string | undefined;
    res.json({ success: true, data: await service.listOrders(branchId, supplierId) });
  } catch (err) { next(err); }
}

export async function updateStock(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateStockSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.json({ success: true, data: await service.updateStock(req.params.id as string, parsed.data) });
  } catch (err) { next(err); }
}
