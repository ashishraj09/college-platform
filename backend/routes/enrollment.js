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
    body('semester').isInt({ min: 1 }).withMessage('Semester must be a positive integer'),
    body('department_code').isString().withMessage('Department code is required'),
    body('degree_code').isString().withMessage('Degree code is required')
  ],
  authenticateToken,
  handleValidationErrors,
  async (req, res) => {
    try {
  const { user_id, course_codes, academic_year, semester, department_code, degree_code } = req.body;
      
      // Ensure the user can only enroll for themselves
      if (req.user.user_type !== 'admin' && user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only create enrollments for yourself' });
      }

      // Get the student's degree and department
      const student = await User.findByPk(user_id || req.user.id, {
        include: [
          { model: Degree, as: 'degree', where: { code: degree_code } },
          { model: Department, as: 'department', where: { code: department_code } }
        ]
      });

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (!student.degree) {
        return res.status(400).json({ error: 'Student is not enrolled in the specified degree program' });
      }

      if (!student.department) {
        return res.status(400).json({ error: 'Student is not enrolled in the specified department' });
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
          degree_id: student.degree_id,
          department_id: student.department_id
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
        course_codes: courses.map(c => c.code),
        academic_year,
        semester,
        department_code,
        degree_code,
        enrollment_status: 'draft'
      });

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
      // Just return the draft with course_codes
      res.json(drafts.map(draft => draft.toJSON()));
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
        // Use course_codes to fetch course details
        const courses = await Course.findAll({
          where: { code: { [Op.in]: enrollmentJson.course_codes || [] } }
        });
        // Create individual enrollment objects for each course
        return courses.map(course => ({
          ...enrollmentJson,
          course: {
            id: course.id,
            name: course.name,
            code: course.code,
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

      // Return an array of grouped enrollments (frontend expects an array)
      res.json(Object.values(groupedEnrollments));
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
      const enrollments = await Enrollment.findAll({
        where: {
          id: { [Op.in]: enrollment_ids },
          enrollment_status: 'pending_hod_approval'
        },
        include: [{ model: User, as: 'student' }]
      });
      // Filter enrollments to only those in HOD's department
      const validEnrollments = enrollments.filter(e => e.student.department_id === req.user.department_id);
      if (validEnrollments.length === 0) {
        return res.status(404).json({ error: 'No valid enrollments found for approval' });
      }
      // Approve all valid enrollments
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

// Helper function for finding degrees with multiple matching strategies
const findDegreeByCode = async (codeStr) => {
  try {
    // Try exact match first
    let degree = await Degree.findOne({ where: { code: codeStr } });

    // Case-insensitive match
    if (!degree) {
      degree = await Degree.findOne({ where: { code: { [Op.iLike]: codeStr } } });
    }

    // Fallback: alphanumeric-only match
    if (!degree) {
      const simplifiedCode = codeStr.replace(/[^a-zA-Z0-9]/g, '');
      if (simplifiedCode) {
        degree = await Degree.findOne({ where: { code: { [Op.iLike]: `%${simplifiedCode}%` } } });
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
  async (req, res) => {
    try {
      const { code } = req.params;
      const { semester, academic_year, status } = req.query;

      // Normalize and trim the degree code
      const codeStr = String(code || '').trim();
      console.log(`Looking up degree for code: ${codeStr}`);

      // Find degree using multiple strategies
      let degree = await findDegreeByCode(codeStr);

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
            where: { name: { [Op.iLike]: `%${codeStr}%` } },
            limit: 10
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

          // Fetch all active courses for this degree and semester
          const courseWhere = { degree_id: degree.id, status: 'active' };
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
      console.error('Error fetching enrollments by degree code:', error);
      res.status(500).json({ error: 'Failed to fetch enrollments for degree' });
    }
  }
);

module.exports = router;