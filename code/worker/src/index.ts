import cron from 'node-cron';
import { importTransactions } from './jobs/import-transactions';
import { backfillTransactions } from './jobs/backfill-transactions';
import { categorizeTransactions } from './jobs/categorize-transactions';
import { generateMonthlyReport, takeNetWorthSnapshot } from './jobs/generate-reports';

console.log('[Worker] Starting cron scheduler...');

// Import transactions every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('[Worker] Running: Import Transactions');
  try {
    await importTransactions();
  } catch (err) {
    console.error('[Worker] Import job failed:', err);
  }
});

// Categorize transactions 15 minutes after each import
cron.schedule('15 */6 * * *', async () => {
  console.log('[Worker] Running: Categorize Transactions');
  try {
    await categorizeTransactions();
  } catch (err) {
    console.error('[Worker] Categorize job failed:', err);
  }
});

// Generate monthly report on the 1st of each month at 6 AM
cron.schedule('0 6 1 * *', async () => {
  console.log('[Worker] Running: Generate Monthly Report');
  try {
    await generateMonthlyReport();
  } catch (err) {
    console.error('[Worker] Report job failed:', err);
  }
});

// Backfill one 90-day window per account every 6 hours
cron.schedule('30 */6 * * *', async () => {
  console.log('[Worker] Running: Backfill Transactions');
  try {
    await backfillTransactions();
  } catch (err) {
    console.error('[Worker] Backfill job failed:', err);
  }
});

// Categorize backfilled transactions 15 minutes after each backfill run
cron.schedule('45 */6 * * *', async () => {
  console.log('[Worker] Running: Categorize Backfilled Transactions');
  try {
    await categorizeTransactions();
  } catch (err) {
    console.error('[Worker] Backfill categorize job failed:', err);
  }
});

// Take net worth snapshot daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('[Worker] Running: Net Worth Snapshot');
  try {
    await takeNetWorthSnapshot();
  } catch (err) {
    console.error('[Worker] Snapshot job failed:', err);
  }
});

// Run initial import on startup (after 10 second delay)
setTimeout(async () => {
  console.log('[Worker] Running initial import...');
  try {
    await importTransactions();
    await backfillTransactions();
    await categorizeTransactions();
    await takeNetWorthSnapshot();
  } catch (err) {
    console.error('[Worker] Initial run failed:', err);
  }
}, 10000);

console.log('[Worker] Cron jobs scheduled:');
console.log('  - Import transactions: every 6 hours (0 */6 * * *)');
console.log('  - Categorize: 15 min after import (15 */6 * * *)');
console.log('  - Monthly report: 1st of month at 6AM (0 6 1 * *)');
console.log('  - Backfill (90-day windows): every 6 hours at :30 (30 */6 * * *)');
console.log('  - Categorize backfilled transactions: every 6 hours at :45 (45 */6 * * *)');
console.log('  - Net worth snapshot: daily at midnight (0 0 * * *)');

// Keep process alive
process.on('SIGTERM', () => {
  console.log('[Worker] Received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Worker] Received SIGINT, shutting down...');
  process.exit(0);
});
