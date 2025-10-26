
/**
 * Degree Model
 * ------------
 * Represents academic degrees offered by departments.
 * - Linked to Department by ID
 * - Tracks creation, approval, versioning, and workflow
 * - Indexed for efficient querying

 */

const { DataTypes } = require('sequelize');
const { sequelize, defineModel } = require('../config/database');

const Degree = defineModel('Degree', {
  id: {
  // Primary key
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
  // Degree name
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100],
    },
  },
  code: {
  // Unique degree code (uppercase)
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 20],
      isUppercase: true,
    },
  },
  description: {
    // Degree description
    type: DataTypes.TEXT,
    allowNull: true,
  },
  specializations: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  career_prospects: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  admission_requirements: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  accreditation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fees: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  entry_requirements: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  learning_outcomes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  assessment_methods: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  contact_information: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  application_deadlines: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  application_process: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  duration_years: {
  // Number of years
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 10,
    },
  },
  parent_degree_id: {
  // For versioning: parent degree
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'degrees',
      key: 'id',
    },
  },
  courses_per_semester: {
  // JSON: courses per semester
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'JSON object storing number of courses per semester. Format: {"1": 6, "2": 7, "3": 5, ...}',
  },
  department_code: {
  // Code-based association to Department (no DB constraint)
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 10],
      isUppercase: true,
    },
    comment: 'Department code for code-based association.'
  },
  status: {
  // Current status of the degree
    type: DataTypes.ENUM('draft', 'submitted', 'pending_approval', 'approved', 'pending_activation', 'active', 'disabled', 'archived'),
    defaultValue: 'draft',
  },
    prerequisites: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Rich text/HTML for prerequisites.'
    },
    study_details: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Rich text/HTML for study details.'
    },
    faculty_details: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Rich text/HTML for faculty info.'
    },
    version: {
  // Current version
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Current version of the degree.'
    },
    approved_at: {
  // When degree was approved
      type: DataTypes.DATE,
      allowNull: true,
    },
    submitted_at: {
  // When degree was submitted
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_latest_version: {
  // Is this the latest version?
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_elective: {
  // Is this degree an elective?
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    version_code: {
  // Virtual: base degree code without version suffix
      type: DataTypes.VIRTUAL,
      get() {
        if (!this.code) {
          return null;
        }
        return this.code.replace(/_V\d+$/, '');
      },
    },
    created_by: {
  // User who created the degree
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    updated_by: {
  // User who last updated the degree
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    approved_by: {
  // User who approved the degree
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
  // Indexes for efficient degree queries
  indexes: [
    {
      fields: ['code'],
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
