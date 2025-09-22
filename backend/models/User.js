const { DataTypes, Op } = require('sequelize');
const { sequelize, defineModel } = require('../config/database');

// Use the proper adapter approach that works in both environments
const User = defineModel('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  first_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50],
    },
  },
  last_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50],
    },
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true,
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 255],
    },
  },
  user_type: {
    type: DataTypes.ENUM('student', 'faculty', 'office', 'admin'),
    allowNull: false,
  },
  student_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  },
  employee_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending', 'suspended'),
    defaultValue: 'pending',
  },
  degree_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'degrees',
      key: 'id',
    },
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  enrolled_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  enrolled_year: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1900,
      max: new Date().getFullYear() + 10,
    },
  },
  current_semester: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 8,
    },
  },
  is_head_of_department: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  email_verification_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  password_reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  password_reset_expires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email'],
    },
    {
      unique: true,
      fields: ['student_id'],
      where: {
        student_id: {
          [Op.ne]: null,
        },
      },
    },
    {
      unique: true,
      fields: ['employee_id'],
      where: {
        employee_id: {
          [Op.ne]: null,
        },
      },
    },
    {
      fields: ['user_type'],
    },
    {
      fields: ['department_id'],
    },
    {
      fields: ['degree_id'],
    },
  ],
  validate: {
    studentIdRequired() {
      if (this.user_type === 'student' && !this.student_id) {
        throw new Error('Student ID is required for student users');
      }
    },
    employeeIdRequired() {
      if (['faculty', 'office', 'admin'].includes(this.user_type) && !this.employee_id) {
        throw new Error('Employee ID is required for non-student users');
      }
    },
    degreeRequired() {
      if (this.user_type === 'student' && !this.degree_id) {
        throw new Error('Degree is required for student users');
      }
    },
    departmentRequired() {
      if (['student', 'faculty'].includes(this.user_type) && !this.department_id) {
        throw new Error('Department is required for students and faculty');
      }
    },
  },
});

module.exports = User;

module.exports = User;
