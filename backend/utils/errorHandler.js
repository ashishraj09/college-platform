/**
 * Standardized error response handler for API endpoints
 * Ensures consistent error format: { error: 'message' }
 */

/**
 * Send a standardized error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - User-friendly error message
 * @param {Error|string} [error] - Optional error object/details for logging
 */
function sendError(res, statusCode, message, error = null) {
  // Log error details for debugging
  if (error) {
    console.error(`[ERROR ${statusCode}] ${message}`, error);
  }

  // Send user-friendly error response
  // Always use { error: 'message' } format for frontend consistency
  res.status(statusCode).json({ error: message });
}

/**
 * Handle caught exceptions with appropriate status codes
 * @param {object} res - Express response object
 * @param {Error} error - Caught error object
 * @param {string} [fallbackMessage] - Fallback message if error has no message
 */
function handleCaughtError(res, error, fallbackMessage = 'Internal server error') {
  console.error('[CAUGHT ERROR]', error);

  // Handle Sequelize-specific errors
  if (error.name === 'SequelizeUniqueConstraintError') {
    return sendError(res, 409, 'A record with this value already exists');
  }

  if (error.name === 'SequelizeValidationError') {
    const validationErrors = error.errors.map(e => e.message).join(', ');
    return sendError(res, 400, `Validation error: ${validationErrors}`);
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return sendError(res, 400, 'Invalid reference: Related record does not exist');
  }

  if (error.name === 'SequelizeDatabaseError') {
    // Extract meaningful message from database error
    const dbMessage = error.message || error.original?.message || 'Database error';
    return sendError(res, 500, 'Database operation failed', dbMessage);
  }

  // Handle custom application errors (errors with statusCode property)
  if (error.statusCode) {
    return sendError(res, error.statusCode, error.message || fallbackMessage);
  }

  // Default to 500 for unknown errors
  sendError(res, 500, fallbackMessage, error.message);
}

module.exports = {
  sendError,
  handleCaughtError
};
