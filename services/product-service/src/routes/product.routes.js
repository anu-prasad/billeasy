const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const productController = require('../controllers/product.controller');

const router = express.Router();
router.get('/', authMiddleware.requireAuth, productController.listProducts);
router.get('/by-code', authMiddleware.requireAuth, productController.getProductByCode);
router.post('/', authMiddleware.requireAuth, productController.createProduct);
router.put('/:id', authMiddleware.requireAuth, productController.updateProduct);
router.delete('/:id', authMiddleware.requireAuth, productController.deleteProduct);

const internalRouter = express.Router();
internalRouter.delete('/:tenantId', authMiddleware.requireAdmin, productController.deleteTenant);

module.exports = { router, internalRouter };