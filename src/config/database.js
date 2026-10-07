const mysql = require('mysql2/promise');
require('dotenv').config();

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'admin_listening',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rei_listening',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  connectTimeout: 8000
};

let pool = null;
let isDbConnected = false;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
  }
  return pool;
}

async function testConnection() {
  try {
    const currentPool = getPool();
    const conn = await currentPool.getConnection();
    await conn.ping();
    conn.release();
    isDbConnected = true;
    console.log(`[Database] Connected successfully to MySQL (${poolConfig.user}@${poolConfig.host}:${poolConfig.port}/${poolConfig.database})`);
    return true;
  } catch (err) {
    isDbConnected = false;
    console.warn(`[Database] MySQL Connection Notice: ${err.message}`);
    console.warn(`[Database] If you are running locally and connecting to remote IP (${poolConfig.host}), ensure remote access is granted for '${poolConfig.user}', or run directly on the host server where localhost is available.`);
    return false;
  }
}

module.exports = {
  getPool,
  testConnection,
  isDbConnected: () => isDbConnected,
  poolConfig
};
