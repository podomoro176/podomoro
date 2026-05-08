import { Request, Response, NextFunction } from 'express';
import { createBranchSchema, updateBranchSchema } from './branches.schema';
import * as service from './branches.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const branches = await service.listBranches();
    res.json({ success: true, data: branches });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await service.getBranch(req.params.id as string);
    if (!branch) return res.status(404).json({ success: false, error: 'Branch not found' });
    res.json({ success: true, data: branch });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createBranchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const branch = await service.createBranch(parsed.data);
    res.status(201).json({ success: true, data: branch });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateBranchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const branch = await service.updateBranch(req.params.id as string, parsed.data);
    res.json({ success: true, data: branch });
  } catch (err) { next(err); }
}

export async function deactivate(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await service.deactivateBranch(req.params.id as string);
    res.json({ success: true, data: branch });
  } catch (err) { next(err); }
}
