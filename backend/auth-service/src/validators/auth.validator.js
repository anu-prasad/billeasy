function validateRegister(req, res, next) {
  const { name, email, password, shopName } = req.body || {};
  if (!name || !email || !password || !shopName) {
    return res.status(400).json({ error: 'All fields required' });
  }
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  next();
}

module.exports = { validateRegister, validateLogin };