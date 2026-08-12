// *************** IMPORT LIBRARY ***************
const jwt = require('jsonwebtoken');

// *************** IMPORT MODULE ***************
const config = require('../../core/config');

// *************** GLOBAL VARIABLES ***************
const JWT_SECRET = config.jwt.secret;

// *************** AUTH MIDDLEWARE ***************

/**
 * Express middleware that extracts and verifies the Bearer token.
 * Attaches the decoded payload to req.user if valid.
 * Leaves req.user undefined if token is missing or invalid.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware.
 */
function AuthMiddleware(req, res, next) {
  // *************** Extract Bearer token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      // *************** Verify token and attach decoded payload to req.user
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (_err) {
      // *************** Invalid token — leave req.user undefined
    }
  }
  // *************** Proceed to next middleware
  next();
}

// *************** EXPORT MODULE ***************
module.exports = AuthMiddleware;
