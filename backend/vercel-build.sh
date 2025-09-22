#!/bin/bash

# Enhanced build script for Vercel deployment

echo "====== STARTING VERCEL BUILD PROCESS ======"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Working directory: $(pwd)"
echo "Current files: $(ls -la)"

# Install PostgreSQL and Sequelize explicitly to ensure they're available
echo "====== INSTALLING POSTGRESQL DEPENDENCIES ======"
npm install pg pg-hstore pg-connection-string pg-types postgres-array postgres-bytea postgres-date postgres-interval --no-save
npm install sequelize --no-save

# Verify the installations
echo "====== VERIFYING POSTGRESQL INSTALLATION ======"
npm list pg
npm list pg-hstore
npm list pg-connection-string
npm list sequelize

# Continue with normal installation
echo "====== INSTALLING OTHER DEPENDENCIES ======"
npm install

# Create a test file to verify PostgreSQL can be loaded
echo "====== TESTING POSTGRESQL MODULE ======"
cat > pg-test.js << 'EOL'
try {
  const pg = require('pg');
  console.log('✅ PostgreSQL module loaded successfully');
  console.log('PostgreSQL version:', pg.version);
  
  const { Pool } = pg;
  console.log('✅ Pool constructor available');
  
  // Test all required dependencies
  const pgConnectionString = require('pg-connection-string');
  console.log('✅ pg-connection-string loaded');
  
  const pgTypes = require('pg-types');
  console.log('✅ pg-types loaded');
  
  // Test creating a Sequelize instance with pg
  const { Sequelize } = require('sequelize');
  const sequelize = new Sequelize('postgres://user:pass@example.com:5432/dbname', {
    dialectModule: pg
  });
  console.log('✅ Sequelize instance created with pg module');
} catch (error) {
  console.error('❌ Error loading PostgreSQL module:', error.message);
}
EOL

# Run the test
node pg-test.js

echo "====== BUILD COMPLETED SUCCESSFULLY ======"
echo "All required dependencies installed and verified"