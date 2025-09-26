
/**
 * Message Model
 * -------------
 * Represents messages linked to courses, degrees, or enrollments.
 * - Tracks sender, type, and reference entity
 * - Indexed for efficient querying

 */

const { DataTypes } = require('sequelize');
const { sequelize, defineModel } = require('../config/database');

const Message = defineModel('Message', {
  // Primary key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
  // Message type (course, degree, enrollment)
    type: DataTypes.ENUM('course', 'degree', 'enrollment'),
    allowNull: false,
  },
  reference_id: {
  // ID of the referenced entity
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'ID of the course, degree, or enrollment this message is linked to.'
  },
  sender_id: {
  // User who sent the message
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  message: {
  // Message content
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'messages',
  timestamps: true,
  // Indexes for efficient message queries
  indexes: [
    { fields: ['type', 'reference_id'] },
    { fields: ['sender_id'] },
  ],
});

module.exports = Message;
