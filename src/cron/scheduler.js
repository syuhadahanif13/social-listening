const cron = require('node-cron');
const { executeListeningCycle } = require('../services/listeningService');

function initScheduler() {
  const scheduleExpr = process.env.CRON_SCHEDULE || '0 */6 * * *';
  console.log(`[Scheduler] Initializing automated social listening scheduler with expression: '${scheduleExpr}'`);

  if (!cron.validate(scheduleExpr)) {
    console.error(`[Scheduler] Invalid cron expression '${scheduleExpr}', skipping scheduler.`);
    return;
  }

  cron.schedule(scheduleExpr, async () => {
    console.log('[Scheduler] Executing scheduled social listening run for Raja Emas Indonesia...');
    try {
      await executeListeningCycle(process.env.BRAND_NAME || 'Raja Emas Indonesia');
      console.log('[Scheduler] Scheduled listening run completed successfully.');
    } catch (err) {
      console.error('[Scheduler] Scheduled listening run failed:', err.message);
    }
  });

  console.log('[Scheduler] Background listener cron successfully registered.');
}

module.exports = {
  initScheduler
};
