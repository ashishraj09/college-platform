
/**
 * College Platform API Server
 * --------------------------
 * Enterprise-grade Express backend for course management system.
 * - Unified startup for serverless and traditional modes
 * - Industry-standard middleware and error handling
 * - Secure, maintainable, and scalable
 *
 * Author: [Your Name/Team]
 * Date: 2025
 */

// --------------------
// Module Imports
// --------------------
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// --------------------
// Environment Setup
// --------------------
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.join(__dirname, envFile) });

// --------------------
// Express App Setup
// --------------------
const app = express();
app.use(cookieParser());
app.set('etag', false); // Disable ETag to prevent 304 Not Modified responses
app.set('trust proxy', true); // Trust proxy for rate limiting behind proxies

// --------------------
// Database & Models
// --------------------
const { sequelize, getSequelize } = require('./config/database');
const models = require('./models');
const { initializeAssociations } = require('./models/associations');

// --------------------
// Startup Initialization
// --------------------
const runMode = process.env.RUN_MODE === 'serverless' ? 'serverless' : 'traditional';
let associationsInitialized = false;
async function startupInitialization() {
  if (!associationsInitialized) {
    try {
      console.log(`[Startup] Initializing model associations for mode: ${runMode}`);
      await initializeAssociations();
      associationsInitialized = true;
      console.log('[Startup] Model associations initialized successfully');
    } catch (error) {
      console.error('[Startup] Failed to initialize model associations:', error);
    }
  } else {
    console.log('[Startup] Associations already initialized, skipping');
  }
}
startupInitialization();

// --------------------
// Route Imports
// --------------------
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const departmentRoutes = require('./routes/departments');
const degreeRoutes = require('./routes/degrees');
const enrollmentRoutes = require('./routes/enrollments');
const enrollmentNewRoutes = require('./routes/enrollment');
const timelineRoutes = require('./routes/timeline');

// --------------------
// Request/Response Logging
// --------------------
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`\n--- Incoming Request ---`);
  console.log(`${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length) {
    console.log('Body:', req.body);
  }
  // Capture response
  const oldJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - start;
    console.log(`--- Outgoing Response (${duration}ms) ---`);
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    return oldJson.call(this, data);
  };
  next();
});


// --------------------
// Security Middleware
// --------------------
app.use(helmet()); // Sets secure HTTP headers

// --------------------
// Rate Limiting
// --------------------
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: process.env.NODE_ENV === 'development' ? () => true : undefined, // Skip in development
  keyGenerator: ipKeyGenerator, // IPv6 support
});
if (process.env.NODE_ENV !== 'development') {
  app.use('/api/', limiter);
}

// --------------------
// CORS Configuration
// --------------------
const corsOptions = {
  origin: [process.env.FRONTEND_URL],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-User-Department', 'X-User-Id'],
  preflightContinue: false,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

// --------------------
// Body Parsing
// --------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --------------------
// Compression
// --------------------
app.use(compression());

// --------------------
// Logging Middleware
// --------------------
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// --------------------
// API Endpoints
// --------------------

// Root endpoint - provides basic API information
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'College Platform API',
    version: '1.0.0',
    description: 'Backend API for College Platform - Enterprise course management system',
    environment: process.env.NODE_ENV || 'development',
    documentation: '/api-docs',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      users: '/api/users',
      courses: '/api/courses',
      departments: '/api/departments',
      degrees: '/api/degrees',
      enrollments: '/api/enrollments'
    }
  });
});

// Health check endpoint with database connection test
app.get('/health', async (req, res) => {
  try {
    // Try to connect to the database
    let dbStatus = 'disconnected';
    let dbMessage = null;
    let dbDetails = null;
    
    try {
      // Use the correct method depending on environment
      const db = sequelize || await getSequelize();
      
      // Test database connection with a simple query
      const [result] = await db.query('SELECT 1 as connected, current_timestamp as time');
      dbStatus = 'connected';
      dbMessage = 'Database connection successful';
      dbDetails = {
        dialect: db.getDialect(),
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        ssl_enabled: process.env.DB_SSL === 'true' ? 'true' : 'false',
        ssl_active: db.config.dialectOptions?.ssl ? 'true' : 'false',
        time: result[0]?.time
      };
    } catch (dbError) {
      dbStatus = 'disconnected';
      dbMessage = dbError.message;
      dbDetails = {
        error: dbError.name,
        stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      };
    }
    
    // Get CORS configuration info
    const corsInfo = {
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      allowedOrigins: corsOptions.origin,
      currentHost: req.headers.host,
      requestOrigin: req.headers.origin
    };
    
    // Get server info
    const serverInfo = {
      nodeEnv: process.env.NODE_ENV,
      port: PORT,
      isVercel: !!process.env.VERCEL
    };
    
    // Prepare and send response
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      server: serverInfo,
      cors: corsInfo,
      database: {
        status: dbStatus,
        message: dbMessage,
        details: dbDetails
      }
    };
    
    // If database is not connected, use 503 status code
    const statusCode = dbStatus === 'connected' ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// --------------------
// API Routes
// --------------------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/degrees', degreeRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/enrollment', enrollmentNewRoutes);
app.use('/api/timeline', timelineRoutes);

// --------------------
// Error Handling
// --------------------
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors,
      stack: err.stack
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Database Validation Error',
      details: err.errors.map(e => ({ field: e.path, message: e.message })),
      stack: err.stack
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      stack: err.stack
    });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    stack: err.stack
  });
});

// --------------------
// 404 Handler
// --------------------
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

// --------------------
// Server Startup Logic
// --------------------
const PORT = process.env.PORT || 5000;

// Database connection and server startup
const startServer = async () => {
  try {
    let dbInstance;
    
    // In development, we can use the synchronous connection
    if (process.env.NODE_ENV !== 'production' && sequelize) {
      dbInstance = sequelize;
    } else {
      // In production or if sync init failed, use async connection
      dbInstance = await getSequelize();
    }
    
    // Test database connection
    await dbInstance.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync database models
    if (process.env.NODE_ENV !== 'production') {
      await dbInstance.sync({ alter: true });
      console.log('Database models synced successfully.');
    }
    
    // Only start the server directly in non-production environments
    // For Vercel, we'll export the app
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
        console.log(`📊 Database connection: ${process.env.DB_DIALECT}://${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
        console.log(`🔒 SSL Enabled: ${process.env.DB_SSL === 'true' ? 'Yes' : 'No'}`);
      });
    }
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

// Start server only in traditional mode
if (runMode === 'traditional') {
  startServer();
}

// For serverless deployment, initialize the database on each request
app.use(async (req, res, next) => {
  if (runMode === 'serverless') {
    try {
      const dbInstance = await getSequelize();
      req.sequelize = dbInstance;
      next();
    } catch (error) {
      console.error('Error initializing database in middleware:', error);
      res.status(500).json({ error: 'Database connection error', details: error.message });
    }
  } else {
    next();
  }
});

// Export for serverless deployment
module.exports = app;
