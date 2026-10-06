function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
    return res.status(status).json({ error: err.expose ? err.message : 'Server error' });
  }

  return res.status(status).json({ error: err.message });
}

module.exports = { errorHandler };