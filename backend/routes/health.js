const express = require('express');
const router = express.Router();
const { sequelize, getSequelize } = require('../config/database');

/**
 * @route   GET /api/health
 * @desc    Check if API and database are working
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    let dbConnected = false;
    let dbResponse = {};
    
    // Try to connect to the database
    try {
      // Use the correct method depending on environment
      const db = sequelize || await getSequelize();
      
      // Test database connection with a simple query
      const result = await db.query('SELECT NOW() as time');
      dbConnected = true;
      dbResponse = {
        status: 'connected',
        time: result[0][0]?.time || new Date().toISOString(),
        dialect: db.getDialect()
      };
    } catch (dbError) {
      dbConnected = false;
      dbResponse = {
        status: 'disconnected',
        error: dbError.message
      };
    }
    
    // Prepare response
    const healthStatus = {
      service: {
        status: 'running',
        uptime: process.uptime() + ' seconds',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      database: dbResponse
    };
    
    // Set appropriate status code based on database connection
    const statusCode = dbConnected ? 200 : 503; // 503 Service Unavailable if DB is down
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      service: { status: 'error', error: error.message },
      database: { status: 'unknown' }
    });
  }
});

module.exports = router;