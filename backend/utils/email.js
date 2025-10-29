const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const Handlebars = require('handlebars');

// Register handlebars helpers (once)
if (!Handlebars.helpers.eq) {
  Handlebars.registerHelper('eq', (a, b) => a === b);
}
if (!Handlebars.helpers.block) {
  Handlebars.registerHelper('block', (name, options) => {
    if (options.data && options.data.blocks && options.data.blocks[name]) {
      return options.data.blocks[name];
    }
    return options.fn ? options.fn(this) : '';
  });
}


// --- Utility Functions ---
async function loadTemplate(templateName) {
  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  return await fs.readFile(templatePath, 'utf-8');
}

async function renderTemplate(templateName, variables) {
  const template = await loadTemplate(templateName);
  const compiled = Handlebars.compile(template, { allowCallsToHelperMissing: true, noEscape: true });
  return compiled({ ...variables });
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function createTransporter() {
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  };
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Email] Creating transporter with config:', {
      host: config.host, port: config.port, secure: config.secure, user: config.auth.user, passConfigured: !!config.auth.pass
    });
  }
  return nodemailer.createTransport(config);
}

let lastEmailSentAt = 0;
async function sendEmail({ to, subject, html, text }) {
  try {
    const now = Date.now();
    const delayMs = parseInt(process.env.EMAIL_DELAY_MS) || 2000;
    const timeSinceLastEmail = now - lastEmailSentAt;
    if (timeSinceLastEmail < delayMs && lastEmailSentAt > 0) {
      const waitTime = delayMs - timeSinceLastEmail;
      if (process.env.NODE_ENV !== 'production') console.log(`[Email] Rate limiting: waiting ${waitTime}ms before sending...`);
      await delay(waitTime);
    }
    const transporter = createTransporter();
    const textContent = text || `${subject}\n\nPlease view this email in an HTML-capable email client.`;
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to, subject, html, text: textContent,
    };
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Email] Sending email with options:', {
        from: mailOptions.from, to: mailOptions.to, subject: mailOptions.subject, hasHtml: !!html, hasText: !!textContent, htmlLength: html?.length || 0
      });
    }
    const result = await transporter.sendMail(mailOptions);
    lastEmailSentAt = Date.now();
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Email] ✅ Email sent successfully:', result.messageId);
      console.log('[Email] Response:', result.response);
    }
    return result;
  } catch (error) {
    console.error('[Email] ❌ Failed to send email:', error);
    console.error('[Email] Email details - To:', to, 'Subject:', subject);
    throw error;
  }
}

async function sendTemplateEmail(templateName, to, subject, variables = {}) {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Email] Preparing to send email using template: ${templateName}`);
      console.log(`[Email] Recipient: ${to}`);
      console.log(`[Email] Subject: ${subject}`);
    }
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


// --- Shared Notification Logic ---
function buildStatusEmail({ type, entity, creator, collaborators, hod, department, url, templateStatus, templateApproval }) {
  // type: 'course' or 'degree'
  // entity: course or degree object
  // creator: user object
  // collaborators: array of user objects
  // hod: user object
  // department: department object (optional)
  // url: string
  // templateStatus: template for status (faculty/collaborators)
  // templateApproval: template for HOD approval

  const appName = process.env.FROM_NAME;
  const code = entity.code;
  const name = entity.name;
  const departmentName = department ? department.name : (entity.departmentByCode ? entity.departmentByCode.name : '');

  // HOD approval email
  const hodSubject = `${type.charAt(0).toUpperCase() + type.slice(1)} Approval: ${code} - ${appName}`;
  const hodVars = type === 'course' ? {
    HOD_NAME: `${hod.first_name} ${hod.last_name}`,
    COURSE_NAME: name,
    COURSE_CODE: code,
    FACULTY_NAME: `${creator.first_name} ${creator.last_name}`,
    COURSE_URL: url,
    NOTES: entity.notes || '',
  } : {
    HOD_NAME: `${hod.first_name} ${hod.last_name}`,
    DEGREE_NAME: name,
    DEGREE_CODE: code,
    DEGREE_URL: url,
    FACULTY_NAME: creator ? `${creator.first_name} ${creator.last_name}` : '',
    NOTES: entity.notes || '',
  };
  const hodPromise = sendTemplateEmail(templateApproval, hod.email, hodSubject, hodVars);

  // Faculty/creator status email
  const facultySubject = `${type.charAt(0).toUpperCase() + type.slice(1)} Submitted: ${code} - ${appName}`;
  // If entity.status is 'approved' or 'draft' (rejected), include REASON as NOTES
  const isApprovalOrRejection = entity.status === 'approved' || entity.status === 'draft';
  const notesValue = isApprovalOrRejection && entity.rejection_reason
    ? entity.rejection_reason
    : (isApprovalOrRejection && entity.approval_reason ? entity.approval_reason : undefined);

  let statusLabel = 'Submitted for Approval';
  if (entity.status === 'approved') statusLabel = 'Approved';
  else if (entity.status === 'draft' && entity.rejection_reason) statusLabel = 'Change Requested';

  const facultyVars = type === 'course' ? {
    FACULTY_NAME: `${creator.first_name} ${creator.last_name}`,
    COURSE_NAME: name,
    COURSE_CODE: code,
    COURSE_URL: url,
    STATUS: statusLabel,
    NOTES: notesValue || '',
  } : {
    FACULTY_NAME: `${creator.first_name} ${creator.last_name}`,
    DEGREE_NAME: name,
    DEGREE_CODE: code,
    DEGREE_URL: url,
    STATUS: statusLabel,
    NOTES: notesValue || '',
  };
  const facultyPromise = sendTemplateEmail(templateStatus, creator.email, facultySubject, facultyVars);

  // Collaborators status emails
  let collaboratorPromises = [];
  if (Array.isArray(collaborators)) {
    collaboratorPromises = collaborators
      .filter(collab => collab.email && collab.id !== creator.id)
      .map(collab => {
        const vars = type === 'course' ? {
          FACULTY_NAME: `${collab.first_name} ${collab.last_name}`,
          COURSE_NAME: name,
          COURSE_CODE: code,
          COURSE_URL: url,
          STATUS: statusLabel,
          NOTES: notesValue || '',
        } : {
          FACULTY_NAME: `${collab.first_name} ${collab.last_name}`,
          DEGREE_NAME: name,
          DEGREE_CODE: code,
          DEGREE_URL: url,
          STATUS: statusLabel,
          NOTES: notesValue || '',
        };
        return sendTemplateEmail(templateStatus, collab.email, facultySubject, vars);
      });
  }
  return Promise.all([hodPromise, facultyPromise, ...collaboratorPromises]);
}

// --- Public API ---
async function sendWelcomeEmail(user, resetToken) {
  const appName = process.env.FROM_NAME;
  const subject = `Welcome to ${appName} - Activate Your Account`;
  const activationUrl = `${process.env.FRONTEND_URL}/activate-account?token=${resetToken}`;
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
  return buildStatusEmail({
    type: 'course',
    entity: course,
    creator: course.creator,
    collaborators: course.collaborators,
    hod,
    url: `${process.env.FRONTEND_URL}/course/${course.id}`,
    templateStatus: 'course-status',
    templateApproval: 'course-approval',
  });
}

async function sendDegreeApprovalEmail(degree, hod) {
  return buildStatusEmail({
    type: 'degree',
    entity: degree,
    creator: degree.creator,
    collaborators: degree.collaborators,
    hod,
    url: `${process.env.FRONTEND_URL}/degree/${degree.id}`,
    templateStatus: 'degree-status',
    templateApproval: 'degree-approval',
    department: degree.departmentByCode,
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
