const billService = require('../services/bill.service');

async function listBills(req, res, next) {
  try {
    const result = await billService.listBills(req.user.tenantId, req.query.page, req.query.pageSize);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function createBill(req, res, next) {
  try {
    const bill = await billService.createBill(req.user.tenantId, req.body || {});
    return res.status(201).json({ bill });
  } catch (err) {
    return next(err);
  }
}

async function getBill(req, res, next) {
  try {
    const bill = await billService.getBill(req.params.id, req.user.tenantId);
    return res.json({ bill });
  } catch (err) {
    return next(err);
  }
}

async function deleteBill(req, res, next) {
  try {
    await billService.deleteBill(req.params.id, req.user.tenantId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function deleteTenant(req, res, next) {
  try {
    await billService.deleteTenantData(req.params.tenantId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function getReport(req, res, next) {
  try {
    const report = await billService.getReport(
      req.user.tenantId,
      req.query.from,
      req.query.to,
      req.query.page,
      req.query.pageSize
    );
    return res.json(report);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listBills,
  createBill,
  getBill,
  deleteBill,
  deleteTenant,
  getReport,
};