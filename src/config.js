const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config();

const ROOT_DIR = path.resolve(__dirname, '..');

module.exports = {
  PORT_SERVER_A: parseInt(process.env.PORT_SERVER_A || '4001', 10),
  PORT_SERVER_B: parseInt(process.env.PORT_SERVER_B || '4002', 10),
  PORT_GATEWAY: parseInt(process.env.PORT_GATEWAY || '3000', 10),

  SERVER_A_URL: process.env.SERVER_A_URL || 'http://localhost:4001',
  SERVER_B_URL: process.env.SERVER_B_URL || 'http://localhost:4002',
  GATEWAY_URL: process.env.GATEWAY_URL || 'http://localhost:3000',

  // MySQL/MariaDB XAMPP Connection
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_A_NAME: process.env.DB_A_NAME || 'db_a',
  DB_B_NAME: process.env.DB_B_NAME || 'db_b',

  PUBLIC_KEY_PATH: path.resolve(ROOT_DIR, process.env.PUBLIC_KEY_PATH || './keys/server_b_public.pem'),
  PRIVATE_KEY_PATH: path.resolve(ROOT_DIR, process.env.PRIVATE_KEY_PATH || './keys/server_b_private.pem'),

  RSA_KEY_SIZE: parseInt(process.env.RSA_KEY_SIZE || '2048', 10),
  NODE_ENV: process.env.NODE_ENV || 'development'
};
