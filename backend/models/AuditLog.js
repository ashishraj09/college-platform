
/**
 * AuditLog Model
 * --------------
 * Tracks all user actions for compliance, security, and auditing.
 * - Links to User by user_id (UUID)
 * - Records action, entity, before/after values, metadata, and context
 * - Used for enterprise-grade audit and compliance
 * - Indexed for efficient querying
 */

const { DataTypes } = require('sequelize');
const { sequelize, defineModel } = require('../config/database');

const AuditLog = defineModel('AuditLog', {
  // Primary key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
  // Foreign key to User
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  action: {
  // What action was performed
    type: DataTypes.ENUM(
      'create', 'update', 'delete', 'approve', 'reject', 'submit',
      'activate', 'deactivate', 'archive', 'login', 'logout',
      'password_change', 'email_verification', 'password_reset', 'read', 'add_collaborator', 'remove_collaborator'
    ),
    allowNull: false,
  },
  entity_type: {
  // What type of entity was affected
    type: DataTypes.ENUM('user', 'course', 'degree', 'department', 'enrollment', 'system'),
    allowNull: false,
  },
  entity_id: {
  // ID of the affected entity
    type: DataTypes.UUID,
    allowNull: true,
  },
  old_values: {
  // JSON snapshot before change
    type: DataTypes.JSON,
    allowNull: true,
  },
  new_values: {
  // JSON snapshot after change
    type: DataTypes.JSON,
    allowNull: true,
  },
  metadata: {
  // Extra metadata/context
    type: DataTypes.JSON,
    allowNull: true,
  },
  ip_address: {
  // IP address of user
    type: DataTypes.INET,
    allowNull: true,
  },
  user_agent: {
  // User agent string
    type: DataTypes.TEXT,
    allowNull: true,
  },
  description: {
  // Human-readable description
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  timestamps: true, // created_at and updated_at
  indexes: [
  // Indexes for efficient audit queries
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
