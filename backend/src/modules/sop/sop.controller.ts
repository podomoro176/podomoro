import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createDocumentSchema, createVideoSchema, createRecipeSchema, scaleQuerySchema } from './sop.schema';
import * as service from './sop.service';

const ALLOWED_MIME_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export async function listDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId!;
    res.json({ success: true, data: await service.listDocuments(branchId) });
  } catch (err) { next(err); }
}

export async function uploadDocument(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(422).json({ success: false, error: 'File required' });
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(422).json({ success: false, error: 'Only PDF and DOCX files are allowed' });
    }

    const parsed = createDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

    const doc = await service.createDocument(
      { ...parsed.data, filePath: req.file.path, fileType: req.file.mimetype },
      req.user!.id,
    );
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
}

export async function completeDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.completeDocument(req.params.id as string, req.user!.id);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function listVideos(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId!;
    res.json({ success: true, data: await service.listVideos(branchId) });
  } catch (err) { next(err); }
}

export async function createVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createVideoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.status(201).json({ success: true, data: await service.createVideo(parsed.data, req.user!.id) });
  } catch (err) { next(err); }
}

export async function completeVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.completeVideo(req.params.id as string, req.user!.id);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}

export async function listRecipes(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = (req.query.branchId as string) || req.user!.branchId!;
    res.json({ success: true, data: await service.listRecipes(branchId) });
  } catch (err) { next(err); }
}

export async function createRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createRecipeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.status(201).json({ success: true, data: await service.createRecipe(parsed.data, req.user!.id) });
  } catch (err) { next(err); }
}

export async function scaleRecipe(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = scaleQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const result = await service.getScaledRecipe(req.params.id as string, parsed.data.portions);
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    next(err);
  }
}
