'use strict';

const env = require('../config/env');

/**
 * Central error handler.
 * Produces: { error: { code, message, issues? } }
 * Never leaks stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isDev = env.aiMode !== undefined; // always defined; check NODE_ENV instead
  const isProd = process.env.NODE_ENV === 'production';

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  if (!isProd) {
    console.error('[error]', statusCode, code, err.stack || err.message);
  }

  const body = { error: { code, message } };
  if (err.issues) body.error.issues = err.issues;

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
