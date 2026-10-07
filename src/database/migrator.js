const { getPool, isDbConnected } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  if (!isDbConnected()) {
    console.log('[Migration] Database is not connected, skipping migrations.');
    return false;
  }

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    const pool = getPool();
    for (const sql of statements) {
      await pool.query(sql);
    }

    console.log('[Migration] All tables and initial brand records verified successfully in MySQL.');
    return true;
  } catch (err) {
    console.error('[Migration] Failed to execute database migrations:', err.message);
    return false;
  }
}

module.exports = {
  runMigrations
};
