require('dotenv').config();

module.exports = {
  PORT: Number(process.env.PORT) || 4001,
  DB_HOST: process.env.MYSQL_HOST || 'localhost',
  DB_PORT: Number(process.env.MYSQL_PORT) || 3306,
  DB_USER: process.env.MYSQL_USER || 'root',
  DB_PASSWORD: process.env.MYSQL_PASSWORD || '',
  DB_NAME: process.env.MYSQL_DATABASE || 'billeasy_auth',
  JWT_SECRET: process.env.JWT_SECRET || 'billeasy-super-secret-key-2026',
  ACCOUNT_SERVICE_URL: process.env.ACCOUNT_SERVICE_URL || 'http://localhost:4002',
};