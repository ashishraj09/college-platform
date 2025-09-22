// Utility to always get the correct, initialized Sequelize model instance
const { sequelize } = require('../config/database');

function getModel(name) {
  if (!sequelize || !sequelize.models[name]) {
    throw new Error(`Model '${name}' is not initialized or does not exist.`);
  }
  return sequelize.models[name];
}

module.exports = getModel;
