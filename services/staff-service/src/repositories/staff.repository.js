const pool = require('../db');

function rowToStaff(r) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    email: r.email,
    role: r.role,
    phone: r.phone || '',
    active: !!r.active,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

async function findStaffByTenant(tenantId) {
  const [rows] = await pool.execute(
    'SELECT * FROM staff WHERE tenant_id = ? ORDER BY created_at DESC',
    [tenantId]
  );
  return rows;
}

async function createStaff(staff) {
  await pool.execute(
    'INSERT INTO staff (id, tenant_id, name, email, password, role, phone, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      staff.id, staff.tenantId, staff.name, staff.email, staff.password,
      'staff', staff.phone, 1, new Date(),
    ]
  );
}

async function deleteStaff(id, tenantId) {
  await pool.execute(
    'DELETE FROM staff WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
}

async function deleteByTenantId(tenantId) {
  await pool.execute(
    'DELETE FROM staff WHERE tenant_id = ?',
    [tenantId]
  );
}

module.exports = { findStaffByTenant, createStaff, deleteStaff, deleteByTenantId, rowToStaff };