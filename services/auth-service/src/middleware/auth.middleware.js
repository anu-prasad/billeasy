const { SignJWT, jwtVerify } = require('jose');
const config = require('../config/env');

const SECRET = new TextEncoder().encode(config.JWT_SECRET);
const JWT_COOKIE = 'billeasy_token';

async function signToken(payload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

async function getUser(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`${JWT_COOKIE}=([^;]+)`));
  if (!match) return null;
  return verifyToken(match[1]);
}

async function requireAdmin(req, res, next) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  req.user = user;
  next();
}

function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie', [
    `${JWT_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`,
  ]);
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', [
    `${JWT_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
  ]);
}

module.exports = { signToken, verifyToken, getUser, requireAdmin, setAuthCookie, clearAuthCookie, JWT_COOKIE };