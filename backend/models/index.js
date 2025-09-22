// Import models
const User = require('./User');
const Department = require('./Department');
const Degree = require('./Degree');
const Course = require('./Course');
const Enrollment = require('./Enrollment');
const AuditLog = require('./AuditLog');
const Message = require('./Message');

// Always import the associations module
const { initializeAssociations } = require('./associations');

// In development, immediately initialize associations synchronously
// This ensures they're ready before any routes are accessed
if (process.env.NODE_ENV !== 'production') {
  console.log('Development environment - initializing associations immediately');
  // Run the initialization function synchronously in development
  try {
    initializeAssociations();
    console.log('Model associations initialized successfully in development mode');
  } catch (error) {
    console.error('Failed to initialize associations in development mode:', error);
  }
} else {
  // In production, we'll set up associations asynchronously when needed
  console.log('Production environment detected - associations will be initialized on first request');
}

// Export all models
module.exports = {
  User,
  Department,
  Degree,
  Course,
  Enrollment,
  AuditLog,
  Message,
  initializeAssociations
};