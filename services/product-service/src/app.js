const express = require('express');
const cors = require('cors');
const productRoutes = require('./routes/product.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/products', productRoutes.router);

app.use('/internal/tenant', productRoutes.internalRouter);

app.get('/health', (req, res) => res.json({ service: 'product-service', ok: true }));

app.use(errorMiddleware.errorHandler);

module.exports = app;