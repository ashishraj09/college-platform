const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Enrollment = sequelize.define('Enrollment', {
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
  course_ids: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    // Array of UUIDs for group enrollment
  },
  enrollment_status: {
    type: DataTypes.ENUM('pending_hod_approval', 'pending_office_approval', 'approved', 'rejected', 'withdrawn'),
    defaultValue: 'pending_hod_approval',
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
