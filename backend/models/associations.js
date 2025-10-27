
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

const getModel = require('../utils/getModel');

// Track whether associations have been initialized
let associationsInitialized = false;

// Async function to initialize associations
async function initializeAssociations() {
  // Always get the real model classes from Sequelize
  const User = await getModel('User');
  const Department = await getModel('Department');
  const Degree = await getModel('Degree');
  const Course = await getModel('Course');
  const Enrollment = await getModel('Enrollment');
  const AuditLog = await getModel('AuditLog');
  const Message = await getModel('Message');

  // Collaborator associations (many-to-many, polymorphic)
  // Course collaborators
  Course.belongsToMany(User, {
    through: {
      model: 'collaborators',
      scope: { entity_type: 'course' }
    },
    as: 'courseCollaborators',
    foreignKey: 'entity_id', // course.id
    otherKey: 'user_id',
    constraints: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  User.belongsToMany(Course, {
    through: {
      model: 'collaborators',
      scope: { entity_type: 'course' }
    },
    as: 'collaboratingCourses',
    foreignKey: 'user_id',
    otherKey: 'entity_id', // course.id
    constraints: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  // Degree collaborators
  Degree.belongsToMany(User, {
    through: {
      model: 'collaborators',
      scope: { entity_type: 'degree' }
    },
    as: 'degreeCollaborators',
    foreignKey: 'entity_id', // degree.id
    otherKey: 'user_id',
    constraints: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  User.belongsToMany(Degree, {
    through: {
      model: 'collaborators',
      scope: { entity_type: 'degree' }
    },
    as: 'collaboratingDegrees',
    foreignKey: 'user_id',
    otherKey: 'entity_id', // degree.id
    constraints: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  // --------------------
  // Message associations
  // --------------------
  // Each message belongs to a sender (User)
  // Each user can have many sent messages
  // --------------------
  // User associations
  // --------------------
  // User associations: now use department_code and degree_code fields only
  User.belongsTo(Degree, { foreignKey: 'degree_code', targetKey: 'code', as: 'degreeByCode', constraints: false });
  User.belongsTo(Department, { foreignKey: 'department_code', targetKey: 'code', as: 'departmentByCode', constraints: false });
  // Add code-based association for eager loading
  // If you want to associate User with Degree, use custom logic or scopes on code fields
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

  // Each department has many degrees and courses
  // Department.hasMany(Degree, { foreignKey: 'department_id', as: 'degrees' }); // DB integrity (removed)
  Department.hasMany(Degree, { foreignKey: 'department_code', sourceKey: 'code', as: 'degreesByCode', constraints: false }); // Code-based
  // Department.hasMany(Course, { foreignKey: 'department_id', as: 'courses' }); // DB integrity (removed)
  Department.hasMany(Course, { foreignKey: 'department_code', sourceKey: 'code', as: 'coursesByCode', constraints: false }); // Code-based
  // --------------------
  // Degree associations
  // --------------------
  // Each degree belongs to a department
  // Add constraints: false to prevent DB-level constraint
  Degree.belongsTo(Department, { foreignKey: 'department_code', targetKey: 'code', as: 'departmentByCode', onDelete: 'CASCADE', onUpdate: 'CASCADE', constraints: false }); // Code-based
  // Each degree has many courses
  Degree.hasMany(Course, { foreignKey: 'degree_code', sourceKey: 'code', as: 'courses', constraints: false }); // Code-based (used as `courses`)
  // Keep an explicit alias if callers expect `coursesByCode` as well
  Degree.hasMany(Course, { foreignKey: 'degree_code', sourceKey: 'code', as: 'coursesByCode', constraints: false }); // Code-based
  // Each degree has a creator (User)
  Degree.belongsTo(User, { foreignKey: 'created_by', as: 'creator', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  // --------------------
  // Course associations
  // --------------------
  // Each course belongs to a department and degree
  // Course.belongsTo(Department, { foreignKey: 'department_id', as: 'department', onDelete: 'CASCADE', onUpdate: 'CASCADE' }); // DB integrity (removed)
  Course.belongsTo(Department, { foreignKey: 'department_code', targetKey: 'code', as: 'departmentByCode', onDelete: 'CASCADE', onUpdate: 'CASCADE', constraints: false }); // Code-based
  Course.belongsTo(Degree, { foreignKey: 'degree_code', targetKey: 'code', as: 'degreeByCode', onDelete: 'CASCADE', onUpdate: 'CASCADE', constraints: false }); // Code-based
  // Each course has a creator, updater, approver, and primary instructor (User)
  Course.belongsTo(User, { foreignKey: 'created_by', as: 'creator', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
  Course.belongsTo(User, { foreignKey: 'updated_by', as: 'updater', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Course.belongsTo(User, { foreignKey: 'approved_by', as: 'approver', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
  Course.belongsTo(User, { foreignKey: 'primary_instructor', as: 'primaryInstructor', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
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