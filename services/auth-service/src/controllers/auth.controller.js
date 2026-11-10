const authService = require('../services/auth.service');
const {
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  JWT_COOKIE,
} = require('../middleware/auth.middleware');

async function register(req, res, next) {
  try {
    const token = await authService.register(req.body);
    setAuthCookie(res, token);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { token, user } = await authService.login(req.body);
    setAuthCookie(res, token);
    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`${JWT_COOKIE}=([^;]+)`));
  if (match) {
    const payload = await verifyToken(match[1]);
    if (payload && payload.sid) await authService.logout(payload.sid);
  }
  clearAuthCookie(res);
  return res.json({ success: true });
}

async function validateSession(req, res, next) {
  try {
    const { token } = req.body || {};
    const result = await authService.validateSession(token);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.json({ user: result.user });
  } catch (err) {
    return next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body);
    return res.json({ success: true, otp: result.otp, message: result.message });
  } catch (err) {
    return next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const result = await authService.verifyOtp(req.body);
    if (result.token) setAuthCookie(res, result.token);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function createUser(req, res, next) {
  try {
    await authService.createUser(req.body);
    return res.status(201).json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    await authService.deleteUser(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function suspendTenant(req, res, next) {
  try {
    await authService.suspendTenant(req.params.tenantId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function activateTenant(req, res, next) {
  try {
    await authService.activateTenant(req.params.tenantId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function deleteTenant(req, res, next) {
  try {
    await authService.deleteTenant(req.params.tenantId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
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