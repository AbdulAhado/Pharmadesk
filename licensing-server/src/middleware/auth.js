/**
 * JWT Authentication Middleware for PharmaDesk Admin API
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'PHARMADESK_ADMIN_JWT_SECRET_SUPER_SECURE_2026_XYZ';

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication session.' });
  }
}

module.exports = {
  requireAdminAuth,
  JWT_SECRET,
};

