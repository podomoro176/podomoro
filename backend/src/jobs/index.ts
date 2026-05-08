import cron from 'node-cron';
import { checkLowStock } from './stockCheck.job';

export function startJobs(): void {
  // Daily at 06:00 Amsterdam time — stock level check for Daily Briefing
  cron.schedule('0 6 * * *', checkLowStock, { timezone: 'Europe/Amsterdam' });

  console.log('[jobs] Cron jobs scheduled');
}
