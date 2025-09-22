const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();
const { Enrollment, Course, User, Department, Degree } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { isEnrollmentOpen } = require('../utils/enrollment');

// Create a new enrollment as draft
router.post('/create',
  [
    body('course_codes').isArray().withMessage('Course codes must be an array'),
    body('course_codes.*').isString().withMessage('Invalid course code'),
    body('academic_year').isString().withMessage('Academic year is required'),
    body('semester').isInt({ min: 1 }).withMessage('Semester must be a positive integer')
  ],
  authenticateToken,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { user_id, course_codes, academic_year, semester } = req.body;
      
      // Ensure the user can only enroll for themselves
      if (req.user.user_type !== 'admin' && user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only create enrollments for yourself' });
      }

      // Get the student's degree
      const student = await User.findByPk(user_id || req.user.id, {
        include: [{ model: Degree, as: 'degree' }]
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (!student.degree) {
        return res.status(400).json({ error: 'Student is not enrolled in a degree program' });
      }

      // Check if enrollment period is open
      const isOpen = isEnrollmentOpen(student.degree, student.current_semester);
      if (!isOpen.open) {
        return res.status(400).json({ error: isOpen.message });
      }

      // Get course IDs from course codes
      const courses = await Course.findAll({
        where: { 
          code: { [Op.in]: course_codes },
          degree_id: student.degree_id
        }
      });

      if (courses.length !== course_codes.length) {
        return res.status(400).json({ 
          error: 'One or more course codes are invalid for this degree program',
          found: courses.map(c => c.code),
          requested: course_codes
        });
      }

      // Create the enrollment
      const enrollment = await Enrollment.create({
        student_id: user_id || req.user.id,
        course_ids: courses.map(c => c.id),
        academic_year,
        semester,
        enrollment_status: 'draft'
      });

      // Add course codes (virtual field)
      enrollment.course_codes = courses.map(c => c.code);

      res.status(201).json(enrollment);
    } catch (error) {
      console.error('Error creating enrollment:', error);
      res.status(500).json({ error: 'Failed to create enrollment' });
    }
  }
);

// Get user's draft enrollments
router.get('/drafts',
  authenticateToken,
  async (req, res) => {
    try {
      const drafts = await Enrollment.findAll({
        where: {
          student_id: req.user.id,
          enrollment_status: 'draft'
        },
        order: [['created_at', 'DESC']]
      });

      // For each draft, fetch the course codes
      const draftsWithCourses = await Promise.all(drafts.map(async (draft) => {
        const courses = await Course.findAll({
          where: { id: { [Op.in]: draft.course_ids } }
        });
        
        return {
          ...draft.toJSON(),
          course_codes: courses.map(c => c.code),
          courses: courses
        };
      }));

      res.json(draftsWithCourses);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      res.status(500).json({ error: 'Failed to fetch drafts' });
    }
  }
);

// Get pending approvals for HOD
router.get('/pending-approvals',
  authenticateToken,
  async (req, res) => {
    try {
      // Check if user is a head of department
      if (!req.user.is_head_of_department) {
        return res.status(403).json({ error: 'Only department heads can view pending approvals' });
      }
      
      const { degree_id, semester, search } = req.query;
      
      // Define where clause for enrollment status
      const whereClause = {
        enrollment_status: 'pending_hod_approval'
      };
      
      // Add semester filter to the where clause if provided
      if (semester) {
        whereClause.semester = parseInt(semester);
      }

      const includeClause = [
        {
          model: User,
          as: 'student',
          where: {
            department_id: req.user.department_id
          },
          include: [
            {
              model: Degree,
              as: 'degree',
              ...(degree_id && { where: { id: degree_id } })
            }
          ]
        }
        // Removed Course association as we now use course_ids JSON array
      ];

      // Add search filter if provided
      if (search) {
        includeClause[0].where[Op.or] = [
          { first_name: { [Op.iLike]: `%${search}%` } },
          { last_name: { [Op.iLike]: `%${search}%` } },
          { student_id: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const pendingEnrollments = await Enrollment.findAll({
        where: whereClause,
        include: includeClause,
        order: [
          ['created_at', 'ASC'],
          [{ model: User, as: 'student' }, 'first_name', 'ASC']
        ]
      });

      // After fetching enrollments, we need to get course details separately
      // since we're using course_ids JSON field instead of direct association
      const enrichedEnrollments = await Promise.all(pendingEnrollments.map(async (enrollment) => {
        const enrollmentJson = enrollment.toJSON();
        
        // Get courses for this enrollment
        const courses = await Course.findAll({
          where: { id: { [Op.in]: enrollmentJson.course_ids || [] } }
        });
        
        // Since the frontend expects a single course per enrollment in the old model,
        // we need to create individual enrollment objects for each course
        return courses.map(course => ({
          ...enrollmentJson,
          // Add course as a property to match the old model expected by the frontend
          course: {
            id: course.id,
            name: course.name,
            code: course.code,
            version_code: `${course.code}-v${course.version || 1}`, // Format as CODE-v1, CODE-v2, etc.
            credits: course.credits || 0
          }
        }));
      }));
      
      // Flatten the array of arrays
      const flattenedEnrollments = enrichedEnrollments.flat();

      // Group by student and academic year/semester
      const groupedEnrollments = flattenedEnrollments.reduce((acc, enrollment) => {
        const key = `${enrollment.student.id}-${enrollment.academic_year}-${enrollment.semester}`;
        if (!acc[key]) {
          acc[key] = {
            student: enrollment.student,
            academic_year: enrollment.academic_year,
            semester: enrollment.semester,
            enrollments: []
          };
        }
        acc[key].enrollments.push(enrollment);
        return acc;
      }, {});

      res.json({
        pendingApprovals: Object.values(groupedEnrollments)
      });
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      res.status(500).json({ error: 'Failed to fetch pending approvals' });
    }
  }
);

// HOD: Approve enrollments
router.post('/approve',
  authenticateToken,
  [
    body('enrollment_ids').isArray({ min: 1 }).withMessage('At least one enrollment must be selected')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if user is a head of department
      if (!req.user.is_head_of_department) {
        return res.status(403).json({ error: 'Only department heads can approve enrollments' });
      }
      
      const { enrollment_ids } = req.body;
      
      // Fetch all enrollments to approve
      const enrollments = await Enrollment.findAll({
        where: { 
          id: { [Op.in]: enrollment_ids },
          enrollment_status: 'pending_hod_approval'
        },
        include: [{ model: User, as: 'student' }]
      });
      
      // Check if all enrollments belong to the HOD's department
      const validEnrollments = enrollments.filter(enrollment => 
        enrollment.student.department_id === req.user.department_id
      );
      
      if (validEnrollments.length !== enrollments.length) {
        return res.status(403).json({ 
          error: 'You can only approve enrollments for students in your department',
          approved: validEnrollments.length,
          requested: enrollments.length
        });
      }
      
      // Update all enrollments
      const updatedEnrollments = await Promise.all(
        validEnrollments.map(enrollment => 
          enrollment.update({
            enrollment_status: 'approved',
            hod_approved_by: req.user.id,
            hod_approved_at: new Date()
          })
        )
      );
      
      res.json({
        message: `${updatedEnrollments.length} enrollment(s) approved successfully`,
        enrollments: updatedEnrollments
      });
    } catch (error) {
      console.error('Error approving enrollments:', error);
      res.status(500).json({ error: 'Failed to approve enrollments' });
    }
  }
);

// HOD: Reject enrollments
router.post('/reject',
  authenticateToken,
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
      
      // Fetch all enrollments to reject
      const enrollments = await Enrollment.findAll({
        where: { 
          id: { [Op.in]: enrollment_ids },
          enrollment_status: 'pending_hod_approval'
        },
        include: [{ model: User, as: 'student' }]
      });
      
      // Check if all enrollments belong to the HOD's department
      const validEnrollments = enrollments.filter(enrollment => 
        enrollment.student.department_id === req.user.department_id
      );
      
      if (validEnrollments.length !== enrollments.length) {
        return res.status(403).json({ 
          error: 'You can only reject enrollments for students in your department',
          rejected: validEnrollments.length,
          requested: enrollments.length
        });
      }
      
      // Update all enrollments
      const updatedEnrollments = await Promise.all(
        validEnrollments.map(enrollment => 
          enrollment.update({
            enrollment_status: 'draft',
            hod_approved_by: req.user.id,
            hod_approved_at: new Date(),
            hod_comments: rejection_reason
          })
        )
      );
      
      res.json({
        message: `${updatedEnrollments.length} enrollment(s) rejected successfully`,
        enrollments: updatedEnrollments
      });
    } catch (error) {
      console.error('Error rejecting enrollments:', error);
      res.status(500).json({ error: 'Failed to reject enrollments' });
    }
  }
);

module.exports = router;