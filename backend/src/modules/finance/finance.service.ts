import prisma from '../../lib/prisma';
import { TransactionFilter, PeriodInput, PayrollQuery } from './finance.schema';

// ── KPI helpers ───────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export async function getDashboard(branchId?: string) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const lastWeekSameDay = addDays(today, -7);

  const branchFilter = branchId ? { branchId } : {};

  // Revenue today
  const revenueToday = await prisma.transaction.aggregate({
    where: { ...branchFilter, createdAt: { gte: today, lt: tomorrow } },
    _sum: { amount: true },
  });

  // Revenue same day last week
  const revenueLastWeek = await prisma.transaction.aggregate({
    where: { ...branchFilter, createdAt: { gte: lastWeekSameDay, lt: addDays(lastWeekSameDay, 1) } },
    _sum: { amount: true },
  });

  const todayAmount = revenueToday._sum.amount ?? 0;
  const lastWeekAmount = revenueLastWeek._sum.amount ?? 0;
  const revenueChangePercent = lastWeekAmount === 0
    ? null
    : Math.round(((todayAmount - lastWeekAmount) / lastWeekAmount) * 10000) / 100;

  // Waste costs today
  const wasteCosts = await prisma.wasteLog.aggregate({
    where: { ...branchFilter, createdAt: { gte: today, lt: tomorrow }, costPrice: { not: null } },
    _sum: { costPrice: true },
  });

  const foodCostPercent = todayAmount > 0
    ? calcFoodCostPercent(0, wasteCosts._sum.costPrice ?? 0, todayAmount)
    : null;

  return {
    revenueToday: todayAmount,
    revenueSameDayLastWeek: lastWeekAmount,
    revenueChangePercent,
    wasteCostToday: wasteCosts._sum.costPrice ?? 0,
    foodCostPercent,
  };
}

export function calcFoodCostPercent(distributorCosts: number, wasteCosts: number, revenue: number): number {
  if (revenue === 0) return 0;
  return Math.round(((distributorCosts + wasteCosts) / revenue) * 10000) / 100;
}

export function calcLabourCostPercent(labourCosts: number, revenue: number): number {
  if (revenue === 0) return 0;
  return Math.round((labourCosts / revenue) * 10000) / 100;
}

export function calcGrossProfitMargin(revenue: number, foodCost: number, wasteCost: number): number {
  if (revenue === 0) return 0;
  return Math.round(((revenue - foodCost - wasteCost) / revenue) * 10000) / 100;
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function listTransactions(filter: TransactionFilter) {
  const { branchId, dateFrom, dateTo, paymentMethod, cashierId, page, limit } = filter;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (branchId) where.branchId = branchId;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (cashierId) where.cashierId = cashierId;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo && { lt: addDays(new Date(dateTo), 1) }),
    };
  }

  const [items, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { cashier: { select: { id: true, email: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ── Payroll ───────────────────────────────────────────────────────────────────

export async function getPayroll(query: PayrollQuery) {
  const { branchId, period_start, period_end } = query;
  const from = new Date(period_start);
  const to = addDays(new Date(period_end), 1);

  const where: Record<string, unknown> = { clockIn: { gte: from, lt: to } };
  if (branchId) where.branchId = branchId;

  const attendance = await prisma.attendance.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, hourlyRate: true, role: true } },
    },
  });

  const byEmployee = new Map<string, { employee: { id: string; name: string; hourlyRate: number; role: string }; totalHours: number; grossPay: number }>();

  for (const row of attendance) {
    const hours = Number(row.actualHours);
    const emp = row.employee;
    if (!byEmployee.has(emp.id)) {
      byEmployee.set(emp.id, { employee: emp, totalHours: 0, grossPay: 0 });
    }
    const entry = byEmployee.get(emp.id)!;
    entry.totalHours += hours;
    entry.grossPay += Math.round(hours * emp.hourlyRate);
  }

  const rows = Array.from(byEmployee.values());
  const totalLabourCost = rows.reduce((sum, r) => sum + r.grossPay, 0);
  return { periodStart: period_start, periodEnd: period_end, rows, totalLabourCost };
}

// ── Waste finance ─────────────────────────────────────────────────────────────

export async function getWasteFinance(branchId: string | undefined, period: 'day' | 'week' | 'month') {
  const now = new Date();
  let from: Date;
  if (period === 'day') {
    from = startOfDay(now);
  } else if (period === 'week') {
    from = addDays(startOfDay(now), -7);
  } else {
    from = addDays(startOfDay(now), -30);
  }

  const where: Record<string, unknown> = { createdAt: { gte: from } };
  if (branchId) where.branchId = branchId;

  const [wasteTotals, revenue] = await Promise.all([
    prisma.wasteLog.aggregate({ where: { ...where, costPrice: { not: null } }, _sum: { costPrice: true } }),
    prisma.transaction.aggregate({ where: { ...(branchId ? { branchId } : {}), createdAt: { gte: from } }, _sum: { amount: true } }),
  ]);

  const wasteCost = wasteTotals._sum.costPrice ?? 0;
  const rev = revenue._sum.amount ?? 0;
  const wastePercent = rev > 0 ? Math.round((wasteCost / rev) * 10000) / 100 : null;

  return { period, from, wasteCost, revenue: rev, wastePercent };
}

// ── COGS ──────────────────────────────────────────────────────────────────────

export async function getCogs(branchId: string | undefined, periodStart: string, periodEnd: string) {
  const from = new Date(periodStart);
  const to = addDays(new Date(periodEnd), 1);

  const where: Record<string, unknown> = { status: 'received', receivedAt: { gte: from, lt: to } };
  if (branchId) where.branchId = branchId;

  const orders = await prisma.distributorOrder.findMany({
    where,
    include: {
      items: {
        include: { supplierProduct: { select: { pricePerUnit: true } } },
      },
    },
  });

  let totalCogs = 0;
  for (const order of orders) {
    for (const item of order.items) {
      totalCogs += Math.round(Number(item.orderedQuantity) * item.supplierProduct.pricePerUnit);
    }
  }

  return { periodStart, periodEnd, totalCogs, orderCount: orders.length };
}

// ── Finance periods ───────────────────────────────────────────────────────────

export async function closePeriod(data: PeriodInput, userId: string) {
  return prisma.financePeriod.create({
    data: {
      branchId: data.branchId,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      isClosed: true,
      closedBy: userId,
      closedAt: new Date(),
    },
  });
}

// ── CSV export ────────────────────────────────────────────────────────────────

export async function exportTransactionsCsv(branchId?: string, dateFrom?: string, dateTo?: string): Promise<string> {
  const filter: TransactionFilter = {
    branchId,
    dateFrom,
    dateTo,
    page: 1,
    limit: 10000,
  };
  const { items } = await listTransactions(filter);

  const header = 'id,orderId,branchId,amount,paymentMethod,cashier,createdAt';
  const rows = items.map(t =>
    [t.id, t.orderId, t.branchId, t.amount, t.paymentMethod, (t as { cashier?: { email?: string } }).cashier?.email ?? '', t.createdAt.toISOString()].join(',')
  );
  return [header, ...rows].join('\n');
}
