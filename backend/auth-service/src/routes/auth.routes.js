const express = require('express');
const authValidator = require('../validators/auth.validator');
const authMiddleware = require('../middleware/auth.middleware');
const authController = require('../controllers/auth.controller');

const apiRouter = express.Router();
apiRouter.post('/register', authValidator.validateRegister, authController.register);
apiRouter.post('/login', authValidator.validateLogin, authController.login);
apiRouter.post('/logout', authController.logout);
apiRouter.post('/forgot-password', authController.forgotPassword);
apiRouter.post('/verify-otp', authController.verifyOtp);

const internalRouter = express.Router();
internalRouter.post('/sessions/validate', authController.validateSession);
internalRouter.post('/', authController.createUser);
internalRouter.delete('/:id', authController.deleteUser);

const tenantRouter = express.Router();
tenantRouter.use(authMiddleware.requireAdmin);
tenantRouter.post('/:tenantId/suspend', authController.suspendTenant);
tenantRouter.post('/:tenantId/activate', authController.activateTenant);
tenantRouter.delete('/:tenantId', authController.deleteTenant);

module.exports = { apiRouter, internalRouter, tenantRouter };