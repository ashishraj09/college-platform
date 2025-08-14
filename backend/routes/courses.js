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
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name', 'email'],
          required: false
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
    const { userId, departmentId } = req.query;
    
    // For development/testing when authentication is disabled
    const user = req.user || { 
      id: userId,
      department_id: departmentId,
      user_type: 'faculty',
      is_head_of_department: false
    };

    // Validate that we have user context
    if (!user.id || !user.department_id) {
      return res.status(400).json({ error: 'User context required - missing userId or departmentId parameters' });
    }
    
    // HODs and admins see all courses in their department, regular faculty see only their own courses
    const whereClause = {};
    if (user.user_type === 'admin') {
      // Admin sees all courses (no filter)
    } else if (user.is_head_of_department || user.user_type === 'office') {
      // HODs and office staff see all courses in their department
      whereClause.department_id = user.department_id;
    } else {
      // Regular faculty see only their own courses
      whereClause.created_by = user.id;
    }
    
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
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'first_name', 'last_name'],
          required: false
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name'],
          required: false
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
    const { userId, departmentId } = req.query;
    
    // For development/testing when authentication is disabled
    const user = req.user || { 
      id: userId,
      department_id: departmentId
    };

    // Validate that we have user context
    if (!user.department_id) {
      return res.status(400).json({ error: 'User context required - missing departmentId parameter' });
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
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'first_name', 'last_name'],
          required: false
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'first_name', 'last_name'],
          required: false
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
          { model: User, as: 'updater', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Check if we should resolve faculty UUIDs to names (default: true, false for editing)
      const resolveNames = req.query.resolve_names !== 'false';
      
      // If resolve_names=false (editing mode), apply edit validation
      if (!resolveNames) {
        let canEdit = true;
        let reason = '';

        // For active courses, check if there are newer versions in draft, pending approval, or approved status
        if (course.status === 'active') {
          const newerVersions = await Course.findAll({
            where: {
              [Op.or]: [
                { parent_course_id: course.parent_course_id || course.id },
                { parent_course_id: course.id }
              ],
              version: { [Op.gt]: course.version },
              status: { [Op.in]: ['draft', 'pending_approval', 'approved'] }
            },
          });

          if (newerVersions.length > 0) {
            canEdit = false;
            const statuses = [...new Set(newerVersions.map(v => v.status))].join(', ');
            reason = `Cannot edit this active course (version ${course.version}) because newer version(s) exist with status: ${statuses}. Please work with the latest version or wait for the newer version to be processed.`;
          }
        }

        // If course cannot be edited, return error
        if (!canEdit) {
          return res.status(403).json({ 
            error: 'Course cannot be edited',
            reason: reason,
            canEdit: false,
            courseStatus: course.status,
            isLatestVersion: course.is_latest_version,
            version: course.version,
            newerVersionsCount: reason.includes('newer version(s) exist') ? 1 : 0
          });
        }
      }
      
      // Resolve faculty UUIDs to names only if requested
      if (resolveNames && course.faculty_details && typeof course.faculty_details === 'object') {
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

// Get course for editing (dedicated endpoint)
router.get('/:id/edit',
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
    try {
      const resolveNames = req.query.resolve_names !== 'false'; // Default to true
      
      const course = await Course.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'department' },
          { model: Degree, as: 'degree' },
          { model: User, as:'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'updater', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Check if course can be edited - same validation as can-edit endpoint
      let canEdit = true;
      let reason = '';

      // For active courses, check if there are newer versions in draft, pending approval, or approved status
      if (course.status === 'active') {
        const newerVersions = await Course.findAll({
          where: {
            [Op.or]: [
              { parent_course_id: course.parent_course_id || course.id },
              { parent_course_id: course.id }
            ],
            version: { [Op.gt]: course.version },
            status: { [Op.in]: ['draft', 'pending_approval', 'approved'] }
          },
        });

        if (newerVersions.length > 0) {
          canEdit = false;
          const statuses = [...new Set(newerVersions.map(v => v.status))].join(', ');
          reason = `Cannot edit this active course (version ${course.version}) because newer version(s) exist with status: ${statuses}. Please work with the latest version or wait for the newer version to be processed.`;
        }
      }

      // If course cannot be edited, return error
      if (!canEdit) {
        return res.status(403).json({ 
          error: 'Course cannot be edited',
          reason: reason,
          canEdit: false,
          courseStatus: course.status,
          isLatestVersion: course.is_latest_version,
          version: course.version,
          newerVersionsCount: reason.includes('newer version(s) exist') ? 1 : 0
        });
      }

      // Resolve faculty UUIDs to names if requested (same logic as main GET route)
      if (resolveNames && course.faculty_details && typeof course.faculty_details === 'object') {
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

        // Process instructors
        if (facultyDetails.instructors && Array.isArray(facultyDetails.instructors)) {
          for (let i = 0; i < facultyDetails.instructors.length; i++) {
            if (facultyDetails.instructors[i].instructorId) {
              facultyDetails.instructors[i].instructorId = await getInstructorName(facultyDetails.instructors[i].instructorId);
            }
          }
        }

        // Process coordinator
        if (facultyDetails.coordinator && facultyDetails.coordinator.coordinatorId) {
          facultyDetails.coordinator.coordinatorId = await getInstructorName(facultyDetails.coordinator.coordinatorId);
        }

        // Update course with resolved names
        course.faculty_details = facultyDetails;
      }

      // Return course data - with or without name resolution based on resolveNames parameter
      res.json({ course });
    } catch (error) {
      console.error('Error fetching course for editing:', error);
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

      // Faculty can only create courses in their own department (temporarily bypassed for testing)
      const user = req.user || { department_id, user_type: 'faculty' }; // Temp for testing
      if (user.user_type !== 'admin' && user.department_id !== department_id) {
        return res.status(403).json({ error: 'Can only create courses in your own department' });
      }

      const degree = await Degree.findOne({
        where: { id: degree_id, department_id },
      });
      if (!degree) {
        return res.status(400).json({ error: 'Degree not found in specified department' });
      }

      // Check for duplicate course code + version combination
      const existingCourse = await Course.findOne({ 
        where: { 
          code: code.toUpperCase(),
          version: 1 // For new courses, check if version 1 already exists
        } 
      });
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
        created_by: req.user?.id || req.body.userId,
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

// Create new version of existing course (Faculty only)
router.post('/:id/create-version',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('faculty'), // Temporarily disabled for testing
  auditMiddleware('create', 'course', 'Course version created'),
  async (req, res) => {
    try {
      // Get original course without resolving instructor names to preserve UUIDs
      const originalCourse = await Course.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'department' },
          { model: Degree, as: 'degree' },
        ],
      });

      if (!originalCourse) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Only allow versioning for approved or active courses
      if (!['approved', 'active'].includes(originalCourse.status)) {
        return res.status(400).json({ 
          error: 'Can only create versions from approved or active courses' 
        });
      }

      // Verify user is the creator or has permission
      const user = req.user || { 
        id: req.body.userId || originalCourse.created_by, 
        user_type: 'faculty' 
      };
      
      if (originalCourse.created_by !== user.id && user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to create versions of this course' });
      }

      // Find the highest version number for this course family
      const maxVersionCourse = await Course.findOne({
        where: {
          [Op.or]: [
            { id: req.params.id },
            { parent_course_id: req.params.id },
          ],
        },
        order: [['version', 'DESC']],
      });

      const nextVersion = (maxVersionCourse?.version || 1) + 1;

      // Get the base course code (without version suffix)
      // If this is already a versioned course, get the original parent's code
      let baseCode;
      if (originalCourse.parent_course_id) {
        // This is already a version, get the original parent course
        const parentCourse = await Course.findByPk(originalCourse.parent_course_id);
        baseCode = parentCourse ? parentCourse.code : originalCourse.code.replace(/_V\d+$/, '');
      } else {
        // This is the original course, use its code directly
        baseCode = originalCourse.code;
      }
      
      // Create new course version
      const newCourseData = {
        name: originalCourse.name,
        code: baseCode, // Base code without version suffix
        overview: originalCourse.overview,
        study_details: originalCourse.study_details,
        faculty_details: originalCourse.faculty_details,
        credits: originalCourse.credits,
        semester: originalCourse.semester,
        prerequisites: originalCourse.prerequisites,
        max_students: originalCourse.max_students,
        department_id: originalCourse.department_id,
        degree_id: originalCourse.degree_id,
        is_elective: originalCourse.is_elective,
        created_by: user.id,
        version: nextVersion,
        parent_course_id: originalCourse.parent_course_id || originalCourse.id,
        is_latest_version: true,
        status: 'draft',
      };

      // Mark all previous versions as not latest
      await Course.update(
        { is_latest_version: false },
        {
          where: {
            [Op.or]: [
              { id: req.params.id },
              { parent_course_id: req.params.id },
              { parent_course_id: originalCourse.parent_course_id || originalCourse.id },
            ],
          },
        }
      );

      const newCourse = await Course.create(newCourseData);

      // Fetch the created course with associations
      const createdCourse = await Course.findByPk(newCourse.id, {
        include: [
          { model: Department, as: 'department' },
          { model: Degree, as: 'degree' },
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });

      res.status(201).json({
        message: `Course version ${nextVersion} created successfully`,
        course: createdCourse,
        version: nextVersion,
      });
    } catch (error) {
      console.error('Error creating course version:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Course version with this code already exists' });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Check if course can be edited
router.get('/:id/can-edit',
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
    try {
      const course = await Course.findByPk(req.params.id);

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      let canEdit = true;
      let reason = '';

      // For active courses, check if there are newer versions in draft, pending approval, or approved status
      if (course.status === 'active') {
        const newerVersions = await Course.findAll({
          where: {
            [Op.or]: [
              { parent_course_id: course.parent_course_id || course.id },
              { parent_course_id: course.id }
            ],
            version: { [Op.gt]: course.version },
            status: { [Op.in]: ['draft', 'pending_approval', 'approved'] }
          },
        });

        if (newerVersions.length > 0) {
          canEdit = false;
          const statuses = [...new Set(newerVersions.map(v => v.status))].join(', ');
          reason = `Cannot edit this active course (version ${course.version}) because newer version(s) exist with status: ${statuses}. Please work with the latest version or wait for the newer version to be processed.`;
        }
      } else {
        // For non-active courses, check if there are any newer versions (existing logic)
        const newerVersions = await Course.findAll({
          where: {
            [Op.or]: [
              { parent_course_id: course.parent_course_id || course.id },
              { parent_course_id: course.id }
            ],
            version: { [Op.gt]: course.version },
          },
        });

        if (newerVersions.length > 0) {
          canEdit = false;
          reason = `Cannot edit this course (version ${course.version}) because newer version(s) exist. Please work with the latest version.`;
        }
      }

      // Get newer versions info for response
      const allNewerVersions = await Course.findAll({
        where: {
          [Op.or]: [
            { parent_course_id: course.parent_course_id || course.id },
            { parent_course_id: course.id }
          ],
          version: { [Op.gt]: course.version },
        },
        attributes: ['id', 'version', 'status', 'created_at'],
        order: [['version', 'DESC']]
      });

      res.json({
        canEdit,
        reason,
        courseStatus: course.status,
        isLatestVersion: course.is_latest_version,
        version: course.version,
        newerVersionsCount: allNewerVersions.length,
        newerVersions: allNewerVersions.map(v => ({
          id: v.id,
          version: v.version,
          status: v.status,
          created_at: v.created_at
        }))
      });
    } catch (error) {
      console.error('Error checking if course can be edited:', error);
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

      // For development/testing when authentication is disabled
      const user = req.user || { 
        id: req.body.userId,
        department_id: req.body.departmentId, 
        user_type: 'faculty' 
      };

      // Validate that we have user context
      if (!user.id || !user.department_id) {
        return res.status(400).json({ error: 'User context required - missing userId or departmentId in request body' });
      }

      // Only course creator can submit
      if (course.created_by !== user.id) {
        return res.status(403).json({ error: 'Only course creator can submit for approval' });
      }

      // Faculty can only submit courses in their own department (temporarily bypassed for testing)
      if (user.user_type !== 'admin' && user.department_id !== course.department_id) {
        return res.status(403).json({ error: 'Can only submit courses in your own department' });
      }

      if (course.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft courses can be submitted' });
      }

      await course.update({ 
        status: 'pending_approval',
        submitted_at: new Date(),
        updated_by: user.id
      });

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
        let message = 'Only pending approval courses can be approved';
        if (course.status === 'approved') {
          message = 'This course has already been approved';
        } else if (course.status === 'draft') {
          message = 'This course has not been submitted for approval yet';
        } else if (course.status === 'active') {
          message = 'This course is already active';
        }
        return res.status(400).json({ 
          error: message,
          currentStatus: course.status,
          approvedAt: course.approved_at,
          approvedBy: course.approved_by
        });
      }

      await course.update({
        status: 'approved',
        approved_by: user.id || req.body.userId,
        approved_at: new Date(),
        updated_by: user.id || req.body.userId,
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
        updated_by: user.id || req.body.userId,
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

// Publish/Activate course (Faculty only - for approved courses)
router.patch('/:id/publish',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('faculty'), // Temporarily disabled for testing
  auditMiddleware('update', 'course', 'Course published/activated'),
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

      // For development/testing when authentication is disabled
      const user = req.user || { 
        id: req.body.userId,
        department_id: req.body.departmentId, 
        user_type: 'faculty' 
      };

      // Validate that we have user context
      if (!user.id || !user.department_id) {
        return res.status(400).json({ error: 'User context required - missing userId or departmentId in request body' });
      }

      // Only course creator or faculty in the same department can publish
      if (course.created_by !== user.id && user.department_id !== course.department_id) {
        return res.status(403).json({ error: 'Only course creator or department faculty can publish courses' });
      }

      if (course.status !== 'approved') {
        let message = 'Only approved courses can be published';
        if (course.status === 'draft') {
          message = 'Course must be submitted and approved before publishing';
        } else if (course.status === 'pending_approval') {
          message = 'Course is still pending approval and cannot be published yet';
        } else if (course.status === 'active') {
          message = 'Course is already active/published';
        }
        return res.status(400).json({ 
          error: message,
          currentStatus: course.status 
        });
      }

      // Handle version management if this is a versioned course
      if (course.parent_course_id || course.version > 1) {
        // This is a new version being published - archive previous active versions
        const parentId = course.parent_course_id || course.id;
        
        await Course.update(
          { status: 'archived' },
          {
            where: {
              [Op.and]: [
                {
                  [Op.or]: [
                    { id: parentId },
                    { parent_course_id: parentId },
                  ],
                },
                { status: 'active' },
                { id: { [Op.ne]: course.id } },
              ],
            },
          }
        );
      }

      await course.update({
        status: 'active',
        updated_by: user.id || req.body.userId,
      });

      res.json({
        message: 'Course published and is now active',
        course,
      });
    } catch (error) {
      console.error('Error publishing course:', error);
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
      const course = await Course.findByPk(req.params.id, {
        include: [{ model: Department, as: 'department' }]
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // For development/testing when authentication is disabled
      const user = req.user || { 
        id: req.body.userId,
        department_id: req.body.departmentId,
        user_type: 'faculty'
      };

      // Validate that we have user context
      if (!user.id || !user.department_id) {
        return res.status(400).json({ error: 'User context required - missing userId or departmentId in request body' });
      }

      // Only course creator can update (except admins)
      if (course.created_by !== user.id && user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Only course creator can update this course' });
      }

      // Faculty can only update courses in their own department (temporarily bypassed for testing)
      if (user.user_type !== 'admin' && user.department_id !== course.department_id) {
        return res.status(403).json({ error: 'Can only update courses in your own department' });
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

      // Set the updated_by field
      updatedFields.updated_by = user.id;

      await course.update(updatedFields);

      const updatedCourse = await Course.findByPk(course.id, {
        include: [
          { model: Department, as: 'department' },
          { model: Degree, as: 'degree' },
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'updater', attributes: ['id', 'first_name', 'last_name', 'email'] },
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
      const course = await Course.findByPk(req.params.id, {
        include: [{ model: Department, as: 'department' }]
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // For development/testing when authentication is disabled
      const user = req.user || { 
        id: req.body.userId,
        department_id: req.body.departmentId, 
        user_type: 'faculty' 
      };

      // Validate that we have user context
      if (!user.id || !user.department_id) {
        return res.status(400).json({ error: 'User context required - missing userId or departmentId in request body' });
      }

      // Only course creator or admin can delete
      if (course.created_by !== user.id && user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Only course creator or admin can delete this course' });
      }

      // Faculty can only delete courses in their own department (temporarily bypassed for testing)
      if (user.user_type !== 'admin' && user.department_id !== course.department_id) {
        return res.status(403).json({ error: 'Can only delete courses in your own department' });
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
