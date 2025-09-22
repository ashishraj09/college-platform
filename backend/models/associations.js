// Vercel-friendly model associations
// This file creates model associations in a way that works in both
// traditional and serverless environments

const { getSequelize, sequelize } = require('../config/database');

// Import models
const User = require('./User');
const Department = require('./Department');
const Degree = require('./Degree');
const Course = require('./Course');
const Enrollment = require('./Enrollment');
const AuditLog = require('./AuditLog');
const Message = require('./Message');

// Track whether associations have been initialized
let associationsInitialized = false;

// Async function to initialize associations
async function initializeAssociations() {
  // If already initialized, don't do it again
  if (associationsInitialized) {
    console.log('Associations already initialized, skipping');
    return true;
  }
  
  try {
    // Ensure we have Sequelize initialized in production
    if (process.env.NODE_ENV === 'production') {
      await getSequelize();
    }
    
    console.log('Setting up model associations...');
    
    // Message associations
    Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    User.hasMany(Message, { foreignKey: 'sender_id', as: 'messages' });

    // User associations
    User.belongsTo(Department, { 
      foreignKey: 'department_id', 
      as: 'department',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    User.belongsTo(Degree, { 
      foreignKey: 'degree_id', 
      as: 'degree',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Department associations
    Department.hasMany(User, { 
      foreignKey: 'department_id', 
      as: 'users' 
    });

    Department.hasMany(Degree, { 
      foreignKey: 'department_id', 
      as: 'degrees' 
    });

    Department.hasMany(Course, { 
      foreignKey: 'department_id', 
      as: 'courses' 
    });

    // Degree associations
    Degree.belongsTo(Department, { 
      foreignKey: 'department_id', 
      as: 'department',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    Degree.hasMany(User, { 
      foreignKey: 'degree_id', 
      as: 'students' 
    });

    Degree.hasMany(Course, { 
      foreignKey: 'degree_id', 
      as: 'courses' 
    });

    // Match Course: add creator association for Degree
    Degree.belongsTo(User, { foreignKey: 'created_by', as: 'creator', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

    // Course associations
    Course.belongsTo(Department, { 
      foreignKey: 'department_id', 
      as: 'department',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    Course.belongsTo(Degree, { 
      foreignKey: 'degree_id', 
      as: 'degree',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    Course.belongsTo(User, { 
      foreignKey: 'created_by', 
      as: 'creator',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    Course.belongsTo(User, { 
      foreignKey: 'updated_by', 
      as: 'updater',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    Course.belongsTo(User, { 
      foreignKey: 'approved_by', 
      as: 'approver',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Enrollment associations
    Enrollment.belongsTo(User, { 
      foreignKey: 'student_id', 
      as: 'student',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    Enrollment.belongsTo(User, { 
      foreignKey: 'hod_approved_by', 
      as: 'hodApprover',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    Enrollment.belongsTo(User, { 
      foreignKey: 'office_approved_by', 
      as: 'officeApprover',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // User reverse associations for enrollments
    User.hasMany(Enrollment, { 
      foreignKey: 'student_id', 
      as: 'enrollments' 
    });

    User.hasMany(Course, { 
      foreignKey: 'created_by', 
      as: 'createdCourses' 
    });

    User.hasMany(Course, { 
      foreignKey: 'updated_by', 
      as: 'updatedCourses' 
    });

    User.hasMany(Course, { 
      foreignKey: 'approved_by', 
      as: 'approvedCourses' 
    });

    // Audit Log associations
    AuditLog.belongsTo(User, { 
      foreignKey: 'user_id', 
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    User.hasMany(AuditLog, { 
      foreignKey: 'user_id', 
      as: 'auditLogs' 
    });

    console.log('Model associations setup complete');
    associationsInitialized = true;
    return true;
  } catch (error) {
    console.error('Error setting up model associations:', error);
    return false;
  }
}

// Export the models and the initialization function
module.exports = {
  initializeAssociations
};