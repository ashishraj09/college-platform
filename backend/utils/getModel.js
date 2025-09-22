// Utility to always get the correct, initialized Sequelize model instance
const { getSequelize } = require('../config/database');

/**
 * Returns a promise that resolves to the requested model from the initialized Sequelize instance.
 * Usage: const User = await getModel('User');
 */
async function getModel(name) {
  const sequelize = await getSequelize();
  if (!sequelize || !sequelize.models[name]) {
    throw new Error(`Model '${name}' is not initialized or does not exist.`);
  }
  return sequelize.models[name];
}

module.exports = getModel;
