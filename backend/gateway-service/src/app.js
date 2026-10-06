const express = require('express');
const httpProxy = require('http-proxy');
const config = require('./config/env');

const app = express();

const proxy = httpProxy.createProxyServer({ changeOrigin: false });

function onProxyError(err, req, res) {
  if (res.headersSent) {
    return res.destroy();
  }
  const status = err && err.code === 'ECONNREFUSED' ? 503 : 502;
  res.status(status).json({ error: 'Gateway error' });
}
proxy.on('error', onProxyError);

const ROUTES = [
  { prefix: '/api/auth', target: config.AUTH_SERVICE_URL },
  { prefix: '/api/admin/accounts', target: config.ACCOUNT_SERVICE_URL },
  { prefix: '/api/account', target: config.ACCOUNT_SERVICE_URL },
  { prefix: '/api/products', target: config.PRODUCT_SERVICE_URL },
  { prefix: '/api/bills', target: config.BILL_SERVICE_URL },
  { prefix: '/api/reports', target: config.BILL_SERVICE_URL },
  { prefix: '/api/staff', target: config.STAFF_SERVICE_URL },
];

function matchRoute(path) {
  return ROUTES.find((route) => path === route.prefix || path.startsWith(`${route.prefix}/`)) || null;
}

app.get('/health', (req, res) => res.json({ service: 'gateway-service', ok: true }));

app.use((req, res) => {
  const route = matchRoute(req.path);
  if (!route) {
    return res.status(404).json({ error: 'Unknown API route' });
  }
  proxy.web(req, res, { target: route.target }, (err) => onProxyError(err, req, res));
});

module.exports = app;