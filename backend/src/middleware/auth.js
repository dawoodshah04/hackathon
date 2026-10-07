'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

/**
 * Verifies Bearer JWT, reloads user from DB, attaches req.user.
 * NEVER trusts a role or id from the request body/query.
 */
async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Missing or malformed Authorization header' },
      });
    }

    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token' },
      });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'User not found' },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = auth;
