// Common async model access utility
// Usage: const { User, Department, Degree } = await models.getAll();

const getModel = require('./getModel');

const models = {
  User: async () => await getModel('User'),
  Department: async () => await getModel('Department'),
  Degree: async () => await getModel('Degree'),
  Course: async () => await getModel('Course'),
  Enrollment: async () => await getModel('Enrollment'),
  AuditLog: async () => await getModel('AuditLog'),
  Message: async () => await getModel('Message'),
  // Add more models here as needed
  getAll: async () => {
    const User = await getModel('User');
    const Department = await getModel('Department');
    const Degree = await getModel('Degree');
    const Course = await getModel('Course');
    const Enrollment = await getModel('Enrollment');
    const AuditLog = await getModel('AuditLog');
    const Message = await getModel('Message');
    return { User, Department, Degree, Course, Enrollment, AuditLog, Message };
  }
};

module.exports = models;
