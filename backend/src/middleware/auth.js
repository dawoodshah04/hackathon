'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

// Every request is authenticated, and Atlas is a network round trip away, so the
// user lookup is cached briefly. Role or account changes apply within the TTL.
const USER_CACHE_TTL_MS = 60_000;
const userCache = new Map();

async function loadUser(id) {
  const key = String(id);
  const cached = userCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.user;

  const user = await User.findById(id);
  if (user) userCache.set(key, { user, expires: Date.now() + USER_CACHE_TTL_MS });
  else userCache.delete(key);
  return user;
}

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

    const user = await loadUser(payload.sub);
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
