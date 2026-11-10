require('dotenv').config();

module.exports = {
  PORT: Number(process.env.GATEWAY_PORT) || 4000,
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  ACCOUNT_SERVICE_URL: process.env.ACCOUNT_SERVICE_URL || 'http://localhost:4002',
  PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL || 'http://localhost:4003',
  BILL_SERVICE_URL: process.env.BILL_SERVICE_URL || 'http://localhost:4004',
  STAFF_SERVICE_URL: process.env.STAFF_SERVICE_URL || 'http://localhost:4005',
};