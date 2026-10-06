function validateCreateStaff(req, res, next) {
  const body = req.body || {};
  if (!body.name || !body.email) {
    return res.status(400).json({ error: 'Name and email required' });
  }
  next();
}

function validateDeleteStaff(req, res, next) {
  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: 'id required' });
  }
  next();
}

module.exports = { validateCreateStaff, validateDeleteStaff };