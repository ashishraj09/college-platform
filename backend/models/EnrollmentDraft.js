const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EnrollmentDraft = sequelize.define('EnrollmentDraft', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  student_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  academic_year: {
    type: DataTypes.STRING(9), // Format: 2024-2025
    allowNull: false,
    validate: {
      is: /^\d{4}-\d{4}$/,
    },
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 8,
    },
  },
  course_ids: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  is_submitted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'enrollment_drafts',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'academic_year', 'semester'],
      name: 'enrollment_drafts_student_academic_semester_unique'
    },
    {
      fields: ['student_id'],
    },
    {
      fields: ['academic_year'],
    },
    {
      fields: ['semester'],
    },
  ],
});

module.exports = EnrollmentDraft;
