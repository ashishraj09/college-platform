
/**
 * Models Index
 * ------------
 * Centralizes all model imports and association initialization.
 * - Imports all models
 * - Initializes associations for serverless and traditional environments
 * - Exports models and association initializer
 */

const User = require('./User');
const Department = require('./Department');
const Degree = require('./Degree');
const Course = require('./Course');
const Enrollment = require('./Enrollment');
const AuditLog = require('./AuditLog');
const Message = require('./Message');


// Import and initialize associations
const { initializeAssociations } = require('./associations');


// Association initialization logic
if (process.env.NODE_ENV !== 'production') {
  // Development: initialize associations immediately
  try {
    initializeAssociations();
    console.log('Model associations initialized successfully in development mode');
  } catch (error) {
    console.error('Failed to initialize associations in development mode:', error);
  }
} else {
  // Production: associations initialized on first request
  console.log('Production environment detected - associations will be initialized on first request');
}


// Export all models and association initializer
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