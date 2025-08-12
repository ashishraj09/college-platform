const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Load email template
const loadTemplate = async (templateName) => {
  try {
    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
    return await fs.readFile(templatePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load email template ${templateName}:`, error);
    return null;
  }
};

// Replace template variables
const replaceTemplateVariables = (template, variables) => {
  let result = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  return result;
};

// Send email
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

// Send template-based email
const sendTemplateEmail = async (templateName, to, subject, variables = {}) => {
  try {
    const template = await loadTemplate(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const html = replaceTemplateVariables(template, {
      ...variables,
      FRONTEND_URL: process.env.FRONTEND_URL,
      BACKEND_URL: process.env.BACKEND_URL,
      APP_NAME: process.env.FROM_NAME,
    });

    return await sendEmail({ to, subject, html });
  } catch (error) {
    console.error('Failed to send template email:', error);
    throw error;
  }
};

// Specific email functions
const sendWelcomeEmail = async (user, resetToken) => {
  const subject = 'Welcome to College Platform - Activate Your Account';
  const activationUrl = `${process.env.FRONTEND_URL}/activate?token=${resetToken}`;
  
  return await sendTemplateEmail('welcome', user.email, subject, {
    FIRST_NAME: user.first_name,
    LAST_NAME: user.last_name,
    USER_TYPE: user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1),
    ACTIVATION_URL: activationUrl,
  });
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const subject = 'Reset Your Password - College Platform';
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  return await sendTemplateEmail('password-reset', user.email, subject, {
    FIRST_NAME: user.first_name,
    RESET_URL: resetUrl,
  });
};

const sendCourseApprovalEmail = async (course, hod) => {
  const subject = `Course Approval Required: ${course.name}`;
  const courseUrl = `${process.env.FRONTEND_URL}/courses/${course.id}/review`;
  
  return await sendTemplateEmail('course-approval', hod.email, subject, {
    HOD_NAME: `${hod.first_name} ${hod.last_name}`,
    COURSE_NAME: course.name,
    COURSE_CODE: course.code,
    FACULTY_NAME: `${course.creator.first_name} ${course.creator.last_name}`,
    COURSE_URL: courseUrl,
  });
};

const sendEnrollmentApprovalEmail = async (enrollment, approver, isHOD = true) => {
  const studentName = `${enrollment.student.first_name} ${enrollment.student.last_name}`;
  const courseName = enrollment.course.name;
  const approverType = isHOD ? 'HOD' : 'Office';
  
  const subject = `Student Enrollment ${approverType} Approval Required: ${studentName}`;
  const enrollmentUrl = `${process.env.FRONTEND_URL}/enrollments/${enrollment.id}/review`;
  
  return await sendTemplateEmail('enrollment-approval', approver.email, subject, {
    APPROVER_NAME: `${approver.first_name} ${approver.last_name}`,
    STUDENT_NAME: studentName,
    STUDENT_ID: enrollment.student.student_id,
    COURSE_NAME: courseName,
    COURSE_CODE: enrollment.course.code,
    ACADEMIC_YEAR: enrollment.academic_year,
    SEMESTER: enrollment.semester,
    ENROLLMENT_URL: enrollmentUrl,
    APPROVER_TYPE: approverType,
  });
};

const sendEnrollmentConfirmationEmail = async (enrollment) => {
  const subject = 'Enrollment Confirmation - College Platform';
  
  return await sendTemplateEmail('enrollment-confirmation', enrollment.student.email, subject, {
    STUDENT_NAME: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
    COURSE_NAME: enrollment.course.name,
    COURSE_CODE: enrollment.course.code,
    ACADEMIC_YEAR: enrollment.academic_year,
    SEMESTER: enrollment.semester,
  });
};

module.exports = {
  sendEmail,
  sendTemplateEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendCourseApprovalEmail,
  sendEnrollmentApprovalEmail,
  sendEnrollmentConfirmationEmail,
};
