import { buildBriefingHtml } from './dailyBriefing.job';

describe('Daily Briefing HTML generator (unit)', () => {
  const mockData = {
    today: new Date('2024-01-15'),
    revenueByBranch: [
      { branchId: 'b1', branchName: 'Amsterdam', revenue: 125000, changePercent: 8.5 },
      { branchId: 'b2', branchName: 'Utrecht', revenue: 98000, changePercent: -3.2 },
    ],
    todayShifts: [
      { employeeName: 'Jan de Vries', branchName: 'Amsterdam', startTime: '09:00', roleOnShift: 'cook' },
    ],
    lowStockItems: [
      { name: 'Tomatensaus', branchName: 'Amsterdam' },
    ],
    pendingLeaveCount: 3,
    wasteYesterday: { totalCost: 4500, wastePercent: 3.6 },
  };

  it('contains all 7 section headings', () => {
    const html = buildBriefingHtml(mockData);

    expect(html).toContain('Goedemorgen');
    expect(html).toContain('Gisteren\'s omzet');
    expect(html).toContain('Vandaag rooster');
    expect(html).toContain('Lage voorraad');
    expect(html).toContain('Pending goedkeuringen');
    expect(html).toContain('Waste gisteren');
    expect(html).toContain('Open reservaties vandaag');
  });

  it('shows revenue per branch', () => {
    const html = buildBriefingHtml(mockData);
    expect(html).toContain('Amsterdam');
    expect(html).toContain('Utrecht');
  });

  it('shows positive change arrow for Amsterdam', () => {
    const html = buildBriefingHtml(mockData);
    expect(html).toContain('▲ 8.5%');
  });

  it('shows negative change arrow for Utrecht', () => {
    const html = buildBriefingHtml(mockData);
    expect(html).toContain('▼ 3.2%');
  });

  it('shows pending leave count', () => {
    const html = buildBriefingHtml(mockData);
    expect(html).toContain('3 verlofaanvragen');
  });

  it('shows waste percentage', () => {
    const html = buildBriefingHtml(mockData);
    expect(html).toContain('3.6%');
  });

  it('shows low stock item name', () => {
    const html = buildBriefingHtml(mockData);
    expect(html).toContain('Tomatensaus');
  });
});
