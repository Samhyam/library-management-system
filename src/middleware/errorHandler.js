// Central error handling: every error in the app ends up here and becomes a JSON response
// with the shape { error: { status, message, details } }.
const { AppError } = require('../utils/errors');

function notFound(req, res, next) {
  res.status(404).json({ error: { status: 404, message: `Route ${req.method} ${req.originalUrl} does not exist.`, details: [] } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { status: err.status, message: err.message, details: err.details } });
  }
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { status: 400, message: 'Request body is not valid JSON.', details: [] } });
  }
  // Database constraint safety net (should be caught earlier by the services)
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(409).json({ error: { status: 409, message: 'The request conflicts with existing data.', details: [] } });
  }
  console.error(err);
  res.status(500).json({ error: { status: 500, message: 'Unexpected server error.', details: [] } });
}

module.exports = { notFound, errorHandler };
