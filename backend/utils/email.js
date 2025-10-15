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

// Delay function to prevent spam filtering
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Create transporter
function createTransporter() {
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };
  
  console.log('[Email] Creating transporter with config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
    passConfigured: !!config.auth.pass
  });
  
  return nodemailer.createTransport(config);
}

// Track last email send time to implement rate limiting without blocking
let lastEmailSentAt = 0;

// Send email
async function sendEmail({ to, subject, html, text }) {
  try {
    // Calculate time since last email and wait if needed (non-blocking for API response)
    const now = Date.now();
    const delayMs = parseInt(process.env.EMAIL_DELAY_MS) || 2000;
    const timeSinceLastEmail = now - lastEmailSentAt;
    
    if (timeSinceLastEmail < delayMs && lastEmailSentAt > 0) {
      const waitTime = delayMs - timeSinceLastEmail;
      console.log(`[Email] Rate limiting: waiting ${waitTime}ms before sending...`);
      await delay(waitTime);
    }
    
    const transporter = createTransporter();
    
    // If no text version provided, create a simple one from subject
    const textContent = text || `${subject}\n\nPlease view this email in an HTML-capable email client.`;
    
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: textContent,
    };
    
    console.log('[Email] Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasHtml: !!html,
      hasText: !!textContent,
      htmlLength: html?.length || 0
    });
    
    const result = await transporter.sendMail(mailOptions);
    lastEmailSentAt = Date.now(); // Update last send time
    
    console.log('[Email] ✅ Email sent successfully:', result.messageId);
    console.log('[Email] Response:', result.response);
    
    return result;
  } catch (error) {
    console.error('[Email] ❌ Failed to send email:', error);
    console.error('[Email] Email details - To:', to, 'Subject:', subject);
    throw error;
  }
}

// Send template-based email
async function sendTemplateEmail(templateName, to, subject, variables = {}) {
  try {
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
  } catch (error) {
    console.error(`[Email] Failed to send template email: ${templateName}`, error);
    console.error(`[Email] Variables:`, JSON.stringify(variables, null, 2));
    throw error;
  }
}

// Specific email functions
async function sendWelcomeEmail(user, resetToken) {
  const appName = process.env.FROM_NAME;
  const subject = `Welcome to ${appName} - Activate Your Account`;
  const activationUrl = `${process.env.FRONTEND_URL}/activate?token=${resetToken}`;
  return await sendTemplateEmail('welcome', user.email, subject, {
    FIRST_NAME: user.first_name,
    LAST_NAME: user.last_name,
    USER_TYPE: user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1),
    ACTIVATION_URL: activationUrl,
  });
}

async function sendPasswordResetEmail(user, resetToken) {
  const appName = process.env.FROM_NAME;
  const subject = `Reset Your Password - ${appName}`;
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  return await sendTemplateEmail('password-reset', user.email, subject, {
    FIRST_NAME: user.first_name,
    RESET_URL: resetUrl,
  });
}

async function sendCourseApprovalEmail(course, hod) {
  const appName = process.env.FROM_NAME;
  const subject = `Course Approval: ${course.code} - ${appName}`;
  const courseUrl = `${process.env.FRONTEND_URL}/courses/${course.id}/review`;
  return await sendTemplateEmail('course-approval', hod.email, subject, {
    HOD_NAME: `${hod.first_name} ${hod.last_name}`,
    COURSE_NAME: course.name,
    COURSE_CODE: course.code,
    FACULTY_NAME: `${course.creator.first_name} ${course.creator.last_name}`,
    COURSE_URL: courseUrl,
  });
}

async function sendDegreeApprovalEmail(degree, hod) {
  const appName = process.env.FROM_NAME;
  const subject = `Degree Approval: ${degree.code} - ${appName}`;
  const degreeUrl = `${process.env.FRONTEND_URL}/degrees/${degree.id}/review`;
  return await sendTemplateEmail('degree-approval', hod.email, subject, {
    HOD_NAME: `${hod.first_name} ${hod.last_name}`,
    DEGREE_NAME: degree.name,
    DEGREE_CODE: degree.code,
    DEPARTMENT_NAME: degree.departmentByCode ? degree.departmentByCode.name : '',
    DEGREE_URL: degreeUrl,
  });
}

async function sendEnrollmentApprovalEmail(enrollment, approver, isHOD = true) {
  const appName = process.env.FROM_NAME;
  const studentName = enrollment.student ? `${enrollment.student.first_name} ${enrollment.student.last_name}` : '';
  const approverType = isHOD ? 'HOD' : 'Office';
  
  // Get last 6 characters of enrollment ID for uniqueness
  const enrollmentRef = enrollment.id ? `#${String(enrollment.id).slice(-6)}` : '';

  const subject = `Enrollment Approval: ${studentName} ${enrollmentRef} - ${appName}`;
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
  const appName = process.env.FROM_NAME;
  const subject = `Enrollment Confirmed - ${appName}`;
  return await sendTemplateEmail('enrollment-confirmation', enrollment.student.email, subject, {
    STUDENT_NAME: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
    COURSE_NAME: enrollment.course.name,
    COURSE_CODE: enrollment.course.code,
    ACADEMIC_YEAR: enrollment.academic_year,
    SEMESTER: enrollment.semester,
  });
}

async function sendEnrollmentStatusEmail({ student, enrollment, courses, status, hod, rejection_reason, degree, department }) {
  const appName = process.env.FROM_NAME;
  let subject, templateName;
  let statusFormatted = status;
  
  // Get last 6 characters of enrollment ID for uniqueness
  const enrollmentRef = enrollment.id ? `#${String(enrollment.id).slice(-6)}` : '';
  
  // Choose template and subject based on status
  if (statusFormatted === 'Submitted') {
    subject = `Enrollment Submitted ${enrollmentRef} - ${appName}`;
    templateName = 'enrollment-status';
  } else if (statusFormatted === 'Approved') {
    subject = `Enrollment Approved ${enrollmentRef} - ${appName}`;
    templateName = 'enrollment-approved';
  } else if (statusFormatted === 'Change Requested') {
    subject = `Enrollment Changes Requested ${enrollmentRef} - ${appName}`;
    templateName = 'enrollment-change-requested';
  } else {
    subject = `Enrollment ${statusFormatted} ${enrollmentRef} - ${appName}`;
    templateName = 'enrollment-status';
  }
  
  // Safely get HOD name
  const hodName = hod && hod.first_name && hod.last_name 
    ? `${hod.first_name} ${hod.last_name}` 
    : 'Head of Department';
  
  return await sendTemplateEmail(templateName, student.email, subject, {
    STUDENT_NAME: `${student.first_name} ${student.last_name}`,
    ENROLLMENT_ID: enrollment.id,
    DEGREE_NAME: degree && degree.name ? degree.name : '',
    DEGREE_CODE: degree && degree.code ? degree.code : '',
    DEPARTMENT_NAME: department && department.name ? department.name : '',
    DEPARTMENT_CODE: department && department.code ? department.code : '',
    ACADEMIC_YEAR: enrollment.academic_year,
    SEMESTER: enrollment.semester,
    COURSES: courses || [],
    STATUS: statusFormatted,
    HOD_NAME: hodName,
    REJECTION_REASON: rejection_reason || '',
  });
}

module.exports = {
  sendEmail,
  sendTemplateEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendCourseApprovalEmail,
  sendDegreeApprovalEmail,
  sendEnrollmentApprovalEmail,
  sendEnrollmentConfirmationEmail,
  sendEnrollmentStatusEmail,
};
