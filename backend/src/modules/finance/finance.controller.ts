import { Request, Response, NextFunction } from 'express';
import { transactionFilterSchema, periodSchema, exportQuerySchema, payrollQuerySchema } from './finance.schema';
import * as service from './finance.service';

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = req.query.branchId as string | undefined;
    res.json({ success: true, data: await service.getDashboard(branchId) });
  } catch (err) { next(err); }
}

export async function listTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = transactionFilterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.json({ success: true, data: await service.listTransactions(parsed.data) });
  } catch (err) { next(err); }
}

export async function exportTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const { format, branchId, dateFrom, dateTo } = parsed.data;

    if (format === 'csv') {
      const csv = await service.exportTransactionsCsv(branchId, dateFrom, dateTo);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      return res.send(csv);
    }

    // PDF via Puppeteer
    const { default: puppeteer } = await import('puppeteer');
    const csv = await service.exportTransactionsCsv(branchId, dateFrom, dateTo);
    const rows = csv.split('\n').slice(1).map(r => `<tr>${r.split(',').map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
    const html = `<html><body><table><thead><tr><th>ID</th><th>Order</th><th>Branch</th><th>Amount</th><th>Method</th><th>Cashier</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4', landscape: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.pdf"');
    return res.send(pdf);
  } catch (err) { next(err); }
}

export async function getPayroll(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = payrollQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    res.json({ success: true, data: await service.getPayroll(parsed.data) });
  } catch (err) { next(err); }
}

export async function exportPayroll(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = payrollQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const data = await service.getPayroll(parsed.data);

    const { default: puppeteer } = await import('puppeteer');
    const rows = data.rows.map(r =>
      `<tr><td>${r.employee.name}</td><td>${r.employee.role}</td><td>${r.totalHours.toFixed(2)}</td><td>€ ${(r.grossPay / 100).toFixed(2)}</td></tr>`
    ).join('');
    const html = `
      <html><body>
        <h2>Loonstrook ${data.periodStart} – ${data.periodEnd}</h2>
        <table border="1"><thead><tr><th>Naam</th><th>Rol</th><th>Uren</th><th>Bruto</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="3"><strong>Totaal</strong></td><td><strong>€ ${(data.totalLabourCost / 100).toFixed(2)}</strong></td></tr></tfoot>
        </table>
      </body></html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4' });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="payroll.pdf"');
    return res.send(pdf);
  } catch (err) { next(err); }
}

export async function getWasteFinance(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = req.query.branchId as string | undefined;
    const period = (req.query.period as string) || 'day';
    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(422).json({ success: false, error: 'period must be day, week, or month' });
    }
    res.json({ success: true, data: await service.getWasteFinance(branchId, period as 'day' | 'week' | 'month') });
  } catch (err) { next(err); }
}

export async function getCogs(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = req.query.branchId as string | undefined;
    const period_start = req.query.period_start as string;
    const period_end = req.query.period_end as string;
    if (!period_start || !period_end) {
      return res.status(422).json({ success: false, error: 'period_start and period_end are required' });
    }
    res.json({ success: true, data: await service.getCogs(branchId, period_start, period_end) });
  } catch (err) { next(err); }
}

export async function closePeriod(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = periodSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    const period = await service.closePeriod(parsed.data, req.user!.id);
    res.status(201).json({ success: true, data: period });
  } catch (err) { next(err); }
}
