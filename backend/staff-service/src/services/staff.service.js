const { randomUUID } = require('crypto');
const config = require('../config/env');
const repository = require('../repositories/staff.repository');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function publicError(status, message) {
  const err = httpError(status, message);
  err.expose = true;
  return err;
}

async function callAuth(path, { method = 'GET', body } = {}) {
  try {
    const res = await fetch(`${config.AUTH_SERVICE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('[staff-service] auth-service call failed:', err.message);
    return { ok: false, status: 0, data: { error: 'Auth service unreachable' } };
  }
}

async function listStaff(tenantId) {
  const rows = await repository.findStaffByTenant(tenantId);
  return rows.map(repository.rowToStaff);
}

async function createStaff(tenantId, body) {
  const staffId = randomUUID();
  const password = body.password || 'staff123';

  const authRes = await callAuth('/internal/users', {
    method: 'POST',
    body: {
      id: staffId,
      name: body.name,
      email: body.email,
      password,
      role: 'staff',
      tenantId,
    },
  });
  if (authRes.status === 409) throw httpError(409, 'Email already in use');
  if (!authRes.ok) {
    console.error('[staff-service] create user failed:', authRes.status, authRes.data);
    throw publicError(500, authRes.data.error || 'Server error');
  }

  try {
    await repository.createStaff({
      id: staffId,
      tenantId,
      name: body.name,
      email: body.email,
      password,
      phone: body.phone || '',
    });
  } catch (err) {
    await callAuth(`/internal/users/${staffId}`, { method: 'DELETE' });
    console.error(err);
    throw httpError(500, 'Server error');
  }

  return repository.rowToStaff({
    id: staffId,
    tenant_id: tenantId,
    name: body.name,
    email: body.email,
    password,
    role: 'staff',
    phone: body.phone || '',
    active: 1,
    created_at: new Date(),
  });
}

async function deleteStaff(tenantId, id) {
  await repository.deleteStaff(id, tenantId);
  await callAuth(`/internal/users/${id}`, { method: 'DELETE' });
}

async function deleteTenantData(tenantId) {
  await repository.deleteByTenantId(tenantId);
}

module.exports = {
  listStaff,
  createStaff,
  deleteStaff,
  deleteTenantData,
};