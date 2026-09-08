function notFound(req, res, next) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Expected 4xx errors are not worth a stack trace.
  if (!err.status || err.status >= 500) console.error(err);

  // PostgreSQL error codes
  switch (err.code) {
    case '23505': // unique_violation
      return res.status(409).json({ error: 'Duplicate value', detail: err.detail });
    case '23503': // foreign_key_violation
      return res.status(400).json({ error: 'Related record not found' });
    case '23502': // not_null_violation
      return res.status(400).json({ error: `Missing required field: ${err.column}` });
    case '23514': // check_violation
      return res.status(400).json({ error: 'Value failed a validation constraint' });
    case '22P02': // invalid_text_representation (e.g. bad integer id)
      return res.status(400).json({ error: 'Invalid input syntax' });
    default:
      break;
  }

  res.status(err.status || 500).json({ error: err.message || 'Server error' });
}

module.exports = { notFound, errorHandler };
