const express = require('express');
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

const { sequelize } = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const departmentRoutes = require('./routes/departments');
const degreeRoutes = require('./routes/degrees');
const enrollmentRoutes = require('./routes/enrollments');
const auditRoutes = require('./routes/audit');

const app = express();
// Disable ETag to prevent 304 Not Modified responses
app.set('etag', false);

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/degrees', degreeRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/audit', auditRoutes);
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
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Sync database models
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('Database models synced successfully.');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
