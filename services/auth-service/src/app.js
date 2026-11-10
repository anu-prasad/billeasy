const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes.apiRouter);
app.use('/internal/users', authRoutes.internalRouter);
app.use('/internal/tenant', authRoutes.tenantRouter);

app.get('/health', (req, res) => res.json({ service: 'auth-service', ok: true }));

app.use(errorMiddleware.errorHandler);

module.exports = app;