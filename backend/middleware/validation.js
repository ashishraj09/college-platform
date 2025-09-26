
/**
 * Validation Middleware
 * --------------------
 * Handles express-validator errors and returns consistent error responses.
 * - handleValidationErrors: checks for validation errors and responds with details
 * - Enterprise-grade maintainability
 */

const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

module.exports = {
  handleValidationErrors,
};
