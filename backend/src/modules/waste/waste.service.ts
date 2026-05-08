import prisma from '../../lib/prisma';
import { LogWasteInput, UpdateCostInput } from './waste.schema';

export async function logWaste(data: LogWasteInput, userId: string) {
  return prisma.wasteLog.create({
    data: {
      branchId: data.branchId,
      date: new Date(data.date),
      itemName: data.itemName,
      quantity: data.quantity,
      unit: data.unit,
      reason: data.reason,
      loggedBy: userId,
    },
  });
}

export async function updateCostPrice(id: string, data: UpdateCostInput) {
  const entry = await prisma.wasteLog.findUnique({ where: { id } });
  if (!entry) throw Object.assign(new Error('Waste log entry not found'), { statusCode: 404 });
  return prisma.wasteLog.update({ where: { id }, data: { costPrice: data.costPrice } });
}

export async function listWaste(
  branchId: string,
  page: number,
  limit: number,
  date?: string,
) {
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { branchId };
  if (date) where.date = new Date(date);

  const [items, total] = await prisma.$transaction([
    prisma.wasteLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { logger: { select: { id: true, email: true } } },
    }),
    prisma.wasteLog.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

type Period = 'day' | 'week' | 'month';

export async function getWasteTotals(branchId: string, period: Period) {
  const now = new Date();
  let from: Date;

  if (period === 'day') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    from = new Date(now);
    from.setDate(now.getDate() - 7);
  } else {
    from = new Date(now);
    from.setMonth(now.getMonth() - 1);
  }

  const rows = await prisma.wasteLog.findMany({
    where: { branchId, createdAt: { gte: from } },
    select: { costPrice: true, reason: true },
  });

  const totalCost = rows.reduce((sum, r) => sum + (r.costPrice ?? 0), 0);
  const entriesWithCost = rows.filter(r => r.costPrice !== null).length;
  const totalEntries = rows.length;

  return { period, from, totalCost, totalEntries, entriesWithCost };
}
