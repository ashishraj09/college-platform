// Middleware to ensure model associations are initialized
// This is especially important for serverless environments where each request
// might start a new instance of the application

const { initializeAssociations } = require('../models/associations');

// Track initialization status
let associationsInitialized = false;

async function ensureAssociations(req, res, next) {
  if (!associationsInitialized && process.env.NODE_ENV === 'production') {
    try {
      console.log('Ensuring model associations are initialized before database query');
      associationsInitialized = await initializeAssociations();
      console.log('Model associations check complete, status:', associationsInitialized);
    } catch (error) {
      console.error('Failed to initialize associations in middleware:', error);
      // Continue processing even if initialization fails
      // This allows the actual database query to fail with a more specific error
    }
  }
  next();
}

module.exports = ensureAssociations;