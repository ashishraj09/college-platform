const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const { Course, Department, Degree, User } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { auditMiddleware, captureOriginalData } = require('../middleware/audit');
const { sendCourseApprovalEmail } = require('../utils/email');

// Course validation rules
const courseValidation = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Course name must be 2-150 characters'),
  body('code').trim().isLength({ min: 3, max: 15 }).withMessage('Course code must be 3-15 characters'),
  body('overview').trim().isLength({ min: 10, max: 2000 }).withMessage('Overview must be 10-2000 characters'),
  body('credits').isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1-10'),
  body('semester').isInt({ min: 1, max: 10 }).withMessage('Semester must be between 1-10'),
  body('department_id').isUUID().withMessage('Invalid department ID'),
  body('degree_id').isUUID().withMessage('Invalid degree ID'),
  body('study_details').isObject().withMessage('Study details must be an object'),
  body('faculty_details').isObject().withMessage('Faculty details must be an object'),
];

// Get all courses with optional filtering
router.get('/', 
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
  try {
    const {
      department_id,
      degree_id,
      status,
      faculty_id,
      page = 1,
      limit = 50
    } = req.query;

    const whereClause = {};
    if (department_id) whereClause.department_id = department_id;
    if (degree_id) whereClause.degree_id = degree_id;
    if (status) whereClause.status = status;
    if (faculty_id) whereClause.faculty_id = faculty_id;

    const offset = (page - 1) * limit;

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
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get faculty courses with enhanced categorization
router.get('/my-courses', 
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
  try {
    console.log('HIT /api/courses/my-courses, req.user:', req.user);
    
    // For development/testing when authentication is disabled
    const user = req.user || { 
      id: '550e8400-e29b-41d4-a716-446655440000',
      department_id: '550e8400-e29b-41d4-a716-446655440001' 
    };
    
    const courses = await Course.findAll({
      where: {
        created_by: user.id
      },
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
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Helper function to resolve instructor names
    const resolveInstructorNames = async (facultyDetails) => {
      if (!facultyDetails || typeof facultyDetails !== 'object') return facultyDetails;
      
      const resolved = { ...facultyDetails };
      
      const getInstructorName = async (instructorId) => {
        if (!instructorId || typeof instructorId !== 'string') return instructorId;
        
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(instructorId)) return instructorId;
        
        try {
          const user = await User.findByPk(instructorId, {
            attributes: ['id', 'first_name', 'last_name']
          });
          return user ? `${user.first_name} ${user.last_name}` : instructorId;
        } catch (err) {
          return instructorId;
        }
      };

      // Resolve various instructor fields
      if (resolved.primary_instructor) {
        resolved.primary_instructor = await getInstructorName(resolved.primary_instructor);
      }
      if (resolved.instructor) {
        resolved.instructor = await getInstructorName(resolved.instructor);
      }
      if (resolved.co_instructors && Array.isArray(resolved.co_instructors)) {
        resolved.co_instructors = await Promise.all(resolved.co_instructors.map(getInstructorName));
      }
      if (resolved.guest_lecturers && Array.isArray(resolved.guest_lecturers)) {
        resolved.guest_lecturers = await Promise.all(resolved.guest_lecturers.map(getInstructorName));
      }
      if (resolved.lab_instructors && Array.isArray(resolved.lab_instructors)) {
        resolved.lab_instructors = await Promise.all(resolved.lab_instructors.map(getInstructorName));
      }
      
      return resolved;
    };

    // Resolve instructor names for all courses
    for (const course of courses) {
      course.faculty_details = await resolveInstructorNames(course.faculty_details);
    }

    // Categorize courses by status
    const categorized = {
      draft: courses.filter(course => course.status === 'draft'),
      pending_approval: courses.filter(course => ['submitted', 'pending_approval'].includes(course.status)),
      approved: courses.filter(course => course.status === 'approved'),
      active: courses.filter(course => course.status === 'active'),
      others: courses.filter(course => !['draft', 'submitted', 'pending_approval', 'approved', 'active'].includes(course.status))
    };

    const summary = {
      total: courses.length,
      draft: categorized.draft.length,
      pending_approval: categorized.pending_approval.length,
      approved: categorized.approved.length,
      active: categorized.active.length
    };

    res.json({
      all: courses,
      categorized,
      summary
    });
  } catch (error) {
    console.error('Error fetching faculty courses:', error);
    res.status(500).json({ error: 'Failed to fetch faculty courses' });
  }
});

// Get all courses from faculty's department (for department overview)
router.get('/department-courses', 
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
  try {
    console.log('HIT /api/courses/department-courses, req.user:', req.user);
    
    // For development/testing when authentication is disabled
    const user = req.user || { 
      id: '550e8400-e29b-41d4-a716-446655440000',
      department_id: '550e8400-e29b-41d4-a716-446655440001' 
    };
    
    if (!user.department_id) {
      return res.status(400).json({ error: 'User department not found' });
    }

    const courses = await Course.findAll({
      where: {
        department_id: user.department_id
      },
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
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Group by status for department overview
    const coursesByStatus = {
      draft: courses.filter(course => course.status === 'draft'),
      pending_approval: courses.filter(course => ['submitted', 'pending_approval'].includes(course.status)),
      approved: courses.filter(course => course.status === 'approved'),
      active: courses.filter(course => course.status === 'active'),
      others: courses.filter(course => !['draft', 'submitted', 'pending_approval', 'approved', 'active'].includes(course.status))
    };

    res.json({
      all: courses,
      byStatus: coursesByStatus,
      departmentInfo: courses.length > 0 ? {
        id: courses[0].department.id,
        name: courses[0].department.name,
        code: courses[0].department.code
      } : null,
      summary: {
        total: courses.length,
        draft: coursesByStatus.draft.length,
        pending_approval: coursesByStatus.pending_approval.length,
        approved: coursesByStatus.approved.length,
        active: coursesByStatus.active.length,
        others: coursesByStatus.others.length
      }
    });
  } catch (error) {
    console.error('Error fetching department courses:', error);
    res.status(500).json({ error: 'Failed to fetch department courses' });
  }
});

//Get course by ID
router.get('/:id',
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
    try {
      const course = await Course.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'department' },
          { model: Degree, as: 'degree' },
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Resolve faculty UUIDs to names
      if (course.faculty_details && typeof course.faculty_details === 'object') {
        const facultyDetails = { ...course.faculty_details };
        
        // Helper function to get instructor name by ID
        const getInstructorName = async (instructorId) => {
          if (!instructorId || typeof instructorId !== 'string') return instructorId;
          
          // Check if it's a UUID pattern
          const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidPattern.test(instructorId)) return instructorId;
          
          try {
            const user = await User.findByPk(instructorId, {
              attributes: ['id', 'first_name', 'last_name']
            });
            return user ? `${user.first_name} ${user.last_name}` : instructorId;
          } catch (err) {
            console.error('Error fetching instructor:', err);
            return instructorId;
          }
        };

        // Resolve primary instructor
        if (facultyDetails.primary_instructor) {
          facultyDetails.primary_instructor = await getInstructorName(facultyDetails.primary_instructor);
        }
        if (facultyDetails.instructor) {
          facultyDetails.instructor = await getInstructorName(facultyDetails.instructor);
        }

        // Resolve co-instructors
        if (facultyDetails.co_instructors && Array.isArray(facultyDetails.co_instructors)) {
          facultyDetails.co_instructors = await Promise.all(
            facultyDetails.co_instructors.map(getInstructorName)
          );
        }

        // Resolve guest lecturers  
        if (facultyDetails.guest_lecturers && Array.isArray(facultyDetails.guest_lecturers)) {
          facultyDetails.guest_lecturers = await Promise.all(
            facultyDetails.guest_lecturers.map(getInstructorName)
          );
        }

        // Resolve lab instructors
        if (facultyDetails.lab_instructors && Array.isArray(facultyDetails.lab_instructors)) {
          facultyDetails.lab_instructors = await Promise.all(
            facultyDetails.lab_instructors.map(getInstructorName)
          );
        }

        // Update the course object
        course.faculty_details = facultyDetails;
      }

      res.json({ course });
    } catch (error) {
      console.error('Error fetching course:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Create new course (Faculty only)
router.post('/',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('faculty'), // Temporarily disabled for testing
  courseValidation,
  handleValidationErrors,
  auditMiddleware('create', 'course', 'Course created'),
  async (req, res) => {
    try {
      const {
        name,
        code,
        overview,
        study_details,
        faculty_details,
        credits,
        semester,
        prerequisites,
        max_students,
        department_id,
        degree_id,
        is_elective = false,
      } = req.body;

      // Verify department and degree exist and belong to user's department
      const department = await Department.findByPk(department_id);
      if (!department) {
        return res.status(400).json({ error: 'Department not found' });
      }

      const degree = await Degree.findOne({
        where: { id: degree_id, department_id },
      });
      if (!degree) {
        return res.status(400).json({ error: 'Degree not found in specified department' });
      }

      // Check for duplicate course code
      const existingCourse = await Course.findOne({ where: { code: code.toUpperCase() } });
      if (existingCourse) {
        return res.status(409).json({ error: 'Course code already exists' });
      }

      // Create course
      const course = await Course.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        overview: overview.trim(),
        study_details,
        faculty_details,
        credits,
        semester,
        prerequisites: prerequisites || [],
        max_students,
        department_id,
        degree_id,
        is_elective,
        created_by: req.user?.id || '550e8400-e29b-41d4-a716-446655440000', // Temporary for testing
        status: 'draft',
      });

      // Fetch course with associations
      const createdCourse = await Course.findByPk(course.id, {
        include: [
          { model: Department, as: 'department' },
          { model: Degree, as: 'degree' },
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });

      res.status(201).json({
        message: 'Course created successfully',
        course: createdCourse,
      });
    } catch (error) {
      console.error('Error creating course:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Course with this code already exists' });
      }
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors.map(e => ({ field: e.path, message: e.message })),
        });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Submit course for approval (Faculty only)
router.patch('/:id/submit',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('faculty'), // Temporarily disabled for testing
  auditMiddleware('update', 'course', 'Course submitted for approval'),
  async (req, res) => {
    try {
      const course = await Course.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'department' },
          { model: User, as: 'creator' },
        ],
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Only course creator can submit
      if (course.created_by !== (req.user?.id || '550e8400-e29b-41d4-a716-446655440000')) {
        return res.status(403).json({ error: 'Only course creator can submit for approval' });
      }

      if (course.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft courses can be submitted' });
      }

      await course.update({ status: 'pending_approval' });

      // Find HOD of the department
      const hod = await User.findOne({
        where: {
          department_id: course.department_id,
          user_type: 'faculty',
          is_head_of_department: true,
        },
      });

      // Send approval email to HOD if found
      if (hod) {
        try {
          await sendCourseApprovalEmail(course, hod);
        } catch (emailError) {
          console.error('Failed to send course approval email:', emailError);
        }
      }

      res.json({
        message: 'Course submitted for approval successfully',
        course,
      });
    } catch (error) {
      console.error('Error submitting course:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Approve course (HOD only)
router.patch('/:id/approve',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('faculty'), // Only faculty (HOD) can approve
  auditMiddleware('update', 'course', 'Course approved'),
  async (req, res) => {
    try {
      const course = await Course.findByPk(req.params.id);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Verify user is HOD of the course's department
      const user = req.user || { department_id: course.department_id, is_head_of_department: true }; // Temp for testing
      if (user.department_id !== course.department_id || !user.is_head_of_department) {
        return res.status(403).json({ error: 'Only Head of Department can approve courses' });
      }

      if (course.status !== 'pending_approval') {
        return res.status(400).json({ error: 'Only pending approval courses can be approved' });
      }

      await course.update({
        status: 'approved',
        approved_by: user.id || '550e8400-e29b-41d4-a716-446655440000',
        approved_at: new Date(),
      });

      res.json({
        message: 'Course approved successfully',
        course,
      });
    } catch (error) {
      console.error('Error approving course:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Reject course (HOD only)
router.patch('/:id/reject',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('faculty'), // Only faculty (HOD) can reject
  [body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Rejection reason is required (10-500 characters)')],
  handleValidationErrors,
  auditMiddleware('update', 'course', 'Course rejected'),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const course = await Course.findByPk(req.params.id);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Verify user is HOD of the course's department
      const user = req.user || { department_id: course.department_id, is_head_of_department: true }; // Temp for testing
      if (user.department_id !== course.department_id || !user.is_head_of_department) {
        return res.status(403).json({ error: 'Only Head of Department can reject courses' });
      }

      if (course.status !== 'pending_approval') {
        return res.status(400).json({ error: 'Only pending approval courses can be rejected' });
      }

      await course.update({
        status: 'draft',
        rejection_reason: reason,
      });

      res.json({
        message: 'Course rejected successfully',
        course,
      });
    } catch (error) {
      console.error('Error rejecting course:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update course (Faculty - creator only)
router.put('/:id',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('faculty'), // Temporarily disabled for testing
  courseValidation,
  handleValidationErrors,
  captureOriginalData(Course, 'id'),
  auditMiddleware('update', 'course', 'Course updated'),
  async (req, res) => {
    try {
      const course = await Course.findByPk(req.params.id);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Only course creator can update (except admins)
      if (course.created_by !== (req.user?.id || '550e8400-e29b-41d4-a716-446655440000') && req.user?.user_type !== 'admin') {
        return res.status(403).json({ error: 'Only course creator can update this course' });
      }

      // Can't update approved courses without changing status
      if (['approved', 'active'].includes(course.status)) {
        return res.status(400).json({ error: 'Cannot update approved/active courses directly' });
      }

      const updatedFields = {};
      const allowedFields = [
        'name', 'code', 'overview', 'study_details', 'faculty_details',
        'credits', 'semester', 'prerequisites', 'max_students', 'is_elective'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updatedFields[field] = req.body[field];
        }
      });

      if (updatedFields.code) {
        updatedFields.code = updatedFields.code.toUpperCase();
      }

      await course.update(updatedFields);

      const updatedCourse = await Course.findByPk(course.id, {
        include: [
          { model: Department, as: 'department' },
          { model: Degree, as: 'degree' },
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });

      res.json({
        message: 'Course updated successfully',
        course: updatedCourse,
      });
    } catch (error) {
      console.error('Error updating course:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Course with this code already exists' });
      }
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors.map(e => ({ field: e.path, message: e.message })),
        });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete course (Faculty - creator only, Admin)
router.delete('/:id',
  // authenticateToken, // Temporarily disabled for testing  
  // authorizeRoles('faculty', 'admin'), // Temporarily disabled for testing
  captureOriginalData(Course, 'id'),
  auditMiddleware('delete', 'course', 'Course deleted'),
  async (req, res) => {
    try {
      const course = await Course.findByPk(req.params.id);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Only course creator or admin can delete
      if (course.created_by !== (req.user?.id || '550e8400-e29b-41d4-a716-446655440000') && req.user?.user_type !== 'admin') {
        return res.status(403).json({ error: 'Only course creator or admin can delete this course' });
      }

      // Can't delete active courses with enrollments
      if (course.status === 'active') {
        const enrollmentCount = await course.countEnrollments();
        if (enrollmentCount > 0) {
          return res.status(400).json({ error: 'Cannot delete active course with enrollments' });
        }
      }

      await course.destroy();

      res.json({ message: 'Course deleted successfully' });
    } catch (error) {
      console.error('Error deleting course:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
