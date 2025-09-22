#!/bin/bash

# Install required dependencies explicitly to ensure they're available
npm install pg pg-hstore sequelize

# Continue with normal installation
npm install

echo "Build completed successfully with all required dependencies"