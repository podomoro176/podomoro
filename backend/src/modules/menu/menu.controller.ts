import { Request, Response, NextFunction } from 'express';
import { createMenuItemSchema, updateMenuItemSchema, menuQuerySchema } from './menu.schema';
import * as service from './menu.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = menuQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const result = await service.listMenuItems(parsed.data);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.getMenuItem(req.params.id as string);
    if (!item) return res.status(404).json({ success: false, error: 'Menu item not found' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createMenuItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const item = await service.createMenuItem(parsed.data);
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateMenuItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const item = await service.updateMenuItem(req.params.id as string, parsed.data);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await service.deactivateMenuItem(req.params.id as string);
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
}
