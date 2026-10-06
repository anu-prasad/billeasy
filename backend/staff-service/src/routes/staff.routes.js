const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const staffValidator = require('../validators/staff.validator');
const staffController = require('../controllers/staff.controller');

const router = express.Router();
router.get('/', authMiddleware.requireAuth, staffController.listStaff);
router.post('/', authMiddleware.requireAuth, staffValidator.validateCreateStaff, staffController.createStaff);
router.delete('/', authMiddleware.requireAuth, staffValidator.validateDeleteStaff, staffController.deleteStaff);

const internalRouter = express.Router();
internalRouter.delete('/:tenantId', authMiddleware.requireAdmin, staffController.deleteTenant);

module.exports = { router, internalRouter };