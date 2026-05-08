import { Request, Response, NextFunction } from 'express';
import { loginSchema, refreshSchema } from './auth.schema';
import * as service from './auth.service';

function auditCtx(req: Request) {
  return {
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

    const result = await service.login(parsed.data.email, parsed.data.password, auditCtx(req));

    if ('error' in result) return res.status(result.status as number).json({ success: false, error: result.error });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });

    const result = await service.refresh(parsed.data.refreshToken, auditCtx(req));

    if ('error' in result) return res.status(result.status as number).json({ success: false, error: result.error });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await service.logout(refreshToken, auditCtx(req));
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
}

export async function me(req: Request, res: Response) {
  res.json({ success: true, data: req.user });
}
