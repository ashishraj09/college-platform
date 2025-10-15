const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const Handlebars = require('handlebars');

// Register 'block' helper if not already registered
// Register 'eq' helper for template comparisons
if (!Handlebars.helpers.eq) {
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });
}
if (!Handlebars.helpers.block) {
  Handlebars.registerHelper('block', function(name, options) {
    // If block content exists, render it
    if (options.data && options.data.blocks && options.data.blocks[name]) {
      return options.data.blocks[name];
    }
    // Otherwise, fallback to default content
    return options.fn ? options.fn(this) : '';
  });
}

// Load email template
async function loadTemplate(templateName) {
  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  return await fs.readFile(templatePath, 'utf-8');
}

// Render template with Handlebars
async function renderTemplate(templateName, variables) {
  const template = await loadTemplate(templateName);
  const compiled = Handlebars.compile(template, { allowCallsToHelperMissing: true, noEscape: true });
  return compiled({ ...variables });
}

// Create transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Send email
async function sendEmail({ to, subject, html, text }) {
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
}

// Send template-based email
async function sendTemplateEmail(templateName, to, subject, variables = {}) {
  console.log(`[Email] Preparing to send email using template: ${templateName}`);
  console.log(`[Email] Recipient: ${to}`);
  console.log(`[Email] Subject: ${subject}`);
  
  const html = await renderTemplate(templateName, {
    ...variables,
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    APP_NAME: process.env.FROM_NAME,
    YEAR: new Date().getFullYear(),
  });
  
  return await sendEmail({ to, subject, html });
}

// Specific email functions
async function sendWelcomeEmail(user, resetToken) {
  const subject = 'Welcome to College Platform - Activate Your Account';
  const activationUrl = `${process.env.FRONTEND_URL}/activate?token=${resetToken}`;
  return await sendTemplateEmail('welcome', user.email, subject, {
    FIRST_NAME: user.first_name,
    LAST_NAME: user.last_name,
    USER_TYPE: user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1),
    ACTIVATION_URL: activationUrl,
  });
}

async function sendPasswordResetEmail(user, resetToken) {
  const subject = 'Reset Your Password - College Platform';
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  return await sendTemplateEmail('password-reset', user.email, subject, {
    FIRST_NAME: user.first_name,
    RESET_URL: resetUrl,
  });
}

async function sendCourseApprovalEmail(course, hod) {
  const subject = `Course Approval Required: ${course.name}`;
  const courseUrl = `${process.env.FRONTEND_URL}/courses/${course.id}/review`;
  return await sendTemplateEmail('course-approval', hod.email, subject, {
    HOD_NAME: `${hod.first_name} ${hod.last_name}`,
    COURSE_NAME: course.name,
    COURSE_CODE: course.code,
    FACULTY_NAME: `${course.creator.first_name} ${course.creator.last_name}`,
    COURSE_URL: courseUrl,
  });
}

async function sendEnrollmentApprovalEmail(enrollment, approver, isHOD = true) {
  const studentName = enrollment.student ? `${enrollment.student.first_name} ${enrollment.student.last_name}` : '';
  const approverType = isHOD ? 'HOD' : 'Office';
  const subject = `Student Enrollment ${approverType} Approval Required: ${studentName}`;
  const enrollmentUrl = `${process.env.FRONTEND_URL}/enrollments/${enrollment.id}/review`;
  return await sendTemplateEmail('enrollment-approval', approver.email, subject, {
    HOD_NAME: `${approver.first_name} ${approver.last_name}`,
    APPROVER_NAME: `${approver.first_name} ${approver.last_name}`,
    STUDENT_NAME: studentName,
    STUDENT_ID: enrollment.student ? enrollment.student.student_id : '',
    DEGREE_NAME: enrollment.degree ? enrollment.degree.name : '',
    DEGREE_CODE: enrollment.degree ? enrollment.degree.code : '',
    DEPARTMENT_NAME: enrollment.department ? enrollment.department.name : '',
    DEPARTMENT_CODE: enrollment.department ? enrollment.department.code : '',
    COURSE_LIST: enrollment.courseList || [],
    ACADEMIC_YEAR: enrollment.academic_year,
    SEMESTER: enrollment.semester,
    ENROLLMENT_URL: enrollmentUrl,
    APPROVER_TYPE: approverType,
  });
}

async function sendEnrollmentConfirmationEmail(enrollment) {
  const subject = 'Enrollment Confirmation - College Platform';
  return await sendTemplateEmail('enrollment-confirmation', enrollment.student.email, subject, {
    STUDENT_NAME: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
    COURSE_NAME: enrollment.course.name,
    COURSE_CODE: enrollment.course.code,
    ACADEMIC_YEAR: enrollment.academic_year,
    SEMESTER: enrollment.semester,
  });
}

async function sendEnrollmentStatusEmail({ student, enrollment, courses, status, hod, rejection_reason, degree, department }) {
  let subject, templateName;
  let statusFormatted = status;
  
  // Choose template and subject based on status
  if (statusFormatted === 'Submitted') {
    subject = 'Enrollment Submitted for Approval';
    templateName = 'enrollment-status';
  } else if (statusFormatted === 'Approved') {
    subject = 'Your Enrollment Has Been Approved';
    templateName = 'enrollment-approved';
  } else if (statusFormatted === 'Change Requested') {
    subject = 'Changes Requested for Your Enrollment';
    templateName = 'enrollment-change-requested';
  } else {
    subject = `Enrollment Status: ${statusFormatted}`;
    templateName = 'enrollment-status';
  }
  
  return await sendTemplateEmail(templateName, student.email, subject, {
    STUDENT_NAME: `${student.first_name} ${student.last_name}`,
    ENROLLMENT_ID: enrollment.id,
    DEGREE_NAME: degree && degree.name ? degree.name : '',
    DEGREE_CODE: degree && degree.code ? degree.code : '',
    DEPARTMENT_NAME: department && department.name ? department.name : '',
    DEPARTMENT_CODE: department && department.code ? department.code : '',
    ACADEMIC_YEAR: enrollment.academic_year,
    SEMESTER: enrollment.semester,
    COURSES: courses,
    STATUS: statusFormatted,
    HOD_NAME: `${hod.first_name} ${hod.last_name}`,
    REJECTION_REASON: rejection_reason || '',
  });
}

module.exports = {
  sendEmail,
  sendTemplateEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendCourseApprovalEmail,
  sendEnrollmentApprovalEmail,
  sendEnrollmentConfirmationEmail,
  sendEnrollmentStatusEmail,
};
