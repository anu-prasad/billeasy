const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const accountValidator = require('../validators/account.validator');
const accountController = require('../controllers/account.controller');

const apiRouter = express.Router();
apiRouter.get('/', authMiddleware.requireAuth, accountController.getAccount);
apiRouter.put('/', authMiddleware.requireAuth, accountController.updateAccount);

const internalRouter = express.Router();
internalRouter.post('/', accountValidator.validateCreateAccount, accountController.createAccount);
internalRouter.get('/:tenantId', accountController.getAccountByTenantId);

const adminRouter = express.Router();
adminRouter.use(authMiddleware.requireAdmin);
adminRouter.get('/', accountController.listAccounts);
adminRouter.post('/:tenantId/extend', accountValidator.validateTenantId, accountValidator.validateExtend, accountController.extendAccount);
adminRouter.post('/:tenantId/undo-extend', accountValidator.validateTenantId, accountValidator.validateUndoExtend, accountController.undoExtendAccount);
adminRouter.post('/:tenantId/suspend', accountValidator.validateTenantId, accountController.suspendAccount);
adminRouter.post('/:tenantId/reactivate', accountValidator.validateTenantId, accountController.reactivateAccount);
adminRouter.delete('/:tenantId', accountValidator.validateTenantDelete, accountController.deleteAccount);

module.exports = { apiRouter, internalRouter, adminRouter };