// Modified for Vercel serverless environment
const { Sequelize } = require('sequelize');

// For Vercel serverless environment, we need to handle the pg module explicitly
let sequelizeInstance = null;
let isInitialized = false;

const initializeSequelize = async () => {
  if (isInitialized) return sequelizeInstance;
  
  try {
    // Explicitly require pg here to ensure it's included in the bundle
    // This is critical for Vercel serverless environment
    const pg = require('pg');
    console.log('PostgreSQL module loaded successfully');
    
    sequelizeInstance = new Sequelize({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      dialect: process.env.DB_DIALECT || 'postgres',
      dialectModule: pg, // Explicitly provide the pg module
      dialectOptions: {
        ...(process.env.NODE_ENV === 'production' && process.env.DB_SSL === 'true' ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        } : {}),
        connectTimeout: 60000,
      },
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5, // Reduced for serverless environment
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    });
    
    isInitialized = true;
    return sequelizeInstance;
  } catch (error) {
    console.error('Failed to initialize Sequelize:', error);
    throw error;
  }
};

const getSequelize = async () => {
  return await initializeSequelize();
};

// Create a synchronous sequelize object for backwards compatibility
// This is a hacky solution but works for development
// In production, we'll use the async approach
let sequelize = null;
if (process.env.NODE_ENV !== 'production') {
  // In development, initialize synchronously
  try {
    sequelizeInstance = new Sequelize({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      dialect: process.env.DB_DIALECT || 'postgres',
      dialectOptions: {
        connectTimeout: 60000,
      },
      logging: true,
      pool: {
        max: 10,
        min: 0,
        acquire: 60000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    });
    sequelize = sequelizeInstance;
    isInitialized = true;
    console.log('Sequelize initialized synchronously for development');
  } catch (error) {
    console.error('Failed to initialize Sequelize synchronously:', error);
    // If sync init fails, don't throw - we'll use async init
  }
}

// For backward compatibility with existing code
module.exports = { 
  sequelize,
  getSequelize
};
