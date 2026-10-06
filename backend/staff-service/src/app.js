const express = require('express');
const cors = require('cors');
const staffRoutes = require('./routes/staff.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/staff', staffRoutes.router);

app.use('/internal/tenant', staffRoutes.internalRouter);

app.get('/health', (req, res) => res.json({ service: 'staff-service', ok: true }));

app.use(errorMiddleware.errorHandler);

module.exports = app;