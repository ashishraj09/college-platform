
/**
 * Enrollment Model
 * ----------------
 * Represents student enrollments in courses for a given academic year and semester.
 * - Tracks approval workflow and status
 * - Linked to User by student_id, hod_approved_by, office_approved_by
 * - Indexed for efficient querying

 */

const { DataTypes } = require('sequelize');
const { sequelize, defineModel } = require('../config/database');

const Enrollment = defineModel('Enrollment', {
  // Primary key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  student_id: {
  // Foreign key to User (student)
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  course_codes: {
  // Array of enrolled course codes
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of course codes for enrollment'
  },
  enrollment_status: {
  // Current status of the enrollment
    type: DataTypes.ENUM('draft', 'pending_hod_approval', 'pending_office_approval', 'approved', 'rejected', 'withdrawn'),
    defaultValue: 'draft',
  },
  submitted_at: {
  // When enrollment was submitted
    type: DataTypes.DATE,
    allowNull: true,
  },
  hod_approved_by: {
  // User who HOD-approved
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  hod_approved_at: {
  // When HOD approved
    type: DataTypes.DATE,
    allowNull: true,
  },
  office_approved_by: {
  // User who office-approved
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  office_approved_at: {
  // When office approved
    type: DataTypes.DATE,
    allowNull: true,
  },
  academic_year: {
  // Academic year (YYYY-YYYY)
    type: DataTypes.STRING(9),
    allowNull: false,
    validate: {
      is: /^\d{4}-\d{4}$/,
    },
  },
  semester: {
  // Semester number
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
    },
  },
  department_code: {
  // Department code for filtering
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Department code for HOD filtering'
  },
  // ...removed grade and grade_points fields...
}, {
  tableName: 'enrollments',
  timestamps: true,
  // Indexes for efficient enrollment queries
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
