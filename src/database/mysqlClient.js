const mysql = require('mysql2/promise');
const config = require('../config');

let rootPool = null;
let poolA = null;
let poolB = null;

/**
 * Pool koneksi tingkat server (tanpa database terpilih) untuk inisialisasi awal db_a & db_b
 */
function getRootPool() {
  if (!rootPool) {
    rootPool = mysql.createPool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return rootPool;
}

/**
 * Pool koneksi untuk Database db_a
 */
function getPoolA() {
  if (!poolA) {
    poolA = mysql.createPool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_A_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return poolA;
}

/**
 * Pool koneksi untuk Database db_b
 */
function getPoolB() {
  if (!poolB) {
    poolB = mysql.createPool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_B_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return poolB;
}

/**
 * Membuat database db_a dan db_b secara aman (IF NOT EXISTS)
 * SANGAT AMAN: Tidak pernah melakukan DROP DATABASE atau TRUNCATE database lain!
 */
async function ensureDatabasesExist() {
  const root = getRootPool();
  await root.query(`
    CREATE DATABASE IF NOT EXISTS \`${config.DB_A_NAME}\`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
  await root.query(`
    CREATE DATABASE IF NOT EXISTS \`${config.DB_B_NAME}\`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
}

module.exports = {
  getRootPool,
  getPoolA,
  getPoolB,
  ensureDatabasesExist
};
