
/**
 * Sequelize Model Associations
 * ---------------------------
 * Centralizes all model relationships for serverless and traditional environments.
 * - Only code-based associations for User (department_code, degree_code)
 * - All other models use ID-based associations unless migrated
 * - Error handling and initialization logic for serverless compatibility
 * - AuditLog, Message, Enrollment, Course, Degree, Department associations grouped and documented
 *
 * Standards:
 * - Clean, maintainable, and well-documented
 * - No legacy or unused associations
 * - No global state or side effects
 * - All associations grouped by model
 */

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
  // --------------------
  // Message associations
  // --------------------
  // Each message belongs to a sender (User)
  // Each user can have many sent messages
  // --------------------
  // User associations
  // --------------------
  // User associations: now use department_code and degree_code fields only
  // If you want to associate User with Department/Degree, use custom logic or scopes on code fields
  // --------------------
  // Department associations
  // --------------------
  // If already initialized, don't do it again
  if (associationsInitialized) {
    console.log('Associations already initialized, skipping');
    return true;
  }
  
  try {
    // Ensure we have Sequelize initialized in production
    if (process.env.NODE_ENV === 'production') {
      console.log('Production: Getting Sequelize instance before setting up associations');
      await getSequelize();
    }
    
    console.log('Setting up model associations...');
    
    // Message associations
    Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    User.hasMany(Message, { foreignKey: 'sender_id', as: 'messages' });

    // User associations
    // User associations: now use department_code and degree_code fields only
    // If you want to associate User with Department/Degree, use custom logic or scopes on code fields

    // Department associations
    // Department.hasMany(User) association removed. Use department_code for queries and custom logic.

    // Each department has many degrees and courses (ID-based)
    Department.hasMany(Degree, { foreignKey: 'department_id', as: 'degrees' });
    Department.hasMany(Course, { foreignKey: 'department_id', as: 'courses' });
  // --------------------
  // Degree associations
  // --------------------
  // Each degree belongs to a department (ID-based)
  Degree.belongsTo(Department, { foreignKey: 'department_id', as: 'department', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  // Each degree has many students and courses (ID-based)
  Degree.hasMany(User, { foreignKey: 'degree_id', as: 'students' });
  Degree.hasMany(Course, { foreignKey: 'degree_id', as: 'courses' });
  // Each degree has a creator (User)
  Degree.belongsTo(User, { foreignKey: 'created_by', as: 'creator', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  // --------------------
  // Course associations
  // --------------------
  // Each course belongs to a department and degree (ID-based)
  Course.belongsTo(Department, { foreignKey: 'department_id', as: 'department', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Course.belongsTo(Degree, { foreignKey: 'degree_id', as: 'degree', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  // Each course has a creator, updater, and approver (User)
  Course.belongsTo(User, { foreignKey: 'created_by', as: 'creator', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  Course.belongsTo(User, { foreignKey: 'updated_by', as: 'updater', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Course.belongsTo(User, { foreignKey: 'approved_by', as: 'approver', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  // --------------------
  // Enrollment associations
  // --------------------
  // Each enrollment belongs to a student, HOD approver, and office approver (User)
  Enrollment.belongsTo(User, { foreignKey: 'student_id', as: 'student', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  Enrollment.belongsTo(User, { foreignKey: 'hod_approved_by', as: 'hodApprover', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Enrollment.belongsTo(User, { foreignKey: 'office_approved_by', as: 'officeApprover', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  // User reverse associations for enrollments and courses
  User.hasMany(Enrollment, { foreignKey: 'student_id', as: 'enrollments' });
  User.hasMany(Course, { foreignKey: 'created_by', as: 'createdCourses' });
  User.hasMany(Course, { foreignKey: 'updated_by', as: 'updatedCourses' });
  User.hasMany(Course, { foreignKey: 'approved_by', as: 'approvedCourses' });
  // --------------------
  // Audit Log associations
  // --------------------
  // Each audit log belongs to a user
  AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
  User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });

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
    console.log('Model associations successfully initialized and marked as complete');
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