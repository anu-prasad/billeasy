const { SignJWT } = require('jose');
const config = require('../config/env');
const repository = require('../repositories/account.repository');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function serviceToken() {
  return new SignJWT({
    userId: 'account-service',
    tenantId: 'ADMIN',
    role: 'admin',
    name: 'Account Service',
    email: 'service@billeasy.com',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(config.JWT_SECRET));
}

async function internalCall(baseUrl, path, { method = 'POST' } = {}) {
  const token = await serviceToken();
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Cookie: `billeasy_token=${token}` },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('[account-service] internal call failed:', err.message);
    return { ok: false, status: 0, data: {} };
  }
}

function authCall(path, opts) {
  return internalCall(config.AUTH_SERVICE_URL, path, opts);
}

function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDate(d) {
  if (!d) return null;
  if (d instanceof Date && !Number.isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const m = String(d).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function expiryStr(d) {
  return d ? repository.toDateStr(d) : null;
}

function effectiveStatus(r) {
  if (r.status === 'suspended' || r.status === 'deleted' || r.status === 'pending') return r.status;
  const exp = parseDate(r.license_validity);
  if (exp && exp < todayDate()) return 'expired';
  return 'active';
}

async function getAccount(tenantId) {
  const row = await repository.getAccountRow(tenantId);
  if (!row) throw httpError(404, 'Account not found');
  return { ...repository.rowToAccount(row), status: effectiveStatus(row) };
}

async function updateAccount(tenantId, body) {
  const exists = await repository.tenantExists(tenantId);
  if (!exists) throw httpError(404, 'Account not found');

  const row = repository.bodyToRow(body || {});
  return repository.updateAccount(tenantId, row);
}

async function createAccount(tenantId, body) {
  const row = repository.bodyToRow(body || {});
  try {
    await repository.createAccount(tenantId, row);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw httpError(409, 'Account already exists');
    }
    throw err;
  }
}

async function getAccountByTenantId(tenantId) {
  return getAccount(tenantId);
}

async function listAccounts(search) {
  const rows = await repository.findAllAccounts(search);
  return rows.map((r) => ({ ...repository.rowToAccount(r), status: effectiveStatus(r) }));
}

async function extendPlan(tenantId, adminId, { requestId = null } = {}) {
  return repository.runTransaction(async (conn) => {
    const row = await repository.getAccountRow(tenantId, { conn, forUpdate: true });
    if (!row) throw httpError(404, 'Account not found');
    if (row.status === 'suspended' || row.status === 'deleted') {
      throw httpError(
        409,
        row.status === 'suspended'
          ? 'Account is suspended. Reactivate before extending.'
          : 'Account is deleted. Cannot extend a deleted account.'
      );
    }

    const today = todayDate();
    const current = parseDate(row.license_validity);
    const base = current && current >= today ? current : today;
    const newExpiry = new Date(base);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    const newExpiryStr = repository.toDateStr(newExpiry);
    const oldExpiryStr = expiryStr(row.license_validity);
    const todayStr = repository.toDateStr(today);
    const action = row.status === 'pending' ? 'activate' : 'extend';

    await repository.updateLicenseExpiry(tenantId, newExpiryStr, todayStr, conn);

    let eventId;
    try {
      eventId = await repository.insertPlanEvent(
        tenantId,
        action,
        adminId,
        {
          oldExpiry: oldExpiryStr,
          newExpiry: newExpiryStr,
          oldStatus: row.status,
          newStatus: 'active',
          oldPlanStartedAt: expiryStr(row.plan_started_at),
          newPlanStartedAt: todayStr,
          requestId,
        },
        conn
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw httpError(409, 'Duplicate activation request');
      }
      throw err;
    }

    return {
      account: repository.rowToAccount({
        ...row,
        license_validity: newExpiryStr,
        plan_started_at: todayStr,
        status: 'active',
        suspended_at: null,
        deleted_at: null,
      }),
      eventId,
      newValidity: newExpiryStr,
    };
  });
}

async function undoExtend(tenantId, adminId, eventId) {
  return repository.runTransaction(async (conn) => {
    const row = await repository.getAccountRow(tenantId, { conn, forUpdate: true });
    if (!row) throw httpError(404, 'Account not found');

    const event = await repository.getPlanEventById(eventId, tenantId, conn);
    if (!event) throw httpError(404, 'Activation event not found');
    if (event.action !== 'extend' && event.action !== 'activate') {
      throw httpError(400, 'Only an activation/extension can be undone');
    }
    if (event.reversed_at) throw httpError(409, 'This activation has already been undone');

    const latest = await repository.getLatestPlanEvent(tenantId, conn);
    if (!latest || latest.id !== event.id) {
      throw httpError(409, 'Another subscription action already happened. Cannot undo.');
    }

    const restoreValidity = event.old_expiry ? repository.toDateStr(event.old_expiry) : null;
    const restoreStartedAt = event.old_plan_started_at ? repository.toDateStr(event.old_plan_started_at) : null;
    const restoreStatus = event.old_status || 'active';

    const updatedRow = await repository.restoreSubscription(
      tenantId,
      { licenseValidity: restoreValidity, planStartedAt: restoreStartedAt, status: restoreStatus },
      conn
    );

    await repository.markEventReversed(event.id, conn);
    await repository.insertPlanEvent(
      tenantId,
      'undo',
      adminId,
      {
        oldExpiry: expiryStr(event.new_expiry),
        newExpiry: restoreValidity,
        oldStatus: event.new_status || null,
        newStatus: restoreStatus,
        oldPlanStartedAt: expiryStr(event.new_plan_started_at),
        newPlanStartedAt: restoreStartedAt,
        reversesEventId: event.id,
      },
      conn
    );

    return {
      account: repository.rowToAccount(updatedRow),
      restoredValidity: restoreValidity,
    };
  });
}

async function suspendPlan(tenantId, adminId) {
  const row = await repository.getAccountRow(tenantId);
  if (!row) throw httpError(404, 'Account not found');

  const authRes = await authCall(`/internal/tenant/${encodeURIComponent(tenantId)}/suspend`);
  if (!authRes.ok) {
    console.error('[account-service] suspend auth call failed:', authRes.status);
  }
  await repository.updateAccountStatus(tenantId, { status: 'suspended', suspendedAt: new Date() });
  await repository.insertPlanEvent(tenantId, 'suspend', adminId, {
    oldExpiry: expiryStr(row.license_validity),
    oldStatus: row.status,
    newStatus: 'suspended',
  });
}

async function reactivatePlan(tenantId, adminId) {
  const row = await repository.getAccountRow(tenantId);
  if (!row) throw httpError(404, 'Account not found');

  const authRes = await authCall(`/internal/tenant/${encodeURIComponent(tenantId)}/activate`);
  if (!authRes.ok) {
    console.error('[account-service] activate auth call failed:', authRes.status);
  }
  await repository.updateAccountStatus(tenantId, { status: 'active' });
  await repository.insertPlanEvent(tenantId, 'reactivate', adminId, {
    oldExpiry: expiryStr(row.license_validity),
    oldStatus: row.status,
    newStatus: 'active',
  });
}

async function deleteAccount(tenantId, adminId, { force = false } = {}) {
  const row = await repository.getAccountRow(tenantId);
  if (!row) throw httpError(404, 'Account not found');

  if (force) {
    const targets = [
      [config.AUTH_SERVICE_URL, '/internal/tenant'],
      [config.PRODUCT_SERVICE_URL, '/internal/tenant'],
      [config.BILL_SERVICE_URL, '/internal/tenant'],
      [config.STAFF_SERVICE_URL, '/internal/tenant'],
    ];
    for (const [base, path] of targets) {
      const res = await internalCall(base, `${path}/${encodeURIComponent(tenantId)}`, { method: 'DELETE' });
      if (!res.ok) {
        console.error('[account-service] hard delete call failed:', base, res.status);
      }
    }
    await repository.deleteAccountRow(tenantId);
  } else {
    await repository.updateAccountStatus(tenantId, { status: 'deleted', deletedAt: new Date() });
    const authRes = await authCall(`/internal/tenant/${encodeURIComponent(tenantId)}/suspend`);
    if (!authRes.ok) {
      console.error('[account-service] soft delete auth call failed:', authRes.status);
    }
  }

  await repository.insertPlanEvent(tenantId, 'delete', adminId, {
    oldExpiry: expiryStr(row.license_validity),
    oldStatus: row.status,
    newStatus: force ? null : 'deleted',
  });
}

module.exports = {
  getAccount,
  updateAccount,
  createAccount,
  getAccountByTenantId,
  listAccounts,
  extendPlan,
  undoExtend,
  suspendPlan,
  reactivatePlan,
  deleteAccount,
};