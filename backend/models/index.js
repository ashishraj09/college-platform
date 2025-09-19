const User = require('./User');
const Department = require('./Department');
const Degree = require('./Degree');
const Course = require('./Course');
const Enrollment = require('./Enrollment');
const EnrollmentDraft = require('./EnrollmentDraft');
const AuditLog = require('./AuditLog');
const Message = require('./Message');

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

Course.hasMany(Enrollment, { 
  foreignKey: 'course_id', 
  as: 'enrollments' 
});

// NOTE: Course-Lecturer associations (many-to-many) have been removed

// Enrollment associations
Enrollment.belongsTo(User, { 
  foreignKey: 'student_id', 
  as: 'student',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

Enrollment.belongsTo(Course, { 
  foreignKey: 'course_id', 
  as: 'course',
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

// EnrollmentDraft associations
EnrollmentDraft.belongsTo(User, { 
  foreignKey: 'student_id', 
  as: 'student',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// User reverse associations for enrollments
User.hasMany(Enrollment, { 
  foreignKey: 'student_id', 
  as: 'enrollments' 
});

User.hasMany(EnrollmentDraft, { 
  foreignKey: 'student_id', 
  as: 'enrollmentDrafts' 
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

module.exports = {
  User,
  Department,
  Degree,
  Course,
  Enrollment,
  EnrollmentDraft,
  AuditLog,
  Message
};
