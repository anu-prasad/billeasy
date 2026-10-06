const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const billValidator = require('../validators/bill.validator');
const billController = require('../controllers/bill.controller');

const apiRouter = express.Router();
apiRouter.get('/', authMiddleware.requireAuth, billController.listBills);
apiRouter.post('/', authMiddleware.requireAuth, billValidator.validateCreateBill, billController.createBill);
apiRouter.get('/:id', authMiddleware.requireAuth, billController.getBill);
apiRouter.delete('/:id', authMiddleware.requireAuth, billController.deleteBill);

const reportRouter = express.Router();
reportRouter.get('/', authMiddleware.requireAuth, billController.getReport);

const internalRouter = express.Router();
internalRouter.delete('/:tenantId', authMiddleware.requireAdmin, billController.deleteTenant);

module.exports = { apiRouter, reportRouter, internalRouter };