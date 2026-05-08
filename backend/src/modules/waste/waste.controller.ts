import { Request, Response, NextFunction } from 'express';
import { logWasteSchema, updateCostSchema } from './waste.schema';
import * as service from './waste.service';

export async function createEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = logWasteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const entry = await service.logWaste(parsed.data, req.user!.id);
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
}

export async function updateCost(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateCostSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const entry = await service.updateCostPrice(req.params.id as string, parsed.data);
    res.json({ success: true, data: entry });
  } catch (err) { next(err); }
}

export async function listEntries(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId!;
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const date = req.query.date as string | undefined;
    res.json({ success: true, data: await service.listWaste(branchId, page, limit, date) });
  } catch (err) { next(err); }
}

export async function getTotals(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId!;
    const period = (req.query.period as string) || 'day';
    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(422).json({ success: false, error: 'period must be day, week, or month' });
    }
    res.json({ success: true, data: await service.getWasteTotals(branchId, period as 'day' | 'week' | 'month') });
  } catch (err) { next(err); }
}
