// Collaborators Model
// ------------------
// Defines the join table for polymorphic collaborators (course/degree)

const { DataTypes } = require('sequelize');
const { sequelize, defineModel } = require('../config/database');

const Collaborator = defineModel('collaborators', {
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: { model: 'users', key: 'id' },
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
  },
  entity_type: {
    type: DataTypes.ENUM('course', 'degree'),
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'collaborators',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
});

module.exports = Collaborator;
