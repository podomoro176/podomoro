import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import prisma from './lib/prisma';

import authRouter from './modules/auth/auth.router';
import branchesRouter from './modules/branches/branches.router';
import menuRouter from './modules/menu/menu.router';
import posRouter from './modules/pos/pos.router';
import onlineRouter, { stripeWebhookRouter } from './modules/online/online.router';
import hrRouter from './modules/hr/hr.router';
import sopRouter from './modules/sop/sop.router';
import distributorsRouter from './modules/distributors/distributors.router';
import wasteRouter from './modules/waste/waste.router';
import financeRouter from './modules/finance/finance.router';
import reviewsRouter from './modules/reviews/reviews.router';
import dashboardRouter from './modules/dashboard/dashboard.router';
import { authenticate } from './middleware/authenticate';
import { requireRole } from './middleware/requireRole';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));

// Stripe webhook must receive raw body — mount BEFORE express.json()
app.use('/api/v1/webhooks', stripeWebhookRouter);

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
app.use('/api/v1/pos', posRouter);
app.use('/api/v1/online', onlineRouter);
app.use('/api/v1/hr', hrRouter);
app.use('/api/v1/sop', sopRouter);
app.use('/api/v1/distributors', distributorsRouter);
app.use('/api/v1/waste', wasteRouter);
app.use('/api/v1/finance', financeRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/dashboard', dashboardRouter);

// Stock level update (standalone route, manager/staff)
app.put(
  '/api/v1/stock/:id',
  authenticate,
  requireRole('manager', 'owner', 'staff'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { updateStock } = await import('./modules/distributors/distributors.service');
      const { updateStockSchema } = await import('./modules/distributors/distributors.schema');
      const parsed = updateStockSchema.safeParse(req.body);
      if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
      res.json({ success: true, data: await updateStock(req.params.id as string, parsed.data) });
    } catch (err) { next(err); }
  },
);

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
