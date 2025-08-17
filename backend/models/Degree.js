const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Degree = sequelize.define('Degree', {
  comments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of comment objects for conversation timeline.'
  },
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100],
    },
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 10],
      isUppercase: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  duration_years: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
    },
  },
  courses_per_semester: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'JSON object storing number of courses per semester. Format: {"1": 6, "2": 7, "3": 5, ...}',
  },
  enrollment_start_dates: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'JSON object storing enrollment start date per semester. Format: {"1": "2025-08-01T09:00:00Z", "2": "...", ...}',
  },
  enrollment_end_dates: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'JSON object storing enrollment end date per semester. Format: {"1": "2025-08-20T17:00:00Z", "2": "...", ...}',
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'pending_approval', 'approved', 'pending_activation', 'active', 'disabled', 'archived'),
    defaultValue: 'draft',
  },
    prerequisites: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of course or degree IDs required as prerequisites.'
    },
    study_details: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'JSON object for study mode, location, etc.'
    },
    faculty_details: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'JSON object for faculty info.'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Current version of the degree.'
    },
    version_history: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of previous versions with metadata.'
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Feedback from reviewers/approvers.'
    },
    approval_history: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of approval workflow actions.'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
}, {
  tableName: 'degrees',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['code'],
    },
    {
      fields: ['department_id'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['name'],
    },
  ],
});

module.exports = Degree;
