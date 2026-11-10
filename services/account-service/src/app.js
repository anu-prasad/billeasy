const express = require('express');
const cors = require('cors');
const accountRoutes = require('./routes/account.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/account', accountRoutes.apiRouter);
app.use('/internal/accounts', accountRoutes.internalRouter);
app.use('/api/admin/accounts', accountRoutes.adminRouter);

app.get('/health', (req, res) => res.json({ service: 'account-service', ok: true }));

app.use(errorMiddleware.errorHandler);

module.exports = app;