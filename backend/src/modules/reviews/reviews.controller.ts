import { Request, Response, NextFunction } from 'express';
import { createReviewSchema } from './reviews.schema';
import * as service from './reviews.service';

export async function getReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = req.query.branchId as string | undefined;
    res.json({ success: true, data: await service.getReviews(branchId) });
  } catch (err) { next(err); }
}

export async function createReview(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const review = await service.createReview(parsed.data);
    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
}
