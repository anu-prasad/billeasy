const staffService = require('../services/staff.service');

async function listStaff(req, res, next) {
  try {
    const staff = await staffService.listStaff(req.user.tenantId);
    return res.json({ staff });
  } catch (err) {
    return next(err);
  }
}

async function createStaff(req, res, next) {
  try {
    const staff = await staffService.createStaff(req.user.tenantId, req.body || {});
    return res.status(201).json({ staff });
  } catch (err) {
    return next(err);
  }
}

async function deleteStaff(req, res, next) {
  try {
    await staffService.deleteStaff(req.user.tenantId, (req.body || {}).id);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function deleteTenant(req, res, next) {
  try {
    await staffService.deleteTenantData(req.params.tenantId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listStaff,
  createStaff,
  deleteStaff,
  deleteTenant,
};