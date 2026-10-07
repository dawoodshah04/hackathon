'use strict';

/**
 * Factory: requireRole('ADMIN') or requireRole('ADMIN', 'MANAGER')
 * Must be used AFTER the auth middleware.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource' },
      });
    }
    next();
  };
}

module.exports = requireRole;
