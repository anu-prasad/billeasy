const pool = require('../db');

async function runTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function createSessionForUser(userId, sessionId, expiresAt) {
  await runTransaction(async (conn) => {
    const [userRows] = await conn.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!userRows[0]) {
      const err = new Error('User not found');
      err.status = 500;
      throw err;
    }
    await conn.execute(
      'UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()',
      [new Date(), userId]
    );
    await conn.execute(
      'INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)',
      [sessionId, userId, expiresAt]
    );
  });
}

async function findActiveSession(sessionId) {
  const [rows] = await pool.execute(
    'SELECT * FROM sessions WHERE session_id = ? AND revoked_at IS NULL AND expires_at > NOW()',
    [sessionId]
  );
  return rows[0] || null;
}

async function findSession(sessionId) {
  const [rows] = await pool.execute('SELECT * FROM sessions WHERE session_id = ?', [sessionId]);
  return rows[0] || null;
}

async function revokeSessionById(sessionId) {
  await pool.execute(
    'UPDATE sessions SET revoked_at = ? WHERE session_id = ? AND revoked_at IS NULL',
    [new Date(), sessionId]
  );
}

async function revokeSessionsForTenant(tenantId) {
  await pool.execute(
    `UPDATE sessions s
     JOIN users u ON u.id = s.user_id
     SET s.revoked_at = ?
     WHERE u.tenant_id = ? AND s.revoked_at IS NULL`,
    [new Date(), tenantId]
  );
}

async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
    [email]
  );
  return rows[0] || null;
}

async function insertUser(user) {
  await pool.execute(
    'INSERT INTO users (id, name, email, password, role, tenant_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [user.id, user.name, user.email, user.password, user.role, user.tenantId, new Date()]
  );
}

async function deleteUserById(id) {
  await pool.execute('DELETE FROM sessions WHERE user_id = ?', [id]);
  await pool.execute('DELETE FROM users WHERE id = ?', [id]);
}

async function updateUserPassword(email, password) {
  await pool.execute(
    'UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)',
    [password, email]
  );
}

async function findOtp(email, otp) {
  const [rows] = await pool.execute(
    'SELECT * FROM otps WHERE email = ? AND otp = ?',
    [email, otp]
  );
  return rows[0] || null;
}

async function insertOtp(email, otp, expiresAt) {
  await pool.execute(
    'INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)',
    [email, otp, expiresAt]
  );
}

async function deleteOtpsByEmail(email) {
  await pool.execute('DELETE FROM otps WHERE email = ?', [email]);
}

async function setUsersActiveForTenant(tenantId, active) {
  await pool.execute(
    'UPDATE users SET active = ? WHERE tenant_id = ?',
    [active ? 1 : 0, tenantId]
  );
}

async function deleteTenantData(tenantId) {
  const [rows] = await pool.execute(
    'SELECT id, email FROM users WHERE tenant_id = ?',
    [tenantId]
  );
  const ids = rows.map((r) => r.id);
  const emails = rows.map((r) => r.email);
  if (ids.length > 0) {
    const idPlaceholders = ids.map(() => '?').join(',');
    await pool.execute(`DELETE FROM sessions WHERE user_id IN (${idPlaceholders})`, ids);
  }
  if (emails.length > 0) {
    const placeholders = emails.map(() => '?').join(',');
    await pool.execute(`DELETE FROM otps WHERE email IN (${placeholders})`, emails);
  }
  await pool.execute('DELETE FROM users WHERE tenant_id = ?', [tenantId]);
}

module.exports = {
  createSessionForUser,
  findActiveSession,
  findSession,
  revokeSessionById,
  revokeSessionsForTenant,
  findUserByEmail,
  insertUser,
  deleteUserById,
  updateUserPassword,
  findOtp,
  insertOtp,
  deleteOtpsByEmail,
  setUsersActiveForTenant,
  deleteTenantData,
};