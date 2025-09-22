#!/usr/bin/env node

/**
 * Build-time script to ensure database schema exists
 * 
 * This script:
 * 1. Connects to the database
 * 2. Loads all models
 * 3. Synchronizes the models with the database (creates tables if they don't exist)
 * 4. Verifies model associations
 * 5. Runs basic validation queries to ensure the database is working correctly
 * 
 * Usage:
 * node scripts/ensure-database-schema.js
 * 
 * Required Environment Variables:
 * - DB_HOST: Database hostname or IP address
 * - DB_PORT: Database port (usually 5432 for PostgreSQL)
 * - DB_NAME: Database name
 * - DB_USER: Database username
 * - DB_PASSWORD: Database password
 * - DB_DIALECT: Database dialect (defaults to 'postgres')
 * - DB_SSL: Set to 'true' if SSL is required (typical for cloud databases)
 * 
 * On Vercel, set these environment variables in the Project Settings
 * under the "Environment Variables" section.
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { sequelize, getSequelize } = require('../config/database');

// Import all models
const models = require('../models');

// Initialize associations
const { initializeAssociations } = require('../models/associations');

async function ensureDatabaseSchema() {
  console.log('🔍 Starting database schema verification...');
  
  // Print environment variables (masking sensitive data)
  console.log('📌 Database Configuration:');
  console.log(`  - DB_HOST: ${process.env.DB_HOST ? process.env.DB_HOST.substring(0, 3) + '*****' : 'not set'}`);
  console.log(`  - DB_PORT: ${process.env.DB_PORT || 'not set'}`);
  console.log(`  - DB_NAME: ${process.env.DB_NAME || 'not set'}`);
  console.log(`  - DB_USER: ${process.env.DB_USER ? process.env.DB_USER.substring(0, 1) + '*****' : 'not set'}`);
  console.log(`  - DB_SSL: ${process.env.DB_SSL || 'not set'}`);
  console.log(`  - DB_DIALECT: ${process.env.DB_DIALECT || 'postgres (default)'}`);
  console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  
  try {
    // Get the Sequelize instance
    const db = sequelize || await getSequelize();
    
    // Print connection info
    console.log('📌 Sequelize Configuration:');
    console.log(`  - Dialect: ${db.getDialect()}`);
    console.log(`  - SSL Enabled: ${db.options.dialectOptions?.ssl ? 'Yes' : 'No'}`);
    
    // Test the database connection
    console.log('📡 Testing database connection...');
    await db.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Initialize model associations
    console.log('🔄 Initializing model associations...');
    initializeAssociations();
    console.log('✅ Model associations initialized.');
    
    // Sync models (create tables if they don't exist)
    console.log('🛠️ Synchronizing database models (creating tables if needed)...');
    await db.sync({ alter: false, force: false });
    console.log('✅ Database schema synchronized.');
    
    // Verify models by running basic queries
    console.log('🧪 Verifying models with test queries...');
    
    // Test User model
    const userCount = await models.User.count();
    console.log(`✅ User model verified. (${userCount} users in database)`);
    
    // Test Department model
    const departmentCount = await models.Department.count();
    console.log(`✅ Department model verified. (${departmentCount} departments in database)`);
    
    // Test Course model
    const courseCount = await models.Course.count();
    console.log(`✅ Course model verified. (${courseCount} courses in database)`);
    
    // Test Degree model
    const degreeCount = await models.Degree.count();
    console.log(`✅ Degree model verified. (${degreeCount} degrees in database)`);
    
    // Test Message model
    const messageCount = await models.Message.count();
    console.log(`✅ Message model verified. (${messageCount} messages in database)`);
    
    console.log('🎉 All database models verified successfully!');
    
    // All done!
    console.log('✅ Database schema verification completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database schema verification failed:', error);
    
    // Enhanced error reporting
    if (error.name === 'SequelizeConnectionRefusedError') {
      console.error('🔴 CONNECTION REFUSED: Could not connect to the database server.');
      console.error('   Please check that:');
      console.error('   1. Database host is correct and reachable');
      console.error('   2. Database port is open and accessible');
      console.error('   3. Network allows connections to the database');
    } else if (error.name === 'SequelizeConnectionError') {
      console.error('🔴 CONNECTION ERROR: Could not establish database connection.');
      console.error('   Details:', error.message);
    } else if (error.name === 'SequelizeHostNotFoundError') {
      console.error('🔴 HOST NOT FOUND: The database host could not be resolved.');
      console.error('   Please check the DB_HOST environment variable.');
    } else if (error.name === 'SequelizeAccessDeniedError') {
      console.error('🔴 ACCESS DENIED: Authentication failed.');
      console.error('   Please check your DB_USER and DB_PASSWORD environment variables.');
    } else if (error.name === 'SequelizeDatabaseError') {
      console.error('🔴 DATABASE ERROR: Operation on database failed.');
      console.error('   Details:', error.message);
    } else if (error.message && error.message.includes('Sequelize not initialized')) {
      console.error('🔴 SEQUELIZE NOT INITIALIZED: Database connection could not be established.');
      console.error('   Please check all database environment variables.');
    }
    
    process.exit(1);
  }
}

// Run the function
ensureDatabaseSchema();

// Run the function
ensureDatabaseSchema();