
/**
 * Department Model
 * ----------------
 * Represents academic departments in the institution.
 * - Unique name and code
 * - Tracks status and description
 * - Indexed for efficient querying

 */

const { DataTypes } = require('sequelize');
const { sequelize, defineModel } = require('../config/database');

const Department = defineModel('Department', {
  // Primary key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
  // Department name
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 100],
    },
  },
  code: {
  // Unique department code (uppercase)
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 10],
      isUppercase: true,
    },
  },
  description: {
  // Department description
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
  // Current status of the department
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
}, {
  tableName: 'departments',
  timestamps: true,
  // Indexes for efficient department queries
  indexes: [
    {
      unique: true,
      fields: ['name'],
    },
    {
      unique: true,
      fields: ['code'],
    },
    {
      fields: ['status'],
    },
  ],
});

module.exports = Department;
