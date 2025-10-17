/**
 * Course Routes
 * -------------
 * Handles all course-related API endpoints.
 * Standards:
 * - Code-based lookups for department and degree (department_code, degree_code)
 * - DB integrity via department_id, degree_id
 * - Error handling, security, validation, audit, maintainability
 * - See 1.md for full standards checklist
 */

const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const models = require('../utils/models');
const { Op } = require('sequelize');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { auditMiddleware, captureOriginalData } = require('../middleware/audit');
const { sendCourseApprovalEmail } = require('../utils/email');
const { handleCaughtError } = require('../utils/errorHandler');

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

/**
 * GET /courses
 * Purpose: Fetch all courses with optional filtering by department_code, degree_code, status, faculty_id
 * Access: Authenticated users
 * Query Params: department_code, degree_code, status, faculty_id, page, limit
 * Response: Array of course objects (excludes sensitive fields)
 */
router.get('/', 
  authenticateToken,
  async (req, res) => {
    try {
      // Get models for this request
      const Course = await models.Course();
      const Department = await models.Department();
      const Degree = await models.Degree();
      const User = await models.User();
      
      const {
        department_code,
        degree_code,
        status,
        faculty_id,
        page = 1,
        limit = 50
      } = req.query;

      const whereClause = {};
      if (department_code) whereClause.department_code = department_code;
      if (degree_code) whereClause.degree_code = degree_code;
      if (status) whereClause.status = status;
      if (faculty_id) whereClause.faculty_id = faculty_id;

      // Filter by department and ownership for non-admin users
      if (req.user && req.user.user_type !== 'admin') {
        // All non-admin users can only see courses from their department
        whereClause.department_code = req.user.department_code;
        
        // Non-HOD users can only see courses they created
        if (!req.user.is_head_of_department) {
          whereClause.created_by = req.user.id;
        }
      }

      const offset = (page - 1) * limit;

      // Use findAndCountAll for pagination meta
      const { count, rows: coursesRaw } = await Course.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Department,
            as: 'departmentByCode',
            attributes: ['id', 'name', 'code']
          },
          {
            model: Degree,
            as: 'degreeByCode',
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
        order: [['created_at', 'DESC']],
        distinct: true
      });

      // Deduplicate courses by id
      const seen = new Set();
      const courses = coursesRaw.filter(course => {
        if (seen.has(course.id)) return false;
        seen.add(course.id);
        return true;
      });

      // Batch fetch pending versions for these courses to avoid N+1 queries
      const courseIds = courses.map(c => c.id);
      
      // Find all pending versions that are children of courses in our list
      const pendingVersions = await Course.findAll({
        where: {
          parent_course_id: { [Op.in]: courseIds },
          status: { [Op.notIn]: ['active', 'archived'] }
        },
        attributes: ['parent_course_id', 'id'],
      });
      
      // Create a set of course IDs that have pending child versions
      const coursesWithPendingChildren = new Set(pendingVersions.map(v => v.parent_course_id));
      
      const coursesWithPendingFlag = courses.map(course => {
        // Check if there's a child pending version of this course
        course.dataValues.hasNewPendingVersion = coursesWithPendingChildren.has(course.id);
        return course;
      });

      // Remap departmentByCode -> department, degreeByCode -> degree
      const coursesRemapped = coursesWithPendingFlag.map(course => {
        const obj = { ...course.dataValues };
        if (obj.departmentByCode) {
          obj.department = obj.departmentByCode;
          delete obj.departmentByCode;
        }
        if (obj.degreeByCode) {
          obj.degree = obj.degreeByCode;
          delete obj.degreeByCode;
        }
        return obj;
      });

      // Pagination object
      const pagination = {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      };

      res.json({
        courses: coursesRemapped,
        pagination
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to fetch courses');
    }
  }
);

// Get faculty courses with enhanced categorization
router.get('/my-courses', 
  authenticateToken,
  async (req, res) => {
  try {
    // Get models for this request
    const Course = await models.Course();
    const Department = await models.Department();
    const Degree = await models.Degree();
    const User = await models.User();
    
    // Extract query parameters
    console.log('Request query parameters raw:', req.query);
    const userId = req.query.userId || null;
    const departmentId = req.query.departmentId || null;
    
    console.log('Extracted parameters:', { 
      userId, 
      departmentId,
      authUser: req.user ? { id: req.user.id, type: req.user.user_type } : 'No auth user'
    });
    
    // For development/testing when authentication is disabled
    const user = req.user || { 
      id: userId || null,
      department_id: departmentId || null,
      user_type: 'faculty',
      is_head_of_department: false
    };

    // Validate that we have user context
    if (!user.id || !user.department_id) {
      return res.status(400).json({ error: 'User context required - missing userId or departmentId parameters' });
    }
    
    console.log('User info for my-courses:', {
      id: user.id,
      department_id: user.department_id,
      user_type: user.user_type,
      is_head_of_department: user.is_head_of_department || false
    });
    
    // Create where clause based on user type and permissions
    let whereClause = {};
    
    // Always filter by department_id if available
    if (user.department_id) {
      whereClause.department_id = user.department_id;
    }
    
    // Debug the userId parameter 
    console.log('userId parameter type:', typeof req.query.userId);
    console.log('userId parameter value:', req.query.userId);
    console.log('Original request query parameters:', req.query);
    
    // If a specific userId is provided in the query parameter, use that FIRST
    if (req.query.userId && String(req.query.userId).length > 0) {
      console.log(`Filtering by userId from query parameter: ${req.query.userId}`);
      whereClause.created_by = String(req.query.userId);
    } 
    // Use authenticated user restrictions if no explicit userId was provided
    else if (!(user.user_type === 'admin' || user.is_head_of_department === true || user.user_type === 'office')) {
      // Force regular faculty to see only their own courses
      whereClause.created_by = user.id;
      console.log('Regular faculty, restricting to own courses:', whereClause);
    } else {
      console.log('Admin/HOD/Office user, showing all department courses:', whereClause);
    }
    
    // Final safety check - if this is a faculty user, always include created_by filter
    if (user.user_type === 'faculty' && !user.is_head_of_department && !whereClause.created_by && user.id) {
      whereClause.created_by = user.id;
      console.log('Added created_by filter as safety check for faculty user');
    }
    
        // Print the final SQL filter that will be applied
    console.log('Final SQL filter to be applied:', JSON.stringify(whereClause, null, 2));
    
    const courses = await Course.findAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: 'departmentByCode',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Degree,
          as: 'degreeByCode',
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name'],
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
    
    // Add debugging to check creator info
    console.log(`Found ${courses.length} courses with the following creators:`);
    const creators = courses.slice(0, 5).map(course => ({
      course_name: course.name,
      course_id: course.id,
      created_by: course.created_by,
      creator: course.creator ? { id: course.creator.id, name: `${course.creator.first_name} ${course.creator.last_name}` } : null
    }));
    console.log('Sample courses creator info:', creators);

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

    // For each course (except active and archived), check if a pending version exists
    const coursesWithPendingFlag = await Promise.all(courses.map(async course => {
      // Check if there's a child pending version
      const pendingVersion = await Course.findOne({
        where: {
          parent_course_id: course.id,
          status: { [Op.notIn]: ['active', 'archived'] }
        }
      });
      course.dataValues.hasNewPendingVersion = !!pendingVersion;
      return course;
    }));

    // Categorize courses by status
    const categorized = {
      draft: coursesWithPendingFlag.filter(course => course.status === 'draft'),
      pending_approval: coursesWithPendingFlag.filter(course => ['submitted', 'pending_approval'].includes(course.status)),
      approved: coursesWithPendingFlag.filter(course => course.status === 'approved'),
      active: coursesWithPendingFlag.filter(course => course.status === 'active'),
      others: coursesWithPendingFlag.filter(course => !['draft', 'submitted', 'pending_approval', 'approved', 'active'].includes(course.status))
    };

    const summary = {
      total: coursesWithDraftFlag.length,
      draft: categorized.draft.length,
      approved: categorized.approved.length,
      active: categorized.active.length
    };

    console.log(`Returning ${coursesWithDraftFlag.length} courses with filter:`, whereClause);
    
    res.json({
      all: coursesWithDraftFlag,
      categorized,
      summary
    });
  } catch (error) {
    handleCaughtError(res, error, 'Failed to fetch faculty courses');
  }
});

// Get all courses from faculty's department (for department overview)
router.get('/department-courses', 
  authenticateToken,
  async (req, res) => {
  try {
    // Get models for this request
    const Course = await models.Course();
    const Department = await models.Department();
    const Degree = await models.Degree();
    const User = await models.User();
    
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
        department_id: user.department_id,
        // Only show courses created by the user unless they're an admin, HOD, or office staff
        ...(user.user_type !== 'admin' && !user.is_head_of_department && user.user_type !== 'office' ? { created_by: user.id } : {})
      },
      include: [
        {
          model: Department,
          as: 'departmentByCode',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Degree,
          as: 'degreeByCode',
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
      authenticateToken,
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
    handleCaughtError(res, error, 'Failed to fetch department courses');
  }
});

//Get course by ID
router.get('/:id',
  authenticateToken,
  async (req, res) => {
    try {
      // Get models for this request
      const Course = await models.Course();
      const Department = await models.Department();
      const Degree = await models.Degree();
      const User = await models.User();
      
      const course = await Course.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: Degree, as: 'degreeByCode' },
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'updater', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'lecturers', attributes: ['id', 'first_name', 'last_name', 'email', 'user_type'], through: { attributes: ['role', 'responsibilities'] } },
        ],
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      // Check if user is admin or the creator of the course
      const user = req.user;
      if (user.user_type !== 'admin' && course.created_by !== user.id) {
        return res.status(403).json({ error: 'You do not have permission to view this course' });
      }
      
      // Only allow access if user is admin or course creator
      if (req.user && req.user.user_type !== 'admin' && course.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Access denied: You do not own this course' });
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
      handleCaughtError(res, error, 'Failed to fetch course');
    }
  }
);

// Get course for editing (dedicated endpoint)
router.get('/:id/edit',
  authenticateToken,
  async (req, res) => {
    try {
      // Get models for this request
      const Course = await models.Course();
      const Department = await models.Department();
      const Degree = await models.Degree();
      const User = await models.User();
      
      const resolveNames = req.query.resolve_names !== 'false'; // Default to true
      
      const course = await Course.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: Degree, as: 'degreeByCode' },
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

      // Remap degreeByCode -> degree and departmentByCode -> department
      const courseObj = course.toJSON();
      if (courseObj.degreeByCode) {
        courseObj.degree = courseObj.degreeByCode;
        delete courseObj.degreeByCode;
      }
      if (courseObj.departmentByCode) {
        courseObj.department = courseObj.departmentByCode;
        delete courseObj.departmentByCode;
      }
      res.json({ course: courseObj });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to fetch course for editing');
    }
  }
);

// Create new course (Faculty only)
router.post('/',
  authenticateToken,
  authorizeRoles('faculty'),
  courseValidation,
  handleValidationErrors,
  auditMiddleware('create', 'course', 'Course created'),
  async (req, res) => {
    try {
      // Get models for this request
      const Course = await models.Course();
      const Department = await models.Department();
      const Degree = await models.Degree();
      const User = await models.User();
      
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
      const courses = await Course.findAll({
        where: whereClause,
        include: [
          {
            model: Department,
            as: 'departmentByCode',
            attributes: ['id', 'name', 'code']
          },
          {
            model: Degree,
            as: 'degreeByCode',
            attributes: ['id', 'name', 'code']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      // For each course, check if a pending child version exists
      const coursesWithPendingFlag = await Promise.all(courses.map(async course => {
        // Check if there's a child version that's not active/archived
        const pendingVersion = await Course.findOne({
          where: {
            parent_course_id: course.id,
            status: { [Op.notIn]: ['active', 'archived'] }
          }
        });
        course.dataValues.hasNewPendingVersion = !!pendingVersion;
        return course;
      }));

      res.json(coursesWithPendingFlag);

      // Fetch course with associations
      const createdCourse = await Course.findByPk(course.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: Degree, as: 'degreeByCode' },
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'lecturers', attributes: ['id', 'first_name', 'last_name', 'email', 'user_type'], through: { attributes: ['role', 'responsibilities'] } },
        ],
      });

      res.status(201).json({
        message: 'Course created successfully',
        course: createdCourse,
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to create course');
    }
  }
);

// Create new version of existing course (Faculty only)
router.post('/:id/create-version',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  auditMiddleware('create', 'course', 'Course version created'),
  async (req, res) => {
    try {
      // Get models for this request
      const Course = await models.Course();
      const Department = await models.Department();
      const Degree = await models.Degree();
      const User = await models.User();
      
      console.log(`[DEBUG] Create version request for course ID: ${req.params.id} by user:`, req.user);
      
      // Get original course without resolving instructor names to preserve UUIDs
      const originalCourse = await Course.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: Degree, as: 'degreeByCode' },
        ],
      });

      if (!originalCourse) {
        console.log(`[ERROR] Course not found: ${req.params.id}`);
        return res.status(404).json({ error: 'Course not found' });
      }
      
      console.log(`[DEBUG] Original course:`, {
        id: originalCourse.id,
        status: originalCourse.status,
        version: originalCourse.version,
        created_by: originalCourse.created_by
      });
      
      // Check if user is admin or the creator of the course
      const isAdmin = req.user.user_type === 'admin';
      const isCreator = originalCourse.created_by === req.user.id;
      
      if (!isAdmin && !isCreator) {
        console.log(`[ERROR] Permission denied. User ${req.user.id} is not admin or creator of course ${originalCourse.id}`);
        return res.status(403).json({ error: 'You do not have permission to create a version of this course' });
      }

      // Only allow versioning for approved or active courses
      if (!['approved', 'active'].includes(originalCourse.status)) {
        console.log(`[ERROR] Cannot create version. Course status is ${originalCourse.status}`);
        return res.status(400).json({ 
          error: 'Can only create versions from approved or active courses' 
        });
      }

      // Check if there's already a draft, pending, or approved version in the family
      const courseFamily = [
        { id: req.params.id },
        { parent_course_id: req.params.id },
        { id: originalCourse.parent_course_id },
        { parent_course_id: originalCourse.parent_course_id },
      ];

      const existingDraftOrPending = await Course.findOne({
        where: {
          [Op.or]: courseFamily,
          status: { [Op.in]: ['draft', 'pending_approval', 'approved'] }
        }
      });

      if (existingDraftOrPending) {
        console.log(`[ERROR] Cannot create version. Found existing version in ${existingDraftOrPending.status} status`);
        return res.status(400).json({ 
          error: 'Cannot create a new version while another version is in draft, pending approval, or approved status',
          existingVersion: {
            id: existingDraftOrPending.id,
            version: existingDraftOrPending.version,
            status: existingDraftOrPending.status
          }
        });
      }

      // Use the authenticated user
      const userId = req.user.id;
      
      // Find the highest version number for this course family
      const maxVersionCourse = await Course.findOne({
        where: {
          [Op.or]: courseFamily,
        },
        order: [['version', 'DESC']],
      });

      const nextVersion = (maxVersionCourse?.version || 1) + 1;
      console.log(`[DEBUG] Next version will be: ${nextVersion}`);

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
        department_code: originalCourse.department_code,
        degree_id: originalCourse.degree_id,
        degree_code: originalCourse.degree_code,
        is_elective: originalCourse.is_elective,
        created_by: userId,
        version: nextVersion,
        parent_course_id: originalCourse.parent_course_id || originalCourse.id,
        is_latest_version: true,
        status: 'draft',
        // DO NOT set id here; let Sequelize auto-generate a new UUID
      };
      
      console.log(`[DEBUG] Creating new course version with data:`, {
        name: newCourseData.name,
        code: newCourseData.code,
        version: newCourseData.version,
        parent_course_id: newCourseData.parent_course_id,
        created_by: newCourseData.created_by
      });

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
      
      console.log(`[SUCCESS] Created new course version with ID: ${newCourse.id}`);

      // Fetch the created course with associations
      const createdCourse = await Course.findByPk(newCourse.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: Degree, as: 'degreeByCode' },
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });

      res.status(201).json({
        message: `Course version ${nextVersion} created successfully`,
        course: createdCourse,
        version: nextVersion
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to create course version');
    }
  }
);

// Check if course can be edited
router.get('/:id/can-edit',
  authenticateToken,
  async (req, res) => {
    try {
      // Get models for this request
      const Course = await models.Course();
      
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
      handleCaughtError(res, error, 'Failed to check if course can be edited');
    }
  }
);

// Submit course for approval (Faculty only)
router.patch('/:id/submit',
  authenticateToken,
  captureOriginalData('Course', 'id'),
  auditMiddleware('update', 'course', 'Course submitted for approval'),
  async (req, res) => {
    try {
      // Get models for this request
      const Course = await models.Course();
      const Department = await models.Department();
      const User = await models.User();
      
      const course = await Course.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: User, as: 'creator' },
        ],
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Use only authenticated user context
      const user = req.user;
      if (!user || !user.id) {
        return res.status(400).json({ error: 'User context required' });
      }

      // Only course creator can submit
      if (course.created_by !== user.id) {
        return res.status(403).json({ error: 'Only course creator can submit for approval' });
      }

      // Faculty can only submit courses in their own department
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

      // Add message to messages table
      if (req.body.message) {
        const Message = await models.Message();
        await Message.create({
          type: 'course',
          reference_id: course.id,
          sender_id: user.id,
          message: req.body.message,
        });
      }

      // Find HOD of the department using department_code
      let hod = null;
      if (course.department_code) {
        const department = await Department.findOne({ where: { code: course.department_code } });
        if (department && department.department_code) {
          hod = await User.findOne({
            where: {
              department_code: course.department_code,
              user_type: 'faculty',
              is_head_of_department: true,
            },
          });
        }
      }

      // Send approval email to HOD if found (non-blocking)
      if (hod) {
        sendCourseApprovalEmail(course, hod).catch(emailError => {
          console.error('Failed to send course approval email:', emailError);
        });
      }

      res.json({
        message: 'Course submitted for approval successfully',
        course,
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to submit course for approval');
    }
  }
);

// Approve course (HOD only)
router.patch('/:id/approve',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  auditMiddleware('update', 'course', 'Course approved'),
  async (req, res) => {
    const { Sequelize } = require('sequelize');
    const sequelize = require('../config/database').sequelize;
    const transaction = await sequelize.transaction();
    try {
      // Get models for this request
      const Course = await models.Course();
      const Message = await models.Message();
      
      const course = await Course.findByPk(req.params.id, { transaction });
      if (!course) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Course not found' });
      }
      const user = req.user || { department_id: course.department_id, is_head_of_department: true };
      if (user.department_id !== course.department_id || !user.is_head_of_department) {
        await transaction.rollback();
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
        await transaction.rollback();
        return res.status(400).json({ 
          error: message,
          currentStatus: course.status,
          approvedAt: course.approved_at,
          approvedBy: course.approved_by
        });
      }
      const senderId = user.id || req.body.userId;
      if (!senderId) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Missing sender_id for approval message' });
      }
      // Add approval message to messages table first
      const approvalMessage = await Message.create({
        type: 'course',
        reference_id: course.id,
        sender_id: senderId,
  // Course approved by HOD
  message: `Course approved by HOD${req.body.reason ? ': ' + req.body.reason : ''}`,
      }, { transaction });
      if (!approvalMessage || !approvalMessage.id) {
        await transaction.rollback();
        return res.status(500).json({ error: 'Failed to create approval message' });
      }
      await course.update({
        status: 'approved',
        approved_by: senderId,
        approved_at: new Date(),
        updated_by: senderId,
      }, { transaction });
      await transaction.commit();
      res.json({
        message: 'Course approved successfully',
        course,
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      handleCaughtError(res, error, 'Failed to approve course');
    }
  }
);

// Reject course (HOD only)
router.patch('/:id/reject',
  [body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Rejection reason is required (10-500 characters)')],
  handleValidationErrors,
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  captureOriginalData('Course', 'id'),
  auditMiddleware('update', 'course', 'Course rejected'),
  async (req, res) => {
    try {
      // Get models for this request
      const Course = await models.Course();
      
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

      // Add rejection message to messages table
      const Message = await models.Message();
      await Message.create({
        type: 'course',
        reference_id: course.id,
        sender_id: user.id || req.body.userId,
        message: `Course change requested: ${reason}`,
      });

      res.json({
        message: 'Course change requested successfully',
        course,
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to reject course');
    }
  }
);

// Publish/Activate course (Faculty only - for approved courses)
router.patch('/:id/publish',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  auditMiddleware('update', 'course', 'Course published/activated'),
  async (req, res) => {
    try {
      // Get models for this request
      const Course = await models.Course();
      const Department = await models.Department();
      const User = await models.User();
      
      const course = await Course.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: User, as: 'creator' },
        ],
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Use authenticated user from middleware
      const user = req.user || { 
        id: req.body.userId,
        department_code: req.body.departmentCode || req.body.department_code,
        user_type: 'faculty' 
      };

      // Validate that we have user context
      if (!user.id) {
        return res.status(401).json({ error: 'Authentication required' });
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
              [Op.or]: [
                { id: parentId },
                { parent_course_id: parentId },
              ],
              status: 'active',
              id: { [Op.ne]: course.id },
            },
          }
        );
      }

      await course.update({
        status: 'active',
        updated_by: user.id,
      });

      res.json({
        message: 'Course published and is now active',
        course,
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to publish course');
    }
  }
);

// Update course (Faculty - creator only)
router.put('/:id',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  courseValidation,
  handleValidationErrors,
  captureOriginalData('Course', 'id'),
  auditMiddleware('update', 'course', 'Course updated'),
  async (req, res) => {
    try {
      // Get models for this request
      const Course = await models.Course();
      const Department = await models.Department();
      const Degree = await models.Degree();
      const User = await models.User();
      
      const course = await Course.findByPk(req.params.id, {
        include: [{ model: Department, as: 'departmentByCode' }]
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Use authenticated user context
      const user = req.user;
      if (!user || !user.id || !user.department_code) {
        return res.status(400).json({ error: 'User context required - missing user or department_code in auth' });
      }

      // Only course creator can update (except admins)
      if (course.created_by !== user.id && user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Only course creator can update this course' });
      }

      // Faculty can only update courses in their own department
      if (user.user_type !== 'admin' && user.department_code !== course.department_code) {
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

      // Use department_code and degree_code from payload if present
      if (req.body.department_code) {
        updatedFields.department_code = req.body.department_code;
      }
      if (req.body.degree_code) {
        updatedFields.degree_code = req.body.degree_code;
      }

      if (updatedFields.code) {
        updatedFields.code = updatedFields.code.toUpperCase();
      }

      // Set the updated_by field
      updatedFields.updated_by = user.id;

      await course.update(updatedFields);

      const updatedCourse = await Course.findByPk(course.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: Degree, as: 'degreeByCode' },
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'updater', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'approver', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });

      // Remap departmentByCode -> department, degreeByCode -> degree
      const courseObj = updatedCourse.toJSON();
      if (courseObj.departmentByCode) {
        courseObj.department = courseObj.departmentByCode;
        delete courseObj.departmentByCode;
      }
      if (courseObj.degreeByCode) {
        courseObj.degree = courseObj.degreeByCode;
        delete courseObj.degreeByCode;
      }

      res.json({
        message: 'Course updated successfully',
        course: courseObj,
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to update course');
    }
  }
);

// Delete course (Faculty - creator only, Admin)
router.delete('/:id',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  captureOriginalData('Course', 'id'),
  auditMiddleware('delete', 'course', 'Course deleted'),
  async (req, res) => {
    try {
      // Get models for this request
      const Course = await models.Course();
      const Department = await models.Department();
      
      const course = await Course.findByPk(req.params.id, {
        include: [{ model: Department, as: 'departmentByCode' }]
      });

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Use authenticated user from middleware, or fallback to request body for development
      const user = req.user || { 
        id: req.body.userId,
        department_code: req.body.departmentCode || req.body.department_code,
        user_type: 'faculty' 
      };

      // Validate that we have user context
      if (!user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Only course creator or admin can delete
      if (course.created_by !== user.id && user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Only course creator or admin can delete this course' });
      }

      // Faculty can only delete courses in their own department
      if (user.user_type !== 'admin' && user.department_code && course.department_code && user.department_code !== course.department_code) {
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
      handleCaughtError(res, error, 'Failed to delete course');
    }
  }
);

module.exports = router;
