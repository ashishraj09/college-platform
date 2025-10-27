const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();
const { Enrollment, Course, User, Department, Degree } = require('../models');
const models = require('../utils/models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { isEnrollmentOpen } = require('../utils/enrollment');
const { handleCaughtError } = require('../utils/errorHandler');

// Get user's draft enrollments
router.get('/drafts',
  authenticateToken,
  require('../middleware/audit').auditMiddleware('read', 'enrollment', 'Fetched enrollment drafts'),
  async (req, res) => {
    try {
      // Get Enrollment model dynamically
      const EnrollmentModel = await models.Enrollment();
      
      const drafts = await EnrollmentModel.findAll({
        where: {
          student_id: req.user.id,
          enrollment_status: 'draft'
        },
        order: [['created_at', 'DESC']]
      });

      // For each draft, fetch the course codes
      // Just return the draft with course_codes
      res.json(drafts.map(draft => draft.toJSON()));
    } catch (error) {
      handleCaughtError(res, error, 'Failed to fetch enrollment drafts');
    }
  }
);

// HOD: Approve enrollments
router.post('/approve',
  authenticateToken,
  require('../middleware/audit').auditMiddleware('update', 'enrollment', 'Approved enrollments'),
  [
    body('enrollment_ids').isArray({ min: 1 }).withMessage('enrollment_ids must be a non-empty array')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if user is a head of department
      if (!req.user.is_head_of_department) {
        return res.status(403).json({ error: 'Only department heads can approve enrollments' });
      }
      const { enrollment_ids } = req.body;
      
      // Get models dynamically
      const EnrollmentModel = await models.Enrollment();
      const UserModel = await models.User();
      
      const enrollments = await EnrollmentModel.findAll({
        where: {
          id: { [Op.in]: enrollment_ids },
          enrollment_status: 'pending_approval'
        },
        include: [{ model: UserModel, as: 'student' }]
      });
      // Filter enrollments to only those in HOD's department
      const validEnrollments = enrollments.filter(e => e.student.department_code === req.user.department_code);
      if (validEnrollments.length === 0) {
        return res.status(404).json({ error: 'No valid enrollments found for approval' });
      }
      // Approve all valid enrollments and notify students
      const { sendEnrollmentStatusEmail } = require('../utils/email');
      const updatedEnrollments = await Promise.all(
        validEnrollments.map(async enrollment => {
          const updated = await enrollment.update({
            enrollment_status: 'approved',
            hod_approved_by: req.user.id,
            hod_approved_at: new Date()
          });
          // Fetch course details
          const CourseModel = await models.Course();
          const courses = await CourseModel.findAll({ where: { code: { [Op.in]: enrollment.course_codes } } });
          
          // Format courses for email with name, code, and credits
          const coursesForEmail = courses.map(c => ({
            name: c.name,
            code: c.code,
            credits: c.credits
          }));
          
          // Fetch degree and department for email
          const DegreeModel = await models.Degree();
          const DepartmentModel = await models.Department();
          let degree = null;
          let department = null;
          
          if (enrollment.student.degree_code) {
            degree = await DegreeModel.findOne({ where: { code: enrollment.student.degree_code } });
          }
          if (enrollment.department_code) {
            department = await DepartmentModel.findOne({ where: { code: enrollment.department_code } });
          }
          
          // Return enrollment with email data (send later)
          return {
            updated,
            emailData: {
              student: enrollment.student,
              enrollment: updated,
              courses: coursesForEmail,
              degree,
              department,
              status: 'Approved',
              hod: req.user
            }
          };
        })
      );
      
      // Send emails sequentially in background (fire-and-forget with rate limiting)
      (async () => {
        for (const { emailData } of updatedEnrollments) {
          try {
            await sendEnrollmentStatusEmail(emailData);
            console.log(`Sent approval email to ${emailData.student.email}`);
          } catch (err) {
            console.error('Failed to send approval email to student:', err);
          }
        }
      })();
      
      // Add message to Message table if provided
      if (req.body.message) {
        const Message = await models.Message();
        for (const { updated } of updatedEnrollments) {
          await Message.create({
            type: 'enrollment',
            reference_id: updated.id,
            sender_id: req.user.id,
            message: req.body.message,
          });
        }
      }
      res.json({
        message: `${updatedEnrollments.length} enrollment(s) approved successfully`,
        enrollments: updatedEnrollments.map(e => e.updated)
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to approve enrollments');
    }
  }
);

// HOD: Reject enrollments
router.post('/reject',
  authenticateToken,
  require('../middleware/audit').auditMiddleware('update', 'enrollment', 'Rejected enrollments'),
  [
    body('enrollment_ids').isArray({ min: 1 }).withMessage('At least one enrollment must be selected'),
    body('rejection_reason').isString().notEmpty().withMessage('Rejection reason is required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if user is a head of department
      if (!req.user.is_head_of_department) {
        return res.status(403).json({ error: 'Only department heads can reject enrollments' });
      }
      
      const { enrollment_ids, rejection_reason } = req.body;
      
      // Get models dynamically
      const EnrollmentModel = await models.Enrollment();
      const UserModel = await models.User();
      
      // Fetch all enrollments to reject
      const enrollments = await EnrollmentModel.findAll({
        where: { 
          id: { [Op.in]: enrollment_ids },
          enrollment_status: 'pending_approval'
        },
        include: [{ model: UserModel, as: 'student' }]
      });
      
      // Check if all enrollments belong to the HOD's department
      const validEnrollments = enrollments.filter(enrollment => 
        enrollment.student.department_code === req.user.department_code
      );
      
      if (validEnrollments.length !== enrollments.length) {
        return res.status(403).json({ 
          error: 'You can only reject enrollments for students in your department',
          rejected: validEnrollments.length,
          requested: enrollments.length
        });
      }
      
      // Update all enrollments and notify students
      const { sendEnrollmentStatusEmail } = require('../utils/email');
      const updatedEnrollments = await Promise.all(
        validEnrollments.map(async enrollment => {
          const updated = await enrollment.update({
            enrollment_status: 'draft',
            hod_approved_by: req.user.id,
            hod_approved_at: new Date()
          });
          // Fetch course details
          const CourseModel = await models.Course();
          const courses = await CourseModel.findAll({ where: { code: { [Op.in]: enrollment.course_codes } } });
          
          // Format courses for email with name, code, and credits
          const coursesForEmail = courses.map(c => ({
            name: c.name,
            code: c.code,
            credits: c.credits
          }));
          
          // Fetch degree and department for email
          const DegreeModel = await models.Degree();
          const DepartmentModel = await models.Department();
          let degree = null;
          let department = null;
          
          if (enrollment.student.degree_code) {
            degree = await DegreeModel.findOne({ where: { code: enrollment.student.degree_code } });
          }
          if (enrollment.department_code) {
            department = await DepartmentModel.findOne({ where: { code: enrollment.department_code } });
          }
          
          // Return enrollment with email data (send later)
          return {
            updated,
            emailData: {
              student: enrollment.student,
              enrollment: updated,
              courses: coursesForEmail,
              degree,
              department,
              status: 'Change Requested',
              hod: req.user,
              rejection_reason
            }
          };
        })
      );
      
      // Send emails sequentially in background (fire-and-forget with rate limiting)
      (async () => {
        for (const { emailData } of updatedEnrollments) {
          try {
            await sendEnrollmentStatusEmail(emailData);
            console.log(`Sent rejection email to ${emailData.student.email}`);
          } catch (err) {
            console.error('Failed to send rejection email to student:', err);
          }
        }
      })();
      
      // Always add rejection reason to Message table
      const Message = await models.Message();
      for (const { updated } of updatedEnrollments) {
        await Message.create({
          type: 'enrollment',
          reference_id: updated.id,
          sender_id: req.user.id,
          message: req.body.message ? req.body.message : `Change requested: ${rejection_reason}`,
        });
      }
      res.json({
        message: `${updatedEnrollments.length} enrollment(s) rejected successfully`,
        enrollments: updatedEnrollments.map(e => e.updated)
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to reject enrollments');
    }
  }
);

// Helper function for finding degrees with multiple matching strategies
const findDegreeByCode = async (codeStr, status = 'active') => {
  try {
    // Get the Degree model dynamically
    const Degree = await models.Degree();
    
    // Try exact match first
    let degree = await Degree.findOne({ where: { code: codeStr, status } });

    // Case-insensitive match
    if (!degree) {
      degree = await Degree.findOne({ where: { code: { [Op.iLike]: codeStr }, status } });
    }

    // Fallback: alphanumeric-only match
    if (!degree) {
      const simplifiedCode = codeStr.replace(/[^a-zA-Z0-9]/g, '');
      if (simplifiedCode) {
        degree = await Degree.findOne({ where: { code: { [Op.iLike]: `%${simplifiedCode}%` }, status } });
      }
    }

    return degree;
  } catch (err) {
    console.error('Error finding degree:', err);
    throw new Error('Error searching for degree');
  }
};

// Get enrollments by degree code (optionally filter by semester and academic_year)
router.get('/degree/:code',
  authenticateToken,
  require('../middleware/audit').auditMiddleware('read', 'enrollment', 'Fetched enrollments by degree'),
  async (req, res) => {
    try {
      // Get models dynamically
      const Degree = await models.Degree();
      const Course = await models.Course();
      
      const { code } = req.params;
      const { semester, status } = req.query;

      // Normalize and trim the degree code
      const codeStr = String(code || '').trim();
      console.log(`Looking up degree for code: ${codeStr}`);

      // Find degree using multiple strategies (defaults to active status unless specified)
      let degree = await findDegreeByCode(codeStr, status || 'active');

      // If no degree found, provide suggestions
      if (!degree) {
        const suggestions = [];
        const simpleCode = codeStr.replace(/[^a-zA-Z0-9]/g, '');

        // Search for similar degree codes and names
        try {
          if (simpleCode) {
            const codeMatches = await Degree.findAll({ 
              where: { code: { [Op.iLike]: `%${simpleCode}%` } }, 
              limit: 10 
            });
            codeMatches.forEach(m => suggestions.push({ id: m.id, code: m.code, name: m.name }));
          }

          // Search by degree name as well
          const nameMatches = await Degree.findAll({
            where: { name: { [Op.iLike]: `%${codeStr}%` } }
          });
          nameMatches.forEach(m => {
            if (!suggestions.some(s => s.id === m.id)) {
              suggestions.push({ id: m.id, code: m.code, name: m.name });
            }
          });
        } catch (err) {
          console.error('Error searching for degree suggestions:', err);
        }

        return res.status(404).json({ error: 'Degree not found', suggestions });
      }

      // Set up default academic year if not provided
      const currentYear = new Date().getFullYear();
      const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;

      // Get enrollment start/end dates for the semester from degree.courses_per_semester only
      let enrollmentDates = {};
      let perSemesterObj = degree.courses_per_semester;
      if (typeof perSemesterObj === 'string' && perSemesterObj.trim().length > 0) {
        try {
          perSemesterObj = JSON.parse(perSemesterObj);
        } catch (e) {
          perSemesterObj = {};
        }
      }
      const semKey = String(semester);
      if (perSemesterObj && typeof perSemesterObj === 'object' && perSemesterObj[semKey]) {
        enrollmentDates = {
          enrollment_start: perSemesterObj[semKey].enrollment_start,
          enrollment_end: perSemesterObj[semKey].enrollment_end,
          count: perSemesterObj[semKey].count
        };
      }

      // Fetch all active courses for this degree and semester using degree_code (not degree_id)
      const courseWhere = { degree_code: degree.code, status: 'active' };
      if (semester) courseWhere.semester = parseInt(semester);
      let courses = await Course.findAll({
        where: courseWhere,
        attributes: ['id', 'name', 'code', 'semester', 'credits', 'version', 'status']
      });

      // Remove duplicate courses by id
      const seen = new Set();
      courses = courses.filter(course => {
        if (seen.has(course.id)) return false;
        seen.add(course.id);
        return true;
      });

      console.log(`Found ${courses.length} active courses for degree ${degree.code} semester ${semester}`);
      res.json({
        degree: { id: degree.id, name: degree.name, code: degree.code },
        enrollment_dates: enrollmentDates,
        courses: courses
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to fetch enrollments for degree');
    }
  }
);

module.exports = router;