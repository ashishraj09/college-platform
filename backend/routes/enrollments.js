const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const { Enrollment, EnrollmentDraft, Course, User, Department, Degree } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Get student's enrollments
router.get('/my-enrollments',
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
    try {
      // For testing, we'll use a mock user - in real app this comes from auth token
      const mockUser = {
        id: 'aa1f87d8-d895-4f46-a6ba-2157a6154f49',
        user_type: 'student',
        department_id: '550e8400-e29b-41d4-a716-446655440001',
        degree_id: 'c5989675-11a5-4f02-aeee-6d0cacd988aa',
        enrolled_year: 2024
      };

      const { academic_year, status } = req.query;

      const whereClause = { student_id: mockUser.id };
      if (academic_year) whereClause.academic_year = academic_year;
      if (status) whereClause.enrollment_status = status;

      const enrollments = await Enrollment.findAll({
        where: whereClause,
        include: [
          {
            model: Course,
            as: 'course',
            include: [
              {
                model: Department,
                as: 'department',
                attributes: ['id', 'name', 'code']
              },
              {
                model: Degree,
                as: 'degree',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          {
            model: User,
            as: 'hodApprover',
            attributes: ['id', 'first_name', 'last_name', 'email'],
            required: false
          },
          {
            model: User,
            as: 'officeApprover',
            attributes: ['id', 'first_name', 'last_name', 'email'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json(enrollments);
    } catch (error) {
      console.error('Error fetching student enrollments:', error);
      res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
  }
);

// Get student's degree courses by semester
router.get('/my-degree-courses',
  // authenticateToken, // Temporarily disabled for testing  
  async (req, res) => {
    try {
      // For testing, we'll use a mock user - in real app this comes from auth token
      const mockUser = {
        id: 'aa1f87d8-d895-4f46-a6ba-2157a6154f49',
        user_type: 'student',
        department_id: '550e8400-e29b-41d4-a716-446655440001',
        degree_id: 'c5989675-11a5-4f02-aeee-6d0cacd988aa',
        enrolled_year: 2024,
        current_semester: 3 // Add current semester to mock user
      };

      const { semester } = req.query;

      // Get user's degree information
      const user = await User.findByPk(mockUser.id, {
        include: [
          {
            model: Degree,
            as: 'degree',
            include: [
              {
                model: Department,
                as: 'department'
              }
            ]
          }
        ]
      });

      if (!user || !user.degree) {
        return res.status(400).json({ error: 'Student degree information not found' });
      }

      // Get courses for the student's degree (all semesters)
      const whereClause = {
        degree_id: user.degree.id,
        status: 'active'
        // Remove semester filter to get all courses
      };

      const courses = await Course.findAll({
        where: whereClause,
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name', 'code']
          },
          {
            model: Degree,
            as: 'degree',
            attributes: ['id', 'name', 'code']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ],
        order: [['semester', 'ASC'], ['name', 'ASC']]
      });

      // Get student's existing enrollments to mark already enrolled courses
      const existingEnrollments = await Enrollment.findAll({
        where: { 
          student_id: mockUser.id,
          enrollment_status: ['pending_hod_approval', 'pending_office_approval', 'approved', 'rejected']
        },
        attributes: ['course_id', 'enrollment_status', 'rejection_reason', 'hod_approved_at', 'office_approved_at']
      });

      const enrolledCourseIds = existingEnrollments
        .filter(e => e.enrollment_status !== 'rejected')
        .map(e => e.course_id);

      // Add enrollment status to courses
      const coursesWithEnrollmentStatus = courses.map(course => {
        const enrollment = existingEnrollments.find(e => e.course_id === course.id);
        return {
          ...course.toJSON(),
          isEnrolled: enrolledCourseIds.includes(course.id),
          enrollmentStatus: enrollment?.enrollment_status || null,
          rejectionReason: enrollment?.rejection_reason || null,
          conversationMessages: [], // Empty array since this column doesn't exist yet
          hodApprovedAt: enrollment?.hod_approved_at || null,
          officeApprovedAt: enrollment?.office_approved_at || null
        };
      });

      res.json({
        degree: user.degree,
        student: {
          current_semester: mockUser.current_semester,
          enrolled_year: mockUser.enrolled_year
        },
        courses: coursesWithEnrollmentStatus,
        enrollment_start_at: user.degree.enrollment_start_dates?.[mockUser.current_semester?.toString()] || null,
        enrollment_end_at: user.degree.enrollment_end_dates?.[mockUser.current_semester?.toString()] || null
      });
    } catch (error) {
      console.error('Error fetching degree courses:', error);
      res.status(500).json({ error: 'Failed to fetch degree courses' });
    }
  }
);

// Create enrollment request
router.post('/enroll',
  [
    body('course_ids').isArray({ min: 1 }).withMessage('At least one course must be selected'),
    body('course_ids.*').isUUID().withMessage('Invalid course ID'),
    body('academic_year').matches(/^\d{4}-\d{4}$/).withMessage('Academic year must be in format YYYY-YYYY'),
    body('semester').isInt({ min: 1, max: 2 }).withMessage('Semester must be 1 or 2'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      // For testing, we'll use a mock user - in real app this comes from auth token
      const mockUser = {
        id: 'aa1f87d8-d895-4f46-a6ba-2157a6154f49',
        user_type: 'student',
        department_id: '550e8400-e29b-41d4-a716-446655440001',
        degree_id: 'c5989675-11a5-4f02-aeee-6d0cacd988aa',
        enrolled_year: 2024
      };

      const { course_ids, academic_year, semester } = req.body;

      // Check if courses exist and are active
      const courses = await Course.findAll({
        where: {
          id: { [Op.in]: course_ids },
          status: 'active'
        },
        include: [
          {
            model: Department,
            as: 'department'
          }
        ]
      });

      if (courses.length !== course_ids.length) {
        return res.status(400).json({ error: 'One or more courses not found or not active' });
      }

      // Check for existing enrollments
      const existingEnrollments = await Enrollment.findAll({
        where: {
          student_id: mockUser.id,
          course_id: { [Op.in]: course_ids },
          academic_year,
          semester
        }
      });

      if (existingEnrollments.length > 0) {
        return res.status(400).json({ 
          error: 'Already enrolled or have pending enrollment for one or more courses',
          existing: existingEnrollments.map(e => e.course_id)
        });
      }

      // Create enrollment records
      const enrollmentData = course_ids.map(course_id => ({
        student_id: mockUser.id,
        course_id,
        academic_year,
        semester,
        enrollment_status: 'pending_hod_approval'
      }));

      const newEnrollments = await Enrollment.bulkCreate(enrollmentData);

      // Fetch created enrollments with course details
      const enrollments = await Enrollment.findAll({
        where: { 
          id: { [Op.in]: newEnrollments.map(e => e.id) }
        },
        include: [
          {
            model: Course,
            as: 'course',
            include: [
              {
                model: Department,
                as: 'department',
                attributes: ['id', 'name', 'code']
              },
              {
                model: Degree,
                as: 'degree',
                attributes: ['id', 'name', 'code']
              }
            ]
          }
        ]
      });

      res.status(201).json({
        message: `Successfully submitted enrollment request for ${course_ids.length} courses`,
        enrollments
      });
    } catch (error) {
      console.error('Error creating enrollments:', error);
      res.status(500).json({ error: 'Failed to create enrollment requests' });
    }
  }
);

// Get all university courses organized by department and degree
router.get('/university-courses',
  async (req, res) => {
    try {
      const { department_id } = req.query;

      // Get departments with degrees and courses
      const whereClause = {};
      if (department_id) whereClause.id = department_id;

      const departments = await Department.findAll({
        where: whereClause,
        include: [
          {
            model: Degree,
            as: 'degrees',
            where: { status: 'active' },
            required: false,
            include: [
              {
                model: Course,
                as: 'courses',
                where: { status: 'active' },
                required: false,
                include: [
                  {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'first_name', 'last_name']
                  }
                ]
              }
            ]
          }
        ],
        order: [
          ['name', 'ASC'],
          [{ model: Degree, as: 'degrees' }, 'name', 'ASC'],
          [{ model: Degree, as: 'degrees' }, { model: Course, as: 'courses' }, 'semester', 'ASC'],
          [{ model: Degree, as: 'degrees' }, { model: Course, as: 'courses' }, 'name', 'ASC']
        ]
      });

      res.json(departments);
    } catch (error) {
      console.error('Error fetching university courses:', error);
      res.status(500).json({ error: 'Failed to fetch university courses' });
    }
  }
);

// Get or create enrollment draft for current semester
router.get('/draft',
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
    try {
      const mockUser = {
        id: 'aa1f87d8-d895-4f46-a6ba-2157a6154f49',
        current_semester: 3
      };

      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;

      let draft = await EnrollmentDraft.findOne({
        where: {
          student_id: mockUser.id,
          academic_year: academicYear,
          semester: mockUser.current_semester
        }
      });

      if (!draft) {
        draft = await EnrollmentDraft.create({
          student_id: mockUser.id,
          academic_year: academicYear,
          semester: mockUser.current_semester,
          course_ids: []
        });
      }

      res.json(draft);
    } catch (error) {
      console.error('Error fetching enrollment draft:', error);
      res.status(500).json({ error: 'Failed to fetch enrollment draft' });
    }
  }
);

// Save enrollment draft (can be called multiple times)
router.put('/draft',
  [
    body('course_ids').isArray().withMessage('Course IDs must be an array'),
    body('course_ids.*').isUUID().withMessage('Invalid course ID'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const mockUser = {
        id: 'aa1f87d8-d895-4f46-a6ba-2157a6154f49',
        current_semester: 3
      };

      const { course_ids } = req.body;
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;

      // Find or create draft
      let draft = await EnrollmentDraft.findOne({
        where: {
          student_id: mockUser.id,
          academic_year: academicYear,
          semester: mockUser.current_semester
        }
      });

      if (!draft) {
        draft = await EnrollmentDraft.create({
          student_id: mockUser.id,
          academic_year: academicYear,
          semester: mockUser.current_semester,
          course_ids: course_ids,
          is_submitted: false
        });
      } else {
        // Allow updates if:
        // 1. Not submitted yet, OR
        // 2. Previous submission was rejected (allow resubmission)
        const hasRejectedEnrollments = await Enrollment.findOne({
          where: {
            student_id: mockUser.id,
            academic_year: academicYear,
            semester: mockUser.current_semester,
            enrollment_status: 'rejected'
          }
        });

        if (!draft.is_submitted || hasRejectedEnrollments) {
          await draft.update({
            course_ids: course_ids,
            is_submitted: false // Reset submission status for resubmission
          });
        } else {
          return res.status(400).json({ error: 'Cannot modify submitted enrollment that is still under review' });
        }
      }

      res.json({ message: 'Draft saved successfully', draft });
    } catch (error) {
      console.error('Error saving enrollment draft:', error);
      res.status(500).json({ error: 'Failed to save enrollment draft' });
    }
  }
);

// Submit enrollment draft to HOD
router.post('/draft/submit',
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
    try {
      const mockUser = {
        id: 'aa1f87d8-d895-4f46-a6ba-2157a6154f49',
        current_semester: 3
      };

      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;

      // Check if student already has active enrollment requests
      const activeEnrollments = await Enrollment.findAll({
        where: {
          student_id: mockUser.id,
          academic_year: academicYear,
          semester: mockUser.current_semester,
          enrollment_status: ['pending_hod_approval', 'pending_office_approval']
        }
      });

      if (activeEnrollments.length > 0) {
        return res.status(400).json({ 
          error: 'You already have an active enrollment request pending approval. Please wait for it to be processed before submitting a new request.',
          activeEnrollments: activeEnrollments.length
        });
      }

      const draft = await EnrollmentDraft.findOne({
        where: {
          student_id: mockUser.id,
          academic_year: academicYear,
          semester: mockUser.current_semester
        }
      });

      if (!draft) {
        return res.status(404).json({ error: 'No draft found' });
      }

      if (draft.is_submitted) {
        return res.status(400).json({ error: 'Draft already submitted' });
      }

      if (!draft.course_ids || draft.course_ids.length === 0) {
        return res.status(400).json({ error: 'No courses selected' });
      }

      // Create or update enrollment records with pending status
      const enrollmentPromises = draft.course_ids.map(async (courseId) => {
        // Check if enrollment already exists
        const existingEnrollment = await Enrollment.findOne({
          where: {
            student_id: mockUser.id,
            course_id: courseId,
            academic_year: academicYear,
            semester: mockUser.current_semester
          }
        });

        if (existingEnrollment) {
          // Update existing enrollment (e.g., resubmitting after rejection)
          return await existingEnrollment.update({
            enrollment_status: 'pending_hod_approval',
            rejection_reason: null, // Clear any previous rejection reason
            hod_approved_by: null,
            hod_approved_at: null
          });
        } else {
          // Create new enrollment
          return await Enrollment.create({
            student_id: mockUser.id,
            course_id: courseId,
            academic_year: academicYear,
            semester: mockUser.current_semester,
            enrollment_status: 'pending_hod_approval'
          });
        }
      });

      await Promise.all(enrollmentPromises);

      // Mark draft as submitted
      await draft.update({
        is_submitted: true,
        submitted_at: new Date()
      });

      res.json({ message: 'Enrollment submitted for HOD approval' });
    } catch (error) {
      console.error('Error submitting enrollment:', error);
      res.status(500).json({ error: 'Failed to submit enrollment' });
    }
  }
);

// Check if student has active enrollment requests
router.get('/active-status',
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
    try {
      const mockUser = {
        id: 'aa1f87d8-d895-4f46-a6ba-2157a6154f49',
        current_semester: 3
      };

      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;

      // Check for active enrollment requests
      const activeEnrollments = await Enrollment.findAll({
        where: {
          student_id: mockUser.id,
          academic_year: academicYear,
          semester: mockUser.current_semester,
          enrollment_status: ['pending_hod_approval', 'pending_office_approval']
        },
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['name', 'code', 'credits']
          }
        ]
      });

      const hasActiveEnrollment = activeEnrollments.length > 0;

      res.json({
        hasActiveEnrollment,
        activeEnrollments: activeEnrollments.map(enrollment => ({
          id: enrollment.id,
          courseId: enrollment.course_id,
          courseName: enrollment.Course.name,
          courseCode: enrollment.Course.code,
          status: enrollment.enrollment_status,
          submittedAt: enrollment.created_at
        })),
        count: activeEnrollments.length
      });
    } catch (error) {
      console.error('Error checking active enrollment status:', error);
      res.status(500).json({ error: 'Failed to check enrollment status' });
    }
  }
);

// HOD endpoints for enrollment approval
router.get('/pending-approvals',
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
    try {
      const mockHOD = {
        id: '550e8400-e29b-41d4-a716-446655440002', // Valid UUID for mock HOD
        department_id: '550e8400-e29b-41d4-a716-446655440001'
      };

      const { degree_id, semester, search } = req.query;

      const whereClause = {
        enrollment_status: 'pending_hod_approval'
      };

      const includeClause = [
        {
          model: User,
          as: 'student',
          where: {
            department_id: mockHOD.department_id
          },
          include: [
            {
              model: Degree,
              as: 'degree',
              ...(degree_id && { where: { id: degree_id } })
            }
          ]
        },
        {
          model: Course,
          as: 'course',
          ...(semester && { where: { semester: parseInt(semester) } })
        }
      ];

      // Add search filter if provided
      if (search) {
        includeClause[0].where = {
          ...includeClause[0].where,
          [Op.or]: [
            { first_name: { [Op.iLike]: `%${search}%` } },
            { last_name: { [Op.iLike]: `%${search}%` } },
            { student_id: { [Op.iLike]: `%${search}%` } }
          ]
        };
      }

      const pendingEnrollments = await Enrollment.findAll({
        where: whereClause,
        include: includeClause,
        order: [
          ['createdAt', 'ASC'],
          [{ model: User, as: 'student' }, 'first_name', 'ASC']
        ]
      });

      // Group by student and academic year/semester
      const groupedEnrollments = pendingEnrollments.reduce((acc, enrollment) => {
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

// HOD approve/reject enrollment
router.post('/hod-decision',
  [
    body('enrollment_ids').isArray({ min: 1 }).withMessage('At least one enrollment must be selected'),
    body('enrollment_ids.*').isUUID().withMessage('Invalid enrollment ID'),
    body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
    body('rejection_reason').optional().isLength({ min: 1 }).withMessage('Rejection reason required when rejecting'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const mockHOD = {
        id: '550e8400-e29b-41d4-a716-446655440002' // Valid UUID for mock HOD
      };

      const { enrollment_ids, action, rejection_reason } = req.body;

      const updateData = {
        hod_approved_at: new Date()
      };

      if (action === 'approve') {
        updateData.enrollment_status = 'pending_office_approval';
      } else {
        updateData.enrollment_status = 'rejected';
        updateData.rejection_reason = rejection_reason;
      }

      await Enrollment.update(updateData, {
        where: {
          id: { [Op.in]: enrollment_ids },
          enrollment_status: 'pending_hod_approval'
        }
      });

      res.json({ 
        message: `Enrollments ${action}${action === 'approve' ? 'd' : 'ed'} successfully` 
      });
    } catch (error) {
      console.error('Error processing HOD decision:', error);
      res.status(500).json({ error: 'Failed to process decision' });
    }
  }
);

module.exports = router;
