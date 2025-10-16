// Vercel-friendly database configuration
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Singleton sequelize instance
let sequelizeInstance = null;
let modelDefinitions = {};
let isInitialized = false;

// Initialize sequelize with explicit pg module loading
const initializeSequelize = async () => {
  if (sequelizeInstance && isInitialized) return sequelizeInstance;
  
  try {
    // This is critical for Vercel - explicitly load pg
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
        ...(process.env.DB_SSL === 'true' ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        } : {}),
        connectTimeout: 60000,
      },
      logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(msg) : false,
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
    
    // Define models immediately in development for backward compatibility
    if (process.env.NODE_ENV !== 'production') {
      defineModels();
    }
    
    return sequelizeInstance;
  } catch (error) {
    console.error('Failed to initialize Sequelize:', error);
    throw error;
  }
};

// Helper to define models - used for backward compatibility
const defineModels = () => {
  if (!sequelizeInstance) return;
  
  // This will define models explicitly in development mode
  // In production, models will be defined through the getModel function
  try {
    // Nothing to do here - models are defined by requiring them
  } catch (error) {
    console.error('Error defining models:', error);
  }
};

// Model definition function for use in production
const defineModel = (modelName, attributes, options) => {
  // Store model definition for later use
  modelDefinitions[modelName] = { attributes, options };
  
  // If sequelize is already initialized, define the model immediately
  if (sequelizeInstance && isInitialized) {
    console.log(`[defineModel] Defining model '${modelName}' immediately (sequelize ready)`);
    if (!sequelizeInstance.models[modelName]) {
      return sequelizeInstance.define(modelName, attributes, options);
    } else {
      console.log(`[defineModel] Model '${modelName}' already defined, returning existing`);
      return sequelizeInstance.models[modelName];
    }
  }
  
  // If we're in development, define immediately (backward compatibility)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[defineModel] Development mode - defining model '${modelName}' immediately`);
    return sequelizeInstance?.define(modelName, attributes, options) || createLazyProxy(modelName);
  }
  
  // In production before sequelize init, return a proxy that will lazily define the model
  console.log(`[defineModel] Production mode - creating lazy proxy for model '${modelName}'`);
  return createLazyProxy(modelName);
};

// Helper to create lazy proxy
const createLazyProxy = (modelName) => {
  return new Proxy({}, {
    get: function(target, prop) {
      // Ensure we have a model instance to work with
      if (!target.modelInstance) {
        if (!sequelizeInstance) {
          throw new Error(`Sequelize not initialized when accessing ${modelName}.${prop}`);
        }
        
        // Define model if it's not already defined
        if (!sequelizeInstance.models[modelName]) {
          const { attributes, options } = modelDefinitions[modelName];
          console.log(`[LazyProxy] Defining model '${modelName}' on first access`);
          target.modelInstance = sequelizeInstance.define(modelName, attributes, options);
        } else {
          target.modelInstance = sequelizeInstance.models[modelName];
        }
      }
      
      // Access the property on the model instance
      return target.modelInstance[prop];
    }
  });
};

// Get sequelize instance asynchronously - for use in production
const getSequelize = async () => {
  return await initializeSequelize();
};

// Helper to eagerly define all stored models
// Call this after Sequelize is initialized to convert lazy proxies to real models
const defineAllModels = () => {
  if (!sequelizeInstance || !isInitialized) {
    console.warn('[defineAllModels] Sequelize not initialized yet');
    return;
  }
  
  console.log('[defineAllModels] Defining all stored models...');
  const definedModels = [];
  
  for (const [modelName, { attributes, options }] of Object.entries(modelDefinitions)) {
    if (!sequelizeInstance.models[modelName]) {
      console.log(`[defineAllModels] Defining model: ${modelName}`);
      sequelizeInstance.define(modelName, attributes, options);
      definedModels.push(modelName);
    } else {
      console.log(`[defineAllModels] Model already defined: ${modelName}`);
    }
  }
  
  console.log(`[defineAllModels] Complete. Defined ${definedModels.length} models: ${definedModels.join(', ')}`);
  console.log(`[defineAllModels] Available models: ${Object.keys(sequelizeInstance.models).join(', ')}`);
};

// Initialize immediately for development mode
if (process.env.NODE_ENV !== 'production') {
  try {
    // For development, we try to initialize synchronously
    // This is to maintain backward compatibility with existing code
    const pg = require('pg');
    
    sequelizeInstance = new Sequelize({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      dialect: process.env.DB_DIALECT || 'postgres',
      dialectModule: pg,
      dialectOptions: {
        ...(process.env.DB_SSL === 'true' ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        } : {}),
        connectTimeout: 60000,
      },
      logging: (msg) => console.log(msg),
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
    
    isInitialized = true;
    console.log('Sequelize initialized synchronously for development');
  } catch (error) {
    console.error('Failed to initialize Sequelize synchronously:', error);
    // If sync init fails, don't throw - we'll use async init
  }
}

// Export the sequelize instance (which might be null in production)
// and helper functions
module.exports = {
  sequelize: sequelizeInstance,
  getSequelize,
  defineModel,
  defineAllModels
};
