import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import prisma from './lib/prisma';

import authRouter from './modules/auth/auth.router';
import branchesRouter from './modules/branches/branches.router';
import menuRouter from './modules/menu/menu.router';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/branches', branchesRouter);
app.use('/api/v1/menu', menuRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(async (err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  try {
    await prisma.errorLog.create({
      data: {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      },
    });
  } catch {
    // swallow logging errors — don't cascade
  }

  res.status(500).json({ success: false, error: 'Internal server error' });
});

export default app;
