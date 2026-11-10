require('dotenv').config();

module.exports = {
  PORT: Number(process.env.PORT) || 4002,
  DB_HOST: process.env.MYSQL_HOST || 'localhost',
  DB_PORT: Number(process.env.MYSQL_PORT) || 3306,
  DB_USER: process.env.MYSQL_USER || 'root',
  DB_PASSWORD: process.env.MYSQL_PASSWORD || '',
  DB_NAME: process.env.MYSQL_DATABASE || 'billeasy_accounts',
  JWT_SECRET: process.env.JWT_SECRET || 'billeasy-super-secret-key-2026',
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL || 'http://localhost:4003',
  BILL_SERVICE_URL: process.env.BILL_SERVICE_URL || 'http://localhost:4004',
  STAFF_SERVICE_URL: process.env.STAFF_SERVICE_URL || 'http://localhost:4005',
  SESSION_CACHE_TTL_MS: Number(process.env.SESSION_CACHE_TTL_MS) || 60000,
  SESSION_CACHE_MAX: Number(process.env.SESSION_CACHE_MAX) || 2000,
};