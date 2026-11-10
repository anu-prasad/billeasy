const pool = require('../db');

function toDateStr(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rowToAccount(r) {
  return {
    tenantId: r.tenant_id,
    ownerName: r.owner_name,
    shopName: r.shop_name,
    shopAddress: r.shop_address || '',
    phone: r.phone || '',
    gstApplicable: !!r.gst_applicable,
    gstPercentage: Number(r.gst_percentage),
    gstNumber: r.gst_number || '',
    upiId: r.upi_id || '',
    defaultMessage: r.default_message || '',
    licenseValidity: toDateStr(r.license_validity),
    logoUrl: r.logo_url || '',
    status: r.status || 'active',
    plan: r.plan || 'yearly',
    planStartedAt: toDateStr(r.plan_started_at),
    suspendedAt: r.suspended_at ? new Date(r.suspended_at).toISOString() : null,
    deletedAt: r.deleted_at ? new Date(r.deleted_at).toISOString() : null,
  };
}

function bodyToRow(b) {
  return {
    owner_name: b.ownerName ?? '',
    shop_name: b.shopName ?? '',
    shop_address: b.shopAddress ?? '',
    phone: b.phone ?? '',
    gst_applicable: b.gstApplicable ? 1 : 0,
    gst_percentage: Number(b.gstPercentage ?? 5),
    gst_number: b.gstNumber ?? '',
    upi_id: b.upiId ?? '',
    default_message: b.defaultMessage ?? '',
    license_validity: b.licenseValidity ? b.licenseValidity : null,
    logo_url: b.logoUrl ?? '',
  };
}

async function getAccountByTenantId(tenantId) {
  const [rows] = await pool.execute(
    'SELECT * FROM accounts WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.length > 0 ? rowToAccount(rows[0]) : null;
}

async function tenantExists(tenantId) {
  const [rows] = await pool.execute(
    'SELECT tenant_id FROM accounts WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.length > 0;
}

async function updateAccount(tenantId, row) {
  await pool.execute(
    `UPDATE accounts SET
       owner_name = ?, shop_name = ?, shop_address = ?, phone = ?,
       gst_applicable = ?, gst_percentage = ?, gst_number = ?, upi_id = ?,
       default_message = ?, license_validity = ?, logo_url = ?
     WHERE tenant_id = ?`,
    [
      row.owner_name, row.shop_name, row.shop_address, row.phone,
      row.gst_applicable, row.gst_percentage, row.gst_number, row.upi_id,
      row.default_message, row.license_validity, row.logo_url,
      tenantId,
    ]
  );

  const [rows] = await pool.execute(
    'SELECT * FROM accounts WHERE tenant_id = ?',
    [tenantId]
  );
  return rowToAccount(rows[0]);
}

async function createAccount(tenantId, row) {
  await pool.execute(
    `INSERT INTO accounts (
       tenant_id, owner_name, shop_name, shop_address, phone,
       gst_applicable, gst_percentage, gst_number, upi_id,
       default_message, license_validity, logo_url, status, plan
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'yearly')`,
    [
      tenantId, row.owner_name, row.shop_name, row.shop_address, row.phone,
      row.gst_applicable, row.gst_percentage, row.gst_number, row.upi_id,
      row.default_message, row.license_validity, row.logo_url,
    ]
  );
}

async function runTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) { /* rollback best-effort */ }
    throw err;
  } finally {
    conn.release();
  }
}

async function getAccountRow(tenantId, { conn = null, forUpdate = false } = {}) {
  const db = conn || pool;
  const [rows] = await db.execute(
    `SELECT * FROM accounts WHERE tenant_id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
    [tenantId]
  );
  return rows[0] || null;
}

async function findAllAccounts(search) {
  if (search) {
    const like = `%${search}%`;
    const [rows] = await pool.execute(
      `SELECT * FROM accounts
       WHERE shop_name LIKE ? OR owner_name LIKE ? OR phone LIKE ? OR tenant_id LIKE ?
       ORDER BY shop_name ASC`,
      [like, like, like, like]
    );
    return rows;
  }
  const [rows] = await pool.execute(
    'SELECT * FROM accounts ORDER BY shop_name ASC'
  );
  return rows;
}

async function updateAccountStatus(tenantId, { status, suspendedAt = null, deletedAt = null }) {
  await pool.execute(
    'UPDATE accounts SET status = ?, suspended_at = ?, deleted_at = ? WHERE tenant_id = ?',
    [status, suspendedAt, deletedAt, tenantId]
  );
}

async function updateLicenseExpiry(tenantId, newExpiry, planStartedAt, conn = null) {
  const db = conn || pool;
  await db.execute(
    'UPDATE accounts SET license_validity = ?, plan_started_at = ?, status = ?, suspended_at = NULL, deleted_at = NULL WHERE tenant_id = ?',
    [newExpiry, planStartedAt, 'active', tenantId]
  );
}

async function restoreSubscription(tenantId, { licenseValidity, planStartedAt, status }, conn = null) {
  const db = conn || pool;
  await db.execute(
    'UPDATE accounts SET license_validity = ?, plan_started_at = ?, status = ? WHERE tenant_id = ?',
    [licenseValidity, planStartedAt, status, tenantId]
  );
  const [rows] = await db.execute(
    'SELECT * FROM accounts WHERE tenant_id = ?',
    [tenantId]
  );
  return rows[0] || null;
}

async function deleteAccountRow(tenantId) {
  await pool.execute(
    'DELETE FROM accounts WHERE tenant_id = ?',
    [tenantId]
  );
}

async function insertPlanEvent(tenantId, action, byAdminId, fields = {}, conn = null) {
  const db = conn || pool;
  const [result] = await db.execute(
    `INSERT INTO account_plan_events (
       tenant_id, action, by_admin_id, old_expiry, new_expiry,
       old_status, new_status, old_plan_started_at, new_plan_started_at,
       reverses_event_id, request_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenantId,
      action,
      byAdminId,
      fields.oldExpiry ?? null,
      fields.newExpiry ?? null,
      fields.oldStatus ?? null,
      fields.newStatus ?? null,
      fields.oldPlanStartedAt ?? null,
      fields.newPlanStartedAt ?? null,
      fields.reversesEventId ?? null,
      fields.requestId ?? null,
    ]
  );
  return result.insertId;
}

async function getPlanEventById(eventId, tenantId, conn = null) {
  const db = conn || pool;
  const [rows] = await db.execute(
    'SELECT * FROM account_plan_events WHERE id = ? AND tenant_id = ?',
    [eventId, tenantId]
  );
  return rows[0] || null;
}

async function getLatestPlanEvent(tenantId, conn = null) {
  const db = conn || pool;
  const [rows] = await db.execute(
    'SELECT * FROM account_plan_events WHERE tenant_id = ? ORDER BY id DESC LIMIT 1',
    [tenantId]
  );
  return rows[0] || null;
}

async function markEventReversed(eventId, conn = null) {
  const db = conn || pool;
  await db.execute(
    'UPDATE account_plan_events SET reversed_at = CURRENT_TIMESTAMP WHERE id = ?',
    [eventId]
  );
}

module.exports = {
  getAccountByTenantId,
  tenantExists,
  updateAccount,
  createAccount,
  getAccountRow,
  findAllAccounts,
  updateAccountStatus,
  updateLicenseExpiry,
  restoreSubscription,
  deleteAccountRow,
  insertPlanEvent,
  getPlanEventById,
  getLatestPlanEvent,
  markEventReversed,
  runTransaction,
  rowToAccount,
  bodyToRow,
  toDateStr,
};