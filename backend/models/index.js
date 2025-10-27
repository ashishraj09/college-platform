
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
const Collaborator = require('./Collaborator');


// Import and initialize associations
const { initializeAssociations } = require('./associations');


// Associations are now initialized ONCE at startup in server.js


// Export all models and association initializer
module.exports = {
  User,
  Department,
  Degree,
  Course,
  Enrollment,
  AuditLog,
  Message,
  Collaborator,
  initializeAssociations
};