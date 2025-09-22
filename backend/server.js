const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Load environment configuration
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.join(__dirname, envFile) });

// Create Express app
const app = express();
app.use(cookieParser());
// Disable ETag to prevent 304 Not Modified responses
app.set('etag', false);

// Import database with appropriate connection method
const { sequelize, getSequelize } = require('./config/database');
// Load models before routes to ensure models are defined
const models = require('./models');

// In production, we need to ensure model associations are set up
// for Vercel's serverless environment
let associationsInitialized = false;
if (process.env.NODE_ENV === 'production') {
  console.log('Production environment detected - initializing model associations on first request');
  // Import the association module directly
  const { initializeAssociations } = require('./models/associations');
  
  // Will be called on first request
  app.use(async (req, res, next) => {
    if (!associationsInitialized) {
      try {
        console.log('Setting up model associations on first request');
        associationsInitialized = await initializeAssociations();
      } catch (error) {
        console.error('Failed to initialize associations:', error);
      }
    }
    next();
  });
} else {
  // In development, associations are initialized synchronously when models are loaded
  console.log('Development environment - associations initialized during startup');
}

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const departmentRoutes = require('./routes/departments');
const degreeRoutes = require('./routes/degrees');
const enrollmentRoutes = require('./routes/enrollments');
const enrollmentDraftRoutes = require('./routes/enrollments-draft');
const enrollmentHodRoutes = require('./routes/enrollments-hod');
const enrollmentNewRoutes = require('./routes/enrollment');

// Request/response logger middleware
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

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for development
  skip: process.env.NODE_ENV === 'development' ? () => false : undefined,
});

// Only apply rate limiting to API routes, and be more lenient in development  
if (process.env.NODE_ENV !== 'development') {
  app.use('/api/', limiter);
}

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-User-Department', 'X-User-Id'],
  preflightContinue: false,
};
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

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
    
    try {
      // Use the correct method depending on environment
      const db = sequelize || await getSequelize();
      
      // Test database connection with a simple query
      await db.query('SELECT 1');
      dbStatus = 'connected';
      dbMessage = 'Database connection successful';
    } catch (dbError) {
      dbStatus = 'disconnected';
      dbMessage = dbError.message;
    }
    
    // Prepare and send response
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: {
        status: dbStatus,
        message: dbMessage
      }
    };
    
    // If database is not connected, use 503 status code
    const statusCode = dbStatus === 'connected' ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/degrees', degreeRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/enrollments-draft', enrollmentDraftRoutes);
app.use('/api/enrollments-hod', enrollmentHodRoutes);
app.use('/api/enrollment', enrollmentNewRoutes);
const timelineRoutes = require('./routes/timeline');
app.use('/api/timeline', timelineRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors,
    });
  }
  
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Database Validation Error',
      details: err.errors.map(e => ({ field: e.path, message: e.message })),
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
    });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

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
        console.log(`🔒 SSL Enabled: ${process.env.DB_SSL}`);
      });
    }
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

// Run the server for local development
if (process.env.NODE_ENV !== 'production') {
  startServer();
}

// For Vercel serverless deployment, we need to initialize the database on each request
app.use(async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    try {
      // Only initialize the database connection when needed
      const dbInstance = await getSequelize();
      req.sequelize = dbInstance; // Attach to request for later use if needed
      next();
    } catch (error) {
      console.error('Error initializing database in middleware:', error);
      res.status(500).json({ error: 'Database connection error', details: error.message });
    }
  } else {
    next();
  }
});

// Export for Vercel serverless deployment
module.exports = app;
