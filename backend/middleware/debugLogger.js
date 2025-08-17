// Centralized debug logger middleware
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
      department_id: req.user.department_id,
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
