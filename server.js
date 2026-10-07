require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const { runMigrations } = require('./src/database/migrator');
const { initScheduler } = require('./src/cron/scheduler');
const { executeListeningCycle } = require('./src/services/listeningService');

const PORT = process.env.PORT || 3000;

async function startServer() {
  console.log('----------------------------------------------------');
  console.log('Raja Emas Indonesia - Social Listening Engine');
  console.log('----------------------------------------------------');

  // Test MySQL connection
  const dbOk = await testConnection();
  if (dbOk) {
    // Run schema migrations
    await runMigrations();
  } else {
    console.log('[Server] Operating with hybrid memory store until MySQL remote access is established.');
  }

  // Pre-populate with initial listening scan
  try {
    console.log('[Server] Priming initial brand listening index...');
    await executeListeningCycle(process.env.BRAND_NAME || 'Raja Emas Indonesia');
  } catch (err) {
    console.warn('[Server] Initial listening cycle warning:', err.message);
  }

  // Initialize cron scheduler
  initScheduler();

  // Start HTTP listener
  app.listen(PORT, () => {
    console.log(`[Server] Social Listening API is running at: http://localhost:${PORT}`);
    console.log(`[Server] API Base Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Dashboard UI: http://localhost:${PORT}/`);
    console.log('----------------------------------------------------');
  });
}

startServer();
