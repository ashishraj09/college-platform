const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.ENUM('course', 'degree', 'enrollment'),
    allowNull: false,
  },
  reference_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'ID of the course, degree, or enrollment this message is linked to.'
  },
  sender_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'messages',
  timestamps: true,
  indexes: [
    { fields: ['type', 'reference_id'] },
    { fields: ['sender_id'] },
  ],
});

module.exports = Message;
