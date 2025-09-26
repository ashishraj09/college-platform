/**
 * @file ensureAssociations.js
 * @description Express middleware to ensure Sequelize model associations are initialized.
 *              Critical for serverless environments where each request may start a new app instance.
 * @author
 * @date 2024
 * @enterprise-grade
 */

// Middleware to ensure model associations are initialized
// Especially important for serverless environments (e.g., Vercel, AWS Lambda)
// where each request may start a new instance of the application.

const { initializeAssociations } = require('../models/associations');

// Tracks whether associations have been initialized for this process
let associationsInitialized = false;

/**
 * Middleware to ensure Sequelize model associations are initialized before handling requests.
 * Only runs in production to avoid unnecessary overhead in development.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function ensureAssociations(req, res, next) {
  if (!associationsInitialized && process.env.NODE_ENV === 'production') {
    try {
      console.log('[ensureAssociations] Initializing model associations...');
      associationsInitialized = await initializeAssociations();
      console.log('[ensureAssociations] Model associations initialized:', associationsInitialized);
    } catch (error) {
      // Log error but do not block request; downstream DB errors will be more specific
      console.error('[ensureAssociations] Failed to initialize associations:', error);
    }
  }
  next();
}

module.exports = ensureAssociations;