import cron from 'node-cron';
import { checkLowStock } from './stockCheck.job';
import { sendDailyBriefing } from './dailyBriefing.job';

export function startJobs(): void {
  // Daily at 06:00 Amsterdam time — stock level check (runs before briefing)
  cron.schedule('0 6 * * *', checkLowStock, { timezone: 'Europe/Amsterdam' });

  // Daily at 07:00 Amsterdam time — send daily briefing email
  cron.schedule('0 7 * * *', sendDailyBriefing, { timezone: 'Europe/Amsterdam' });

  console.log('[jobs] Cron jobs scheduled');
}
