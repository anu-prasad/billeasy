function validateCreateAccount(req, res, next) {
  const { tenantId } = req.body || {};
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId required' });
  }
  next();
}

const TENANT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function validateTenantId(req, res, next) {
  const { tenantId } = req.params || {};
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId required' });
  }
  if (!TENANT_ID_RE.test(tenantId)) {
    return res.status(400).json({ error: 'Invalid tenantId' });
  }
  next();
}

function validateExtend(req, res, next) {
  const { requestId } = req.body || {};
  if (requestId !== undefined && requestId !== null) {
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(requestId)) {
      return res.status(400).json({ error: 'requestId must be an 8-64 character id' });
    }
  }
  next();
}

function validateUndoExtend(req, res, next) {
  const eventId = Number((req.body || {}).eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ error: 'eventId required' });
  }
  next();
}

function validateTenantDelete(req, res, next) {
  const { tenantId } = req.params || {};
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId required' });
  }
  const { force } = req.body || {};
  if (force !== undefined && typeof force !== 'boolean') {
    return res.status(400).json({ error: 'force must be a boolean' });
  }
  next();
}

module.exports = {
  validateCreateAccount,
  validateTenantId,
  validateExtend,
  validateUndoExtend,
  validateTenantDelete,
};