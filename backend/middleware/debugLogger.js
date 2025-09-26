
/**
 * Debug Logger Middleware
 * ----------------------
 * Logs request and response details for debugging purposes.
 * - Only active if DEBUG env variable is true
 * - Logs method, URL, body, params, query, and user info
 * - Logs response payload
 * - Enterprise-grade maintainability
 */

const DEBUG = process.env.DEBUG === 'true';

module.exports = function debugLogger(req, res, next) {
  if (!DEBUG) return next();

  // Log request details
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  console.log('[DEBUG] Request body:', req.body);
  console.log('[DEBUG] Request params:', req.params);
  console.log('[DEBUG] Request query:', req.query);
  if (req.user) {
    console.log('[DEBUG] User:', {
      id: req.user.id,
      email: req.user.email,
      user_type: req.user.user_type,
      department_code: req.user.department_code,
      is_head_of_department: req.user.is_head_of_department
    });
  }

  // Capture response payload
  const oldJson = res.json;
  res.json = function (data) {
    console.log('[DEBUG] Response payload:', data);
    return oldJson.call(this, data);
  };

  next();
};
