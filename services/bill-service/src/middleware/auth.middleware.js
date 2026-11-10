const { jwtVerify } = require('jose');
const config = require('../config/env');
const sessionCache = require('./session-cache');

const SECRET = new TextEncoder().encode(config.JWT_SECRET);
const JWT_COOKIE = 'billeasy_token';
const SESSION_VALIDATE_URL = `${config.AUTH_SERVICE_URL}/internal/users/sessions/validate`;

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

function getToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`${JWT_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

async function getUser(req) {
  const token = getToken(req);
  if (!token) return null;
  return verifyToken(token);
}

async function validateSession(token) {
  try {
    const res = await fetch(SESSION_VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.user) return { ok: true, user: data.user };
    if (res.status === 401 && data.error) return { ok: false, status: 401, error: data.error };
    return { ok: false, status: 500, error: 'Session validation failed' };
  } catch {
    return { ok: false, status: 503, error: 'Session service unavailable' };
  }
}

function sessionCacheKey(payload) {
  return payload && payload.sid ? `sid:${payload.sid}` : null;
}

async function getAuthedUser(req) {
  const token = getToken(req);
  if (!token) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  const payload = await verifyToken(token);
  if (!payload) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  const key = sessionCacheKey(payload);
  if (key) {
    const cached = sessionCache.get(key);
    if (cached) return cached;
  }

  const result = await validateSession(token);
  if (!result.ok) {
    const err = new Error(result.error);
    err.status = result.status;
    throw err;
  }

  if (key) sessionCache.set(key, result.user);
  return result.user;
}

async function requireAuth(req, res, next) {
  try {
    req.user = await getAuthedUser(req);
    return next();
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const user = await getAuthedUser(req);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    return next();
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

module.exports = { requireAuth, requireAdmin, verifyToken, getUser, JWT_COOKIE };
