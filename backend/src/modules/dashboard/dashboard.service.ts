import prisma from '../../lib/prisma';
import { getLastLowStockItems } from '../../jobs/stockCheck.job';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export async function getKpis() {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);

  const [revenueToday, revenueYesterday, staffOnShift, openOrders] = await Promise.all([
    prisma.transaction.aggregate({
      where: { createdAt: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: yesterday, lt: today } },
      _sum: { amount: true },
    }),
    prisma.shift.count({
      where: { date: today },
    }),
    prisma.order.count({
      where: { status: { in: ['pending', 'accepted', 'preparing'] } },
    }),
  ]);

  return {
    revenueToday: revenueToday._sum.amount ?? 0,
    revenueYesterday: revenueYesterday._sum.amount ?? 0,
    staffOnShift,
    openOrders,
  };
}

export async function getRevenueChart(days: number) {
  const from = addDays(startOfDay(new Date()), -(days - 1));

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: from } },
    select: { amount: true, branchId: true, createdAt: true },
  });

  // Group by date and branchId
  const map = new Map<string, number>();
  for (const tx of transactions) {
    const date = startOfDay(tx.createdAt).toISOString().slice(0, 10);
    const key = `${tx.branchId}::${date}`;
    map.set(key, (map.get(key) ?? 0) + tx.amount);
  }

  const result: Array<{ branchId: string; date: string; revenue: number }> = [];
  for (const [key, revenue] of map.entries()) {
    const [branchId, date] = key.split('::');
    result.push({ branchId, date, revenue });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAlerts() {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const [pendingLeave, lowStock, wasteToday, revenueToday] = await Promise.all([
    prisma.leaveRequest.count({ where: { status: 'pending' } }),
    getLastLowStockItems(),
    prisma.wasteLog.aggregate({
      where: { createdAt: { gte: today, lt: tomorrow }, costPrice: { not: null } },
      _sum: { costPrice: true },
    }),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
    }),
  ]);

  const wasteCost = wasteToday._sum.costPrice ?? 0;
  const revenue = revenueToday._sum.amount ?? 0;
  const wastePercent = revenue > 0 ? (wasteCost / revenue) * 100 : 0;
  const wasteAnomalies = wastePercent > 5 ? 1 : 0;

  return {
    pendingLeaveRequests: pendingLeave,
    lowStockItems: lowStock.length,
    wasteAnomalies,
    wastePercent: Math.round(wastePercent * 100) / 100,
  };
}

export async function getRecentOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      branch: { select: { name: true } },
      items: { include: { menuItem: { select: { name: true } } } },
    },
  });
}
