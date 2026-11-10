const express = require('express');
const cors = require('cors');
const billRoutes = require('./routes/bill.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/bills', billRoutes.apiRouter);
app.use('/api/reports', billRoutes.reportRouter);

app.use('/internal/tenant', billRoutes.internalRouter);

app.get('/health', (req, res) => res.json({ service: 'bill-service', ok: true }));

app.use(errorMiddleware.errorHandler);

module.exports = app;