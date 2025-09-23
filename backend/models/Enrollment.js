const { DataTypes } = require('sequelize');
const { sequelize, defineModel } = require('../config/database');

const Enrollment = defineModel('Enrollment', {
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
  course_codes: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of course codes for enrollment'
  },
  enrollment_status: {
    type: DataTypes.ENUM('draft', 'pending_hod_approval', 'pending_office_approval', 'approved', 'rejected', 'withdrawn'),
    defaultValue: 'draft',
  },
  is_submitted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Flag to track if a draft has been submitted for approval'
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  hod_approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  hod_approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  office_approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  office_approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  academic_year: {
    type: DataTypes.STRING(9),
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
      max: 10,
    },
  },
  department_code: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Department code for HOD filtering'
  },
  // ...removed grade and grade_points fields...
}, {
  tableName: 'enrollments',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'academic_year', 'semester'],
    },
    {
      fields: ['student_id'],
    },
    {
      fields: ['enrollment_status'],
    },
    {
      fields: ['hod_approved_by'],
    },
    {
      fields: ['office_approved_by'],
    },
    {
      fields: ['academic_year'],
    },
    {
      fields: ['semester'],
    },
  ],
});

module.exports = Enrollment;
