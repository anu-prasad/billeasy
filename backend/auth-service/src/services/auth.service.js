const { randomUUID } = require('crypto');
const config = require('../config/env');
const repository = require('../repositories/auth.repository');
const { signToken, verifyToken } = require('../middleware/auth.middleware');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function createAccountForTenant(tenantId, { name, shopName, phone }) {
  const res = await fetch(`${config.ACCOUNT_SERVICE_URL}/internal/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, ownerName: name, shopName, phone }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function issueSessionAndToken(user) {
  const sessionId = randomUUID();
  await repository.createSessionForUser(user.id, sessionId, new Date(Date.now() + SESSION_TTL_MS));
  return signToken({
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    name: user.name,
    email: user.email,
    sid: sessionId,
  });
}

async function register(body) {
  const { name, email, password, shopName, phone } = body || {};

  const existing = await repository.findUserByEmail(email);
  if (existing) throw httpError(409, 'Email already registered');

  const tenantId = randomUUID();
  const userId = tenantId;

  await repository.insertUser({
    id: userId,
    name,
    email,
    password,
    role: 'owner',
    tenantId,
  });

  const accountRes = await createAccountForTenant(tenantId, { name, shopName, phone });
  if (!accountRes.ok) {
    await repository.deleteUserById(userId);
    console.error('Failed to create account:', accountRes.status, accountRes.data);
    throw httpError(500, 'Server error');
  }

  const user = { id: userId, name, email, role: 'owner', tenant_id: tenantId };
  try {
    return await issueSessionAndToken(user);
  } catch (err) {
    await repository.deleteUserById(userId);
    console.error('Failed to create session for new user:', err.message);
    throw httpError(500, 'Server error');
  }
}

async function login(body) {
  const { email, password } = body || {};

  const user = await repository.findUserByEmail(email);
  if (!user || user.password !== password) {
    throw httpError(401, 'Invalid credentials');
  }
  if (user.active === 0) {
    throw httpError(403, 'Account suspended');
  }

  const token = await issueSessionAndToken(user);

  return {
    token,
    user: { name: user.name, email: user.email, role: user.role },
  };
}

async function logout(sid) {
  if (sid) await repository.revokeSessionById(sid);
}

async function validateSession(token) {
  const payload = await verifyToken(token);
  if (!payload) return { ok: false, status: 401, error: 'Unauthorized' };

  if (payload.sid) {
    const session = await repository.findActiveSession(payload.sid);
    if (!session) {
      const sessionRecord = await repository.findSession(payload.sid);
      if (sessionRecord && sessionRecord.revoked_at) {
        return { ok: false, status: 401, error: 'Your account was signed in from another device.' };
      }
      return { ok: false, status: 401, error: 'Session expired. Please sign in again.' };
    }
  }

  return { ok: true, user: payload };
}

async function forgotPassword(body) {
  const { email } = body || {};

  const user = await repository.findUserByEmail(email);
  if (!user) throw httpError(404, 'Email not found');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await repository.deleteOtpsByEmail(email);
  await repository.insertOtp(email, otp, expiresAt);

  console.log(`OTP for ${email}: ${otp}`);
  return { otp, message: `OTP sent to ${email}` };
}

async function verifyOtp(body) {
  const { email, otp, newPassword } = body || {};

  const otpRecord = await repository.findOtp(email, otp);
  if (!otpRecord) throw httpError(400, 'Invalid OTP');

  if (new Date() > new Date(otpRecord.expires_at)) {
    throw httpError(400, 'OTP expired');
  }

  if (newPassword) {
    await repository.updateUserPassword(email, newPassword);
  }

  await repository.deleteOtpsByEmail(email);

  const user = await repository.findUserByEmail(email);
  if (user) {
    const token = await issueSessionAndToken(user);
    return { success: true, token };
  }

  return { success: true, token: null };
}

async function createUser(body) {
  const { id, name, email, password, role, tenantId } = body || {};

  const existing = await repository.findUserByEmail(email);
  if (existing) throw httpError(409, 'Email already in use');

  await repository.insertUser({
    id,
    name,
    email,
    password,
    role: role || 'staff',
    tenantId,
  });
}

async function deleteUser(id) {
  await repository.deleteUserById(id);
}

async function suspendTenant(tenantId) {
  await repository.setUsersActiveForTenant(tenantId, 0);
  await repository.revokeSessionsForTenant(tenantId);
}

async function activateTenant(tenantId) {
  await repository.setUsersActiveForTenant(tenantId, 1);
}

async function deleteTenant(tenantId) {
  await repository.deleteTenantData(tenantId);
}

module.exports = {
  register,
  login,
  logout,
  validateSession,
  forgotPassword,
  verifyOtp,
  createUser,
  deleteUser,
  suspendTenant,
  activateTenant,
  deleteTenant,
};