import { Request, Response, NextFunction } from 'express';
import * as service from './dashboard.service';

export async function getKpis(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getKpis() });
  } catch (err) { next(err); }
}

export async function getRevenueChart(req: Request, res: Response, next: NextFunction) {
  try {
    const days = Math.min(parseInt(req.query.days as string || '7'), 90);
    res.json({ success: true, data: await service.getRevenueChart(days) });
  } catch (err) { next(err); }
}

export async function getAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getAlerts() });
  } catch (err) { next(err); }
}

export async function getRecentOrders(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await service.getRecentOrders() });
  } catch (err) { next(err); }
}
