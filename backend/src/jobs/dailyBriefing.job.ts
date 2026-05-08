import prisma from '../lib/prisma';
import { sendMail } from '../lib/mailer';
import { getLastLowStockItems } from './stockCheck.job';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
}

function dutchDate(d: Date): string {
  return d.toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

interface BriefingData {
  today: Date;
  revenueByBranch: Array<{ branchId: string; branchName: string; revenue: number; changePercent: number | null }>;
  todayShifts: Array<{ employeeName: string; branchName: string; startTime: string; roleOnShift: string }>;
  lowStockItems: Array<{ name: string; branchName: string }>;
  pendingLeaveCount: number;
  wasteYesterday: { totalCost: number; wastePercent: number | null };
}

export async function buildBriefingData(): Promise<BriefingData> {
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);
  const lastWeekYesterday = addDays(yesterday, -7);

  const branches = await prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } });

  // Revenue per branch yesterday vs same day last week
  const revenueByBranch = await Promise.all(
    branches.map(async (branch) => {
      const [yday, lwk] = await Promise.all([
        prisma.transaction.aggregate({ where: { branchId: branch.id, createdAt: { gte: yesterday, lt: today } }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { branchId: branch.id, createdAt: { gte: lastWeekYesterday, lt: addDays(lastWeekYesterday, 1) } }, _sum: { amount: true } }),
      ]);
      const rev = yday._sum.amount ?? 0;
      const lastWeekRev = lwk._sum.amount ?? 0;
      const changePercent = lastWeekRev === 0 ? null : Math.round(((rev - lastWeekRev) / lastWeekRev) * 10000) / 100;
      return { branchId: branch.id, branchName: branch.name, revenue: rev, changePercent };
    })
  );

  // Today's shifts
  const shifts = await prisma.shift.findMany({
    where: { date: today },
    include: {
      employee: { select: { name: true } },
      branch: { select: { name: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  const todayShifts = shifts.map(s => ({
    employeeName: s.employee.name,
    branchName: s.branch.name,
    startTime: s.startTime.toISOString().slice(11, 16),
    roleOnShift: s.roleOnShift,
  }));

  // Low stock items
  const rawLow = getLastLowStockItems();
  const lowStockItems = rawLow.map(item => ({
    name: (item as { supplierProduct?: { name?: string } }).supplierProduct?.name ?? 'Onbekend',
    branchName: (item as { branch?: { name?: string } }).branch?.name ?? '',
  }));

  // Pending leave
  const pendingLeaveCount = await prisma.leaveRequest.count({ where: { status: 'pending' } });

  // Waste yesterday
  const [wasteAgg, revenueYday] = await Promise.all([
    prisma.wasteLog.aggregate({ where: { createdAt: { gte: yesterday, lt: today }, costPrice: { not: null } }, _sum: { costPrice: true } }),
    prisma.transaction.aggregate({ where: { createdAt: { gte: yesterday, lt: today } }, _sum: { amount: true } }),
  ]);
  const wasteCost = wasteAgg._sum.costPrice ?? 0;
  const rev = revenueYday._sum.amount ?? 0;
  const wastePercent = rev > 0 ? Math.round((wasteCost / rev) * 10000) / 100 : null;

  return {
    today,
    revenueByBranch,
    todayShifts,
    lowStockItems,
    pendingLeaveCount,
    wasteYesterday: { totalCost: wasteCost, wastePercent },
  };
}

export function buildBriefingHtml(data: BriefingData): string {
  const revenueRows = data.revenueByBranch.map(b => {
    const arrow = b.changePercent === null ? '' : b.changePercent >= 0 ? `▲ ${b.changePercent}%` : `▼ ${Math.abs(b.changePercent)}%`;
    const color = b.changePercent === null ? '' : b.changePercent >= 0 ? 'color:#2e7d32' : 'color:#c62828';
    return `<tr><td>${b.branchName}</td><td>${formatEur(b.revenue)}</td><td style="${color}">${arrow}</td></tr>`;
  }).join('');

  const shiftRows = data.todayShifts.length > 0
    ? data.todayShifts.map(s => `<tr><td>${s.employeeName}</td><td>${s.branchName}</td><td>${s.startTime}</td><td>${s.roleOnShift}</td></tr>`).join('')
    : '<tr><td colspan="4">Geen diensten gepland</td></tr>';

  const lowStockRows = data.lowStockItems.length > 0
    ? data.lowStockItems.map(i => `<li>${i.name}${i.branchName ? ` (${i.branchName})` : ''}</li>`).join('')
    : '<li>Geen artikelen onder par niveau</li>';

  const wastePercentText = data.wasteYesterday.wastePercent !== null
    ? ` (${data.wasteYesterday.wastePercent}% van omzet)`
    : '';

  return `
    <div style="font-family:Inter,sans-serif;max-width:640px;margin:auto;color:#1a1a1a;">
      <h2 style="color:#C8371A;">Goedemorgen — ${dutchDate(data.today)}</h2>

      <h3>Gisteren's omzet</h3>
      <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Vestiging</th><th>Omzet</th><th>vs vorige week</th></tr></thead>
        <tbody>${revenueRows}</tbody>
      </table>

      <h3>Vandaag rooster</h3>
      <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Medewerker</th><th>Vestiging</th><th>Aanvang</th><th>Rol</th></tr></thead>
        <tbody>${shiftRows}</tbody>
      </table>

      <h3>Lage voorraad</h3>
      <ul>${lowStockRows}</ul>

      <h3>Pending goedkeuringen</h3>
      <p>${data.pendingLeaveCount} verlofaanvragen wachten op goedkeuring.</p>

      <h3>Waste gisteren</h3>
      <p>Totaal: <strong>${formatEur(data.wasteYesterday.totalCost)}</strong>${wastePercentText}</p>

      <h3>Open reservaties vandaag</h3>
      <p><em>Reserveringssysteem nog niet gekoppeld — controleer handmatig.</em></p>

      <hr/>
      <small style="color:#666;">Podomoro Daily Briefing — automatisch gegenereerd om 07:00</small>
    </div>
  `;
}

export async function sendDailyBriefing(): Promise<void> {
  try {
    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
      console.warn('[daily-briefing] OWNER_EMAIL not set — skipping');
      return;
    }

    const data = await buildBriefingData();
    const html = buildBriefingHtml(data);
    const subject = `Dagelijkse briefing — ${dutchDate(data.today)}`;

    await sendMail(ownerEmail, subject, html);

    if (process.env.PARTNER_BRIEFING_ENABLED === 'true') {
      const partners = await prisma.user.findMany({ where: { role: 'partner', isActive: true }, select: { email: true } });
      for (const partner of partners) {
        await sendMail(partner.email, subject, html);
      }
    }

    console.log('[daily-briefing] Briefing sent successfully');
  } catch (err) {
    console.error('[daily-briefing] Error sending briefing:', err);
  }
}
