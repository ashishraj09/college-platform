const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Degree = sequelize.define('Degree', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100],
    },
  },
  code: {
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
    type: DataTypes.TEXT,
    allowNull: true,
  },
  duration_years: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
    },
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'pending_approval', 'approved', 'pending_activation', 'active', 'disabled', 'archived'),
    defaultValue: 'draft',
  },
}, {
  tableName: 'degrees',
  indexes: [
    {
      unique: true,
      fields: ['code'],
    },
    {
      fields: ['department_id'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['name'],
    },
  ],
});

module.exports = Degree;
