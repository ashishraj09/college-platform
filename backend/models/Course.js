const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 150],
    },
  },
  code: {
    type: DataTypes.STRING(15),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 15],
      isUppercase: true,
    },
  },
  overview: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [10, 2000],
    },
  },
  study_details: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  faculty_details: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
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
  prerequisites: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  max_students: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 500,
    },
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  degree_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'degrees',
      key: 'id',
    },
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
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
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'pending_approval', 'approved', 'pending_activation', 'active', 'disabled', 'archived'),
    defaultValue: 'draft',
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  parent_course_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'courses',
      key: 'id',
    },
  },
  is_latest_version: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_elective: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Virtual field to get the base course code without version suffix
  version_code: {
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
