
/**
 * Course Model
 * ------------
 * Represents academic courses offered by departments and degrees.
 * - Linked to Department and Degree by ID
 * - Tracks creation, approval, and versioning
 * - Indexed for efficient querying

 */

const { DataTypes } = require('sequelize');
const { sequelize, defineModel } = require('../config/database');

const Course = defineModel('Course', {
  // Primary key
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
  // Course name
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 150],
    },
  },
  code: {
  // Unique course code (uppercase)
    type: DataTypes.STRING(15),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 15],
      isUppercase: true,
    },
  },
  overview: {
  // Course overview/description
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 2000],
    },
  },
  study_details: {
  // JSON: study plan, syllabus, etc.
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  faculty_details: {
  // JSON: faculty info, assignments, etc.
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  credits: {
  // Number of credits
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
    },
  },
  semester: {
  // Semester offered
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
    },
  },
  prerequisites: {
  // List of prerequisite courses
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  max_students: {
  // Maximum allowed students
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 500,
    },
  },
  department_id: {
  // Foreign key to Department (DB primary key)
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id',
    },
    comment: 'Department ID for DB integrity. Use department_code for linking/querying.'
  },
  department_code: {
  // Foreign key to Department (code-based)
    type: DataTypes.STRING(10),
    allowNull: false,
    references: {
      model: 'departments',
      key: 'code',
    },
    validate: {
      notEmpty: true,
      len: [2, 10],
      isUppercase: true,
    },
    comment: 'Department code for code-based association.'
  },
  degree_id: {
  // Foreign key to Degree (DB primary key)
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'degrees',
      key: 'id',
    },
    comment: 'Degree ID for DB integrity. Use degree_code for linking/querying.'
  },
  degree_code: {
  // Foreign key to Degree (code-based)
    type: DataTypes.STRING(10),
    allowNull: false,
    references: {
      model: 'degrees',
      key: 'code',
    },
    validate: {
      notEmpty: true,
      len: [2, 10],
      isUppercase: true,
    },
    comment: 'Degree code for code-based association.'
  },
  created_by: {
  // User who created the course
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  updated_by: {
  // User who last updated the course
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  approved_by: {
  // User who approved the course
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  approved_at: {
  // When course was approved
    type: DataTypes.DATE,
    allowNull: true,
  },
  submitted_at: {
  // When course was submitted
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
  // Current status of the course
    type: DataTypes.ENUM('draft', 'submitted', 'pending_approval', 'approved', 'pending_activation', 'active', 'disabled', 'archived'),
    defaultValue: 'draft',
  },
  version: {
  // Version number
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  parent_course_id: {
  // For versioning: parent course
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'courses',
      key: 'id',
    },
  },
  is_latest_version: {
  // Is this the latest version?
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_elective: {
  // Is this course an elective?
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Virtual field to get the base course code without version suffix
  version_code: {
  // Virtual: base course code without version suffix
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.code) {
        return null;
      }
      // Always return the base course code without any version suffix
      // The version information is available separately in the `version` field
      return this.code.replace(/_V\d+$/, '');
    },
  },
}, {
  tableName: 'courses',
  timestamps: true,
  // Indexes for efficient course queries
  indexes: [
    {
      unique: true,
      fields: ['code', 'version'],
      name: 'unique_code_version'
    },
    {
      fields: ['department_id'],
    },
    {
      fields: ['degree_id'],
    },
    {
      fields: ['created_by'],
    },
    {
      fields: ['updated_by'],
    },
    {
      fields: ['approved_by'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['semester'],
    },
    {
      fields: ['name'],
    },
  ],
});

module.exports = Course;
