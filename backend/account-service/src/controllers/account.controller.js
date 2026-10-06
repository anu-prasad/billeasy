const accountService = require('../services/account.service');

async function getAccount(req, res, next) {
  try {
    const account = await accountService.getAccount(req.user.tenantId);
    return res.json({ account });
  } catch (err) {
    return next(err);
  }
}

async function updateAccount(req, res, next) {
  try {
    const account = await accountService.updateAccount(req.user.tenantId, req.body);
    return res.json({ account });
  } catch (err) {
    return next(err);
  }
}

async function createAccount(req, res, next) {
  try {
    await accountService.createAccount(req.body.tenantId, req.body);
    return res.status(201).json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function getAccountByTenantId(req, res, next) {
  try {
    const account = await accountService.getAccount(req.params.tenantId);
    return res.json({ account });
  } catch (err) {
    return next(err);
  }
}

async function listAccounts(req, res, next) {
  try {
    const accounts = await accountService.listAccounts(req.query.search);
    return res.json({ accounts });
  } catch (err) {
    return next(err);
  }
}

async function extendAccount(req, res, next) {
  try {
    const body = req.body || {};
    const result = await accountService.extendPlan(req.params.tenantId, req.user.userId, {
      requestId: body.requestId ?? null,
    });
    return res.json({
      account: result.account,
      eventId: result.eventId,
      newValidity: result.newValidity,
    });
  } catch (err) {
    return next(err);
  }
}

async function undoExtendAccount(req, res, next) {
  try {
    const result = await accountService.undoExtend(
      req.params.tenantId,
      req.user.userId,
      Number((req.body || {}).eventId)
    );
    return res.json({
      account: result.account,
      restoredValidity: result.restoredValidity,
    });
  } catch (err) {
    return next(err);
  }
}

async function suspendAccount(req, res, next) {
  try {
    await accountService.suspendPlan(req.params.tenantId, req.user.userId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function reactivateAccount(req, res, next) {
  try {
    await accountService.reactivatePlan(req.params.tenantId, req.user.userId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function deleteAccount(req, res, next) {
  try {
    await accountService.deleteAccount(req.params.tenantId, req.user.userId, {
      force: !!(req.body || {}).force,
    });
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAccount,
  updateAccount,
  createAccount,
  getAccountByTenantId,
  listAccounts,
  extendAccount,
  undoExtendAccount,
  suspendAccount,
  reactivateAccount,
  deleteAccount,
};