const { DataTypes } = require('sequelize');
const { sequelize, defineModel } = require('../config/database');

const AuditLog = defineModel('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  action: {
    type: DataTypes.ENUM(
      'create', 'update', 'delete', 'approve', 'reject', 'submit',
      'activate', 'deactivate', 'archive', 'login', 'logout',
      'password_change', 'email_verification', 'password_reset'
    ),
    allowNull: false,
  },
  entity_type: {
    type: DataTypes.ENUM('user', 'course', 'degree', 'department', 'enrollment', 'system'),
    allowNull: false,
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  old_values: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  new_values: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.INET,
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  timestamps: true, // Ensure created_at and updated_at are present
  indexes: [
    {
      fields: ['user_id'],
    },
    {
      fields: ['action'],
    },
    {
      fields: ['entity_type'],
    },
    {
      fields: ['entity_id'],
    },
    {
      fields: ['created_at'],
    },
    {
      fields: ['user_id', 'created_at'],
    },
  ],
});

module.exports = AuditLog;
