/**
 * Degree Routes
 * -------------
 * Handles all degree-related API endpoints.
 * Standards:
 * - Code-based lookups for department and degree (department_code, degree_code)
 * - DB integrity via department_id, degree_id
 * - Error handling, security, validation, audit, maintainability
 * - See 1.md for full standards checklist
 */

const express = require('express');
const { body, query } = require('express-validator');
const models = require('../utils/models');
const { Op } = require('sequelize');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { auditMiddleware, captureOriginalData } = require('../middleware/audit');

const router = express.Router();
// Add a comment to degree (conversation timeline)
/**
 * POST /degrees/:id/comment
 * Purpose: Add a comment to a degree (conversation timeline)
 * Access: Authenticated users
 * Params: id (degree UUID)
 * Body: text (string)
 * Response: Added comment object
 */
router.post('/:id/comment',
  authenticateToken,
  auditMiddleware('update', 'degree', 'Degree comment added'),
  async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || text.trim().length < 2) return res.status(400).json({ error: 'Comment text required' });
      const Degree = await models.Degree();
      const degree = await Degree.findByPk(req.params.id);
      if (!degree) return res.status(404).json({ error: 'Degree not found' });
      const user = req.user || { id: req.body.userId, name: req.body.userName, user_type: req.body.userType };
      const comment = {
        text: text.trim(),
        userId: user.id,
        userName: user.name,
        userType: user.user_type,
        createdAt: new Date()
      };
      const comments = Array.isArray(degree.comments) ? degree.comments : [];
      comments.push(comment);
      await degree.update({ comments });
      // Also add comment to messages table for timeline
      const Message = await models.Message();
      await Message.create({
        type: 'degree',
        reference_id: degree.id,
        sender_id: user.id,
        message: `Comment: ${text.trim()}`,
      });
      res.json({ message: 'Comment added', comment });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
// Submit degree for approval (Faculty only)
router.patch('/:id/submit',
  authenticateToken,
  auditMiddleware('update', 'degree', 'Degree submitted for approval'),
  async (req, res) => {
    try {
      const Degree = await models.Degree();
      const degree = await Degree.findByPk(req.params.id);
      if (!degree) return res.status(404).json({ error: 'Degree not found' });
      const user = req.user || { id: req.body.userId, department_id: req.body.departmentId, user_type: 'faculty' };
      if (!user.id || !user.department_id) return res.status(400).json({ error: 'User context required' });
      if (degree.created_by && degree.created_by !== user.id) return res.status(403).json({ error: 'Only creator can submit for approval' });
      if (user.user_type !== 'admin' && user.department_id !== degree.department_id) return res.status(403).json({ error: 'Can only submit degrees in your own department' });
      if (degree.status !== 'draft') return res.status(400).json({ error: 'Only draft degrees can be submitted' });
      await degree.update({ status: 'pending_approval', updated_by: user.id });

      // Add message to messages table
      const Message = await models.Message();
      if (req.body.message) {
        await Message.create({
          type: 'degree',
          reference_id: degree.id,
          sender_id: user.id,
          message: req.body.message,
        });
      }

      res.json({ message: 'Degree submitted for approval', degree });
    } catch (error) {
      console.error('Error submitting degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Approve degree (HOD only)
router.patch('/:id/approve',
  authenticateToken,
  auditMiddleware('update', 'degree', 'Degree approved'),
  async (req, res) => {
    const { Sequelize } = require('sequelize');
    const Message = require('../models/Message');
    const sequelize = require('../config/database').sequelize;
    const transaction = await sequelize.transaction();
    try {
      const { Degree } = await models.getMany('Degree');
      const degree = await Degree.findByPk(req.params.id, { transaction });
      if (!degree) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Degree not found' });
      }
      const user = req.user || { department_id: degree.department_id, is_head_of_department: true };
      if (user.department_id !== degree.department_id || !user.is_head_of_department) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Only Head of Department can approve degrees' });
      }
      if (degree.status !== 'pending_approval') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Only pending approval degrees can be approved', currentStatus: degree.status });
      }
      const senderId = user.id || req.body.userId;
      if (!senderId) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Missing sender_id for approval message' });
      }
      // Add approval message to messages table first
      const message = await Message.create({
        type: 'degree',
        reference_id: degree.id,
        sender_id: senderId,
        message: `Degree approved by HOD${req.body.reason ? ': ' + req.body.reason : ''}`,
      }, { transaction });
      if (!message || !message.id) {
        await transaction.rollback();
        return res.status(500).json({ error: 'Failed to create approval message' });
      }
      await degree.update({ status: 'approved', approved_by: senderId, updated_by: senderId }, { transaction });
      await transaction.commit();
      res.json({ message: 'Degree approved', degree });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('Error approving degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Reject degree (HOD only)
router.patch('/:id/reject',
  [body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Rejection reason required (10-500 characters)')],
  handleValidationErrors,
  auditMiddleware('update', 'degree', 'Degree rejected'),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const { Degree } = await models.getMany('Degree');
      const degree = await Degree.findByPk(req.params.id);
      if (!degree) return res.status(404).json({ error: 'Degree not found' });
      const user = req.user || { department_id: degree.department_id, is_head_of_department: true };
      if (user.department_id !== degree.department_id || !user.is_head_of_department) return res.status(403).json({ error: 'Only Head of Department can reject degrees' });
      if (degree.status !== 'pending_approval') return res.status(400).json({ error: 'Only pending approval degrees can be rejected' });
      await degree.update({ status: 'draft', feedback: reason, updated_by: user.id || req.body.userId });

      // Add rejection message to messages table
      const Message = require('../models/Message');
      const senderId = user.id || req.body.userId;
      if (!senderId) {
        return res.status(400).json({ error: 'Missing sender ID for rejection message' });
      }
      await Message.create({
        type: 'degree',
        reference_id: degree.id,
        sender_id: senderId,
        message: `Degree rejected: ${reason}`,
      });

      res.json({ message: 'Degree rejected', degree });
    } catch (error) {
      console.error('Error rejecting degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


// Create new version of degree
router.post('/:id/create-version',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  auditMiddleware('create', 'degree', 'Degree version created'),
  async (req, res) => {
    try {
      console.log(`[DEBUG] Create version request for degree ID: ${req.params.id} by user:`, req.user);
      const { Degree, Department, User } = await models.getMany('Degree', 'Department', 'User');
      const degree = await Degree.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'department' },
        ]
      });
      
      if (!degree) {
        console.log(`[ERROR] Degree not found: ${req.params.id}`);
        return res.status(404).json({ error: 'Degree not found' });
      }
      
      console.log(`[DEBUG] Original degree:`, {
        id: degree.id,
        status: degree.status,
        version: degree.version,
        created_by: degree.created_by
      });
      
      // Check if user is admin or the creator of the degree
      const isAdmin = req.user.user_type === 'admin';
      const isCreator = degree.created_by === req.user.id;
      
      if (!isAdmin && !isCreator) {
        console.log(`[ERROR] Permission denied. User ${req.user.id} is not admin or creator of degree ${degree.id}`);
        return res.status(403).json({ error: 'You do not have permission to create a version of this degree' });
      }
      
      // Only allow versioning for approved or active degrees
      if (!['approved', 'active'].includes(degree.status)) {
        console.log(`[ERROR] Cannot create version. Degree status is ${degree.status}`);
        return res.status(400).json({ 
          error: 'Can only create versions from approved or active degrees' 
        });
      }
      
      // Find the highest version number for this degree family
      // Build [Op.or] array with only defined IDs
      const opOrArray = [];
      if (req.params.id) opOrArray.push({ id: req.params.id });
      if (req.params.id) opOrArray.push({ parent_degree_id: req.params.id });
      if (degree.parent_degree_id) opOrArray.push({ id: degree.parent_degree_id });
      if (degree.parent_degree_id) opOrArray.push({ parent_degree_id: degree.parent_degree_id });
      const maxVersionDegree = await Degree.findOne({
        where: {
          [Op.or]: opOrArray,
        },
        order: [['version', 'DESC']],
      });
      // Calculate nextVersion just like course
      const nextVersion = (maxVersionDegree?.version || 1) + 1;

      // Create a new version with proper parent reference
      const newDegreeData = {
        name: degree.name,
        code: degree.code,
        description: degree.description,
        department_id: degree.department_id,
        courses: degree.courses,
        requirements: degree.requirements,
        duration_years: degree.duration_years,
        created_by: req.user.id,
        version: nextVersion,
        parent_degree_id: degree.parent_degree_id || degree.id,
        is_latest_version: true,
        status: 'draft',
        // Copy semester configuration and enrollment data
        courses_per_semester: degree.courses_per_semester || {},
        elective_options: degree.elective_options || {},
        enrollment_config: degree.enrollment_config || {},
        graduation_requirements: degree.graduation_requirements || {},
        academic_calendar: degree.academic_calendar || {}
      };
      
      console.log(`[DEBUG] Creating new degree version with data:`, {
        name: newDegreeData.name,
        code: newDegreeData.code,
        version: newDegreeData.version,
        parent_degree_id: newDegreeData.parent_degree_id,
        created_by: newDegreeData.created_by,
        has_courses_per_semester: !!newDegreeData.courses_per_semester && Object.keys(newDegreeData.courses_per_semester || {}).length > 0,
        has_enrollment_config: !!newDegreeData.enrollment_config
      });

      // Mark all previous versions as not latest
      const whereOr = [];
      if (req.params.id) whereOr.push({ id: req.params.id });
      if (req.params.id) whereOr.push({ parent_degree_id: req.params.id });
      if (degree.parent_degree_id) whereOr.push({ id: degree.parent_degree_id });
      if (degree.parent_degree_id) whereOr.push({ parent_degree_id: degree.parent_degree_id });
      await Degree.update(
        { is_latest_version: false },
        {
          where: {
            [Op.or]: whereOr,
          },
        }
      );

      const newDegree = await Degree.create(newDegreeData);
      
      console.log(`[SUCCESS] Created new degree version with ID: ${newDegree.id}`);

      // Fetch the created degree with associations
      const createdDegree = await Degree.findByPk(newDegree.id, {
        include: [
          { model: Department, as: 'department' },
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });
      
      // Validate that semester and enrollment data was copied correctly
      const dataValidation = {
        courses_per_semester: {
          original: Object.keys(degree.courses_per_semester || {}).length,
          copied: Object.keys(createdDegree.courses_per_semester || {}).length,
          status: Object.keys(degree.courses_per_semester || {}).length === Object.keys(createdDegree.courses_per_semester || {}).length ? 'Success' : 'Warning'
        },
        enrollment_config: {
          copied: !!createdDegree.enrollment_config,
          status: !!createdDegree.enrollment_config ? 'Success' : 'Warning'
        }
      };
      
      console.log(`[VALIDATION] Degree version creation data validation:`, dataValidation);

      res.status(201).json({
        message: `Degree version ${nextVersion} created successfully`,
        degree: createdDegree,
        version: nextVersion,
        validation: dataValidation
      });
    } catch (error) {
      console.error('Error creating degree version:', error);
      res.status(500).json({ error: 'Failed to create degree version', details: error.message });
    }
});

// Degree validation rules
const degreeValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Degree name must be 2-100 characters'),
  body('code').trim().isLength({ min: 2, max: 10 }).withMessage('Degree code must be 2-10 characters'),
  body('duration_years').isInt({ min: 1, max: 10 }).withMessage('Duration must be between 1-10 years'),
  body('department_id').isUUID().withMessage('Invalid department ID'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
];

// Get all degrees with optional filtering
router.get('/', 
  authenticateToken,
  async (req, res) => {
  try {
    const { Degree, Department, User } = await models.getMany('Degree', 'Department', 'User');
    const {
      department_code,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const whereClause = {};
    if (department_code) whereClause['$departmentByCode.code$'] = department_code;
    if (status) whereClause.status = status;
    // Only filter by created_by for non-admin/non-HOD users when status is not 'active'
    if (
      req.user &&
      req.user.user_type !== 'admin' &&
      !req.user.is_head_of_department &&
      whereClause.status !== 'active'
    ) {
      whereClause.created_by = req.user.id;
    }

    const offset = (page - 1) * limit;

    // Use findAndCountAll for pagination meta
    const { count, rows: degrees } = await Degree.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: 'departmentByCode',
          attributes: ['id', 'name', 'code']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // For each degree, check if a draft version exists for this degree or its parent
    const degreesWithDraftFlag = await Promise.all(degrees.map(async degree => {
      const draft = await Degree.findOne({
        where: {
          [Op.or]: [
            { parent_degree_id: degree.id },
            { parent_degree_id: degree.parent_degree_id || degree.id }
          ],
          status: 'draft'
        }
      });
      degree.dataValues.hasDraftVersion = !!draft;
      return degree;
    }));

    // Pagination object
    const pagination = {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit)
    };

    res.json({
      degrees: degreesWithDraftFlag,
      pagination
    });
  } catch (error) {
    console.error('Error fetching degrees:', error);
    res.status(500).json({ error: 'Failed to fetch degrees' });
  }
});

// Get faculty's department degrees (for department overview)
router.get('/my-degrees', 
  authenticateToken,
  async (req, res) => {
  try {
    const { Degree, Department, User } = await models.getMany('Degree', 'Department', 'User');
    // For development/testing when authentication is disabled
    // Use departmentId from query params or default test user context
    const departmentIdFromQuery = req.query.departmentId;
    const user = req.user || {
      id: 'test-user-id',
      department_id: departmentIdFromQuery || null, // Use query param for development
      user_type: 'faculty'
    };
    
    let whereClause = {};
    if (user && user.department_id) {
      whereClause.department_id = user.department_id;
      
      // Regular faculty see only their own degrees
      if (user.user_type !== 'admin' && !user.is_head_of_department && user.user_type !== 'office') {
        whereClause.created_by = user.id;
      }
      
      // Only filter by status if it's explicitly requested as a non-active status
      // This ensures that even when status=active is passed, we show all statuses
      if (req.query.status && req.query.status !== 'active') {
        whereClause.status = req.query.status;
      }

    } else {
      // If no user context and no departmentId query param, return empty array
      return res.json({ all: [], byStatus: {}, departmentInfo: null, summary: {} });
    }
    
    const degrees = await Degree.findAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: 'departmentByCode',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // For each degree, check if a draft version exists for this degree or its parent
    const degreesWithDraftFlag = await Promise.all(degrees.map(async degree => {
      const draft = await Degree.findOne({
        where: {
          [Op.or]: [
            { parent_degree_id: degree.id },
            { parent_degree_id: degree.parent_degree_id || degree.id }
          ],
          status: 'draft'
        }
      });
      degree.dataValues.hasDraftVersion = !!draft;
      return degree;
    }));

    // Group by status for better dashboard display
    const degreesByStatus = {
      draft: degreesWithDraftFlag.filter(degree => degree.status === 'draft'),
      submitted: degreesWithDraftFlag.filter(degree => degree.status === 'submitted'),
      approved: degreesWithDraftFlag.filter(degree => degree.status === 'approved'),
      active: degreesWithDraftFlag.filter(degree => degree.status === 'active'),
      others: degreesWithDraftFlag.filter(degree => !['draft', 'submitted', 'approved', 'active'].includes(degree.status))
    };

    res.json({
      all: degreesWithDraftFlag,
      byStatus: degreesByStatus,
      departmentInfo: degreesWithDraftFlag.length > 0 ? {
        id: degreesWithDraftFlag[0].department.id,
        name: degreesWithDraftFlag[0].department.name,
        code: degreesWithDraftFlag[0].department.code
      } : null,
      summary: {
        total: degreesWithDraftFlag.length,
        draft: degreesByStatus.draft.length,
        submitted: degreesByStatus.submitted.length,
        approved: degreesByStatus.approved.length,
        active: degreesByStatus.active.length,
        others: degreesByStatus.others.length
      }
    });
  } catch (error) {
    console.error('Error fetching faculty degrees:', error);
    res.status(500).json({ error: 'Failed to fetch faculty degrees' });
  }
});


// Create new degree (Faculty only)
router.post('/',
  authenticateToken,
  // authorizeRoles('faculty'), // Temporarily disabled for testing
  degreeValidation,
  handleValidationErrors,
  auditMiddleware('create', 'degree', 'Degree created'),
  async (req, res) => {
    try {
      const {
        name,
        code,
        description,
        duration_years,
        department_id,
      } = req.body;

      // Verify department exists and user belongs to it
      const department = await Department.findByPk(department_id);
      if (!department) {
        return res.status(400).json({ error: 'Department not found' });
      }

      // Faculty can only create degrees in their own department (temporarily bypassed for testing)
      const user = req.user || { department_id }; // Temp for testing
      if (user.department_id !== department_id) {
        return res.status(403).json({ error: 'Can only create degrees in your own department' });
      }

      // Check for duplicate degree code
      const existingDegree = await Degree.findOne({ where: { code: code.toUpperCase() } });
      if (existingDegree) {
        return res.status(409).json({ error: 'Degree code already exists' });
      }

      // Debug: print incoming request body
      console.log('CREATE DEGREE REQUEST:', JSON.stringify(req.body, null, 2));

      // Create degree
      const degree = await Degree.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        duration_years,
        department_id,
        status: 'draft', // Default status
        courses_per_semester: req.body.courses_per_semester || {},
      });

      // Fetch degree with associations
      const createdDegree = await Degree.findByPk(degree.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
        ],
      });

      // Debug: print response data
      console.log('CREATE DEGREE RESPONSE:', JSON.stringify(createdDegree, null, 2));
      res.status(201).json({
        message: 'Degree created successfully',
        degree: createdDegree,
      });
    } catch (error) {
      console.error('Error creating degree:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Degree with this code already exists' });
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

// Get degree by id or by code. If param looks like a UUID, treat as id; otherwise treat as code.
router.get('/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const param = req.params.id;
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const { Degree, Department, User, Course } = await models.getMany('Degree', 'Department', 'User', 'Course');

      let degree = null;

      // Support query params: ?id=<uuid> (override) and ?status=<status>
      const { status, id: queryId } = req.query;
      const idToUse = queryId || (uuidV4Regex.test(param) ? param : null);

      if (idToUse) {
        // Lookup by primary key (query id overrides path param)
        degree = await Degree.findByPk(idToUse, {
          include: [
            { model: Department, as: 'department' },
            {
              model: Course,
              as: 'courses',
              include: [ { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] } ],
            },
          ],
        });

        if (!degree) return res.status(404).json({ error: 'Degree not found' });

        // If status filter requested for an id lookup, enforce it
        if (status && String(degree.status) !== String(status)) {
          return res.status(404).json({ error: 'Degree not found' });
        }
      } else {
        // Lookup by code (default to active version unless overridden by query)
        const whereClause = { code: String(param).toUpperCase() };
        if (status) whereClause.status = status;
        if (queryId) whereClause.id = queryId;
        if (!status && !queryId) whereClause.status = 'active';

        degree = await Degree.findOne({
          where: whereClause,
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
            { model: Course, as: 'courses' },
            { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
          ]
        });
      }

      if (!degree) return res.status(404).json({ error: 'Degree not found' });

      // Only allow access if user is admin or degree creator when fetching by id
      if (uuidV4Regex.test(param) && req.user && req.user.user_type !== 'admin' && degree.created_by !== req.user.id) {
        return res.status(403).json({ error: 'Access denied: You do not own this degree' });
      }

      res.json({ degree });
    } catch (error) {
      console.error('Error fetching degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Update degree (Faculty only - same department)
router.put('/:id',
  authenticateToken,
  // authorizeRoles('faculty', 'admin'), // Temporarily disabled for testing
  degreeValidation,
  handleValidationErrors,
  async (req, res, next) => {
    const Degree = await require('../utils/models').Degree();
    return captureOriginalData(Degree, 'id')(req, res, next);
  },
  auditMiddleware('update', 'degree', 'Degree updated'),
  async (req, res) => {
    try {
      const degree = await Degree.findByPk(req.params.id);

      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }

      // Faculty can only update degrees in their department (temporarily bypassed for testing)
      const user = req.user || { department_id: degree.department_id, user_type: 'faculty' }; // Temp for testing
      
      // Only degree creator or admin can update
      if (degree.created_by !== user.id && user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Only degree creator or admin can update this degree' });
      }
      
      if (user.department_id !== degree.department_id && user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Can only update degrees in your own department' });
      }

      // Can't update active degrees with students enrolled
      if (degree.status === 'active') {
        const studentCount = await User.count({
          where: { degree_id: degree.id, user_type: 'student' },
        });
        if (studentCount > 0) {
          return res.status(400).json({ error: 'Cannot modify active degree with enrolled students' });
        }
      }

      const updatedFields = {};
      const allowedFields = [
        'name',
        'code',
        'description',
        'duration_years',
        'courses_per_semester',
        'status',
        'prerequisites',
        'study_details',
        'faculty_details',
        'version',
        'version_history',
        'feedback',
        'approval_history',
        'created_by',
        'updated_by',
        'approved_by'
      ];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updatedFields[field] = req.body[field];
        }
      });

      if (updatedFields.code) {
        updatedFields.code = updatedFields.code.toUpperCase();
      }

      // Debug: print incoming request body
      console.log('UPDATE DEGREE REQUEST:', JSON.stringify(req.body, null, 2));

      await degree.update(updatedFields);

      const updatedDegree = await Degree.findByPk(degree.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
        ],
      });

      // Debug: print response data
      console.log('UPDATE DEGREE RESPONSE:', JSON.stringify(updatedDegree, null, 2));
      res.json({
        message: 'Degree updated successfully',
        degree: updatedDegree,
      });
    } catch (error) {
      console.error('Error updating degree:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Degree with this code already exists' });
      }
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors.map(e => ({ field: e.path, message: e.message })),
        });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Submit degree for approval (Faculty only)
router.patch('/:id/submit',
  authenticateToken,
  // authorizeRoles('faculty'), // Temporarily disabled for testing
  auditMiddleware('update', 'degree', 'Degree submitted for approval'),
  async (req, res) => {
    try {
      const degree = await Degree.findByPk(req.params.id);

      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }

      // Faculty can only submit degrees from their department
      const user = req.user || { department_id: degree.department_id }; // Temp for testing
      if (user.department_id !== degree.department_id) {
        return res.status(403).json({ error: 'Can only submit degrees from your own department' });
      }

      if (degree.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft degrees can be submitted' });
      }

      await degree.update({ status: 'submitted' });

      res.json({
        message: 'Degree submitted for approval successfully',
        degree,
      });
    } catch (error) {
      console.error('Error submitting degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Approve degree (HOD only)
router.patch('/:id/approve',
  authenticateToken,
  // authorizeRoles('faculty'), // Only faculty (HOD) can approve
  auditMiddleware('update', 'degree', 'Degree approved'),
  async (req, res) => {
    try {
      const degree = await Degree.findByPk(req.params.id);

      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }

      // Verify user is HOD of the degree's department
      const user = req.user || { department_id: degree.department_id, is_head_of_department: true }; // Temp for testing
      if (user.department_id !== degree.department_id || !user.is_head_of_department) {
        return res.status(403).json({ error: 'Only Head of Department can approve degrees' });
      }

      if (degree.status !== 'submitted') {
        return res.status(400).json({ error: 'Only submitted degrees can be approved' });
      }

      await degree.update({
        status: 'approved',
      });

      res.json({
        message: 'Degree approved successfully',
        degree,
      });
    } catch (error) {
      console.error('Error approving degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// Delete degree (Faculty - same department, Admin)
router.delete('/:id',
  authenticateToken,
  // authorizeRoles('faculty', 'admin'), // Temporarily disabled for testing
  async (req, res, next) => {
    const Degree = await require('../utils/models').Degree();
    return captureOriginalData(Degree, 'id')(req, res, next);
  },
  auditMiddleware('delete', 'degree', 'Degree deleted'),
  async (req, res) => {
    try {
      const degree = await Degree.findByPk(req.params.id);

      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }

      // Accept userId and departmentId from request body for dev/test, fallback to req.user
      const user = req.user || {
        id: req.body.userId,
        department_id: req.body.departmentId,
        user_type: req.body.userType || 'faculty'
      };

      // Validate user context
      if (!user.id || !user.department_id) {
        return res.status(400).json({ error: 'User context required - missing userId or departmentId in request body' });
      }

      // Only degree creator or admin can delete
      if (degree.created_by !== user.id && user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Only degree creator or admin can delete this degree' });
      }

      // Faculty can only delete degrees from their own department (unless admin)
      if (user.user_type !== 'admin' && user.department_id !== degree.department_id) {
        return res.status(403).json({ error: 'Can only delete degrees from your own department' });
      }

      // Can't delete degrees with students or courses
      const [studentCount, courseCount] = await Promise.all([
        User.count({ where: { degree_id: degree.id, user_type: 'student' } }),
        Course.count({ where: { degree_id: degree.id } }),
      ]);

      if (studentCount > 0) {
        return res.status(400).json({ error: 'Cannot delete degree with enrolled students' });
      }

      if (courseCount > 0) {
        return res.status(400).json({ error: 'Cannot delete degree with associated courses' });
      }

      await degree.destroy();

      res.json({ message: 'Degree deleted successfully' });
    } catch (error) {
      console.error('Error deleting degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

router.patch('/:id/publish',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  auditMiddleware('update', 'degree', 'Degree published/activated'),
  async (req, res) => {
    try {
      const degree = await Degree.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: User, as: 'creator' },
        ],
      });

      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }

      // For development/testing when authentication is disabled
      const user = req.user || {
        id: req.body.userId,
        department_id: req.body.departmentId,
        user_type: 'faculty',
      };

      // Validate that we have user context
      if (!user.id || !user.department_id) {
        return res.status(400).json({ error: 'User context required - missing userId or departmentId in request body' });
      }

      // Only degree creator or faculty in the same department can publish
      if (degree.created_by !== user.id && user.department_id !== degree.department_id) {
        return res.status(403).json({ error: 'Only degree creator or department faculty can publish degrees' });
      }

      if (degree.status !== 'approved') {
        let message = 'Only approved degrees can be published';
        if (degree.status === 'draft') {
          message = 'Degree must be submitted and approved before publishing';
        } else if (degree.status === 'pending_approval') {
          message = 'Degree is still pending approval and cannot be published yet';
        } else if (degree.status === 'active') {
          message = 'Degree is already active/published';
        }
        return res.status(400).json({
          error: message,
          currentStatus: degree.status,
        });
      }

      // Handle version management if this is a versioned degree
      let createdCourses = [];
      let studentsToUpdate = [];
      
      if (degree.parent_degree_id || degree.version > 1) {
        // This is a new version being published - archive previous active versions
        const parentId = degree.parent_degree_id || degree.id;
        
        // Find previous active version(s) of this degree
        const previousActiveDegrees = await Degree.findAll({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { id: parentId },
                  { parent_degree_id: parentId },
                ],
              },
              { status: 'active' },
              { id: { [Op.ne]: degree.id } },
            ],
          },
        });
        
        // For each previous active degree, get all its courses and update them
        // to point to the new degree version
        const { Course } = require('../models');
        const courseUpdatePromises = [];
        
        for (const prevDegree of previousActiveDegrees) {
          // Find all courses associated with this previous degree version
          const courses = await Course.findAll({
            where: { 
              degree_id: prevDegree.id,
              status: 'active'
            }
          });
          
          console.log(`Found ${courses.length} courses to migrate from degree ${prevDegree.id} (${prevDegree.code} v${prevDegree.version}) to ${degree.id} (${degree.code} v${degree.version})`);
          
          if (courses.length === 0) {
            console.log(`Warning: No courses found for previous degree version ${prevDegree.id} (${prevDegree.code} v${prevDegree.version})`);
          }
          
          // Create copies of these courses for the new degree version
          for (const course of courses) {
            // Check if a course with this code already exists for the new degree
            const existingCourse = await Course.findOne({
              where: {
                code: course.code,
                degree_id: degree.id
              }
            });
            
            // Find the highest version number for courses with this code
            const maxVersionCourse = await Course.findOne({
              where: {
                code: course.code
              },
              order: [['version', 'DESC']]
            });
            
            // Calculate next version number - default to 1 if no existing versions found
            const nextVersion = maxVersionCourse ? maxVersionCourse.version + 1 : 1;
            console.log(`For course ${course.code}: Found max version ${maxVersionCourse?.version || 0}, using version ${nextVersion} for new copy`);
            
            if (!existingCourse) {
              // Create a new course linked to the new degree with all relevant fields
              courseUpdatePromises.push(
                Course.create({
                  name: course.name,
                  code: course.code,
                  overview: course.overview,
                  study_details: course.study_details || {},
                  faculty_details: course.faculty_details || {},
                  credits: course.credits,
                  semester: course.semester,
                  prerequisites: course.prerequisites || [],
                  max_students: course.max_students,
                  department_id: course.department_id,
                  degree_id: degree.id,
                  status: 'active',
                  created_by: req.user.id,
                  is_elective: course.is_elective || false,
                  version: nextVersion,
                  parent_course_id: course.id,
                  is_latest_version: true,
                  // Copy additional fields
                  capacity: course.capacity,
                  enrollment_start_at: course.enrollment_start_at,
                  enrollment_end_at: course.enrollment_end_at,
                  start_date: course.start_date,
                  end_date: course.end_date,
                  faculty_id: course.faculty_id,
                  tags: course.tags || [],
                  syllabus: course.syllabus,
                  grading_schema: course.grading_schema,
                  assessment_details: course.assessment_details
                })
              );
            } else {
              console.log(`Skipping course ${course.code} - already exists in the new degree version ${degree.id}`);
            }
          }
        }
        
        // Wait for all course updates to complete
        try {
          createdCourses = await Promise.all(courseUpdatePromises);
          console.log(`Successfully migrated ${createdCourses.length} courses to new degree version ${degree.id} (${degree.code} v${degree.version})`);
        } catch (courseError) {
          console.error('Error creating course copies:', courseError);
          
          // Check if it's a unique constraint error
          if (courseError.name === 'SequelizeUniqueConstraintError') {
            console.log(`Handling unique constraint error: ${courseError.message}`);
            
            // Attempt to fetch any courses that were successfully created
            createdCourses = await Course.findAll({
              where: {
                degree_id: degree.id,
                status: 'active'
              }
            });
            
            console.log(`Found ${createdCourses.length} courses already created for degree ${degree.id}`);
          } else {
            // For other errors, re-throw
            throw courseError;
          }
        }
        
        // Update all active students from old degree versions to the new version
        const { User } = require('../models');
        
        // First, find all students associated with previous degree versions
        studentsToUpdate = await User.findAll({
          where: {
            user_type: 'student',
            status: 'active',
            degree_id: {
              [Op.in]: previousActiveDegrees.map(d => d.id)
            }
          },
          attributes: ['id', 'first_name', 'last_name', 'email', 'student_id', 'degree_id', 'current_semester']
        });
        
        console.log(`Found ${studentsToUpdate.length} active students to migrate from previous degree versions to ${degree.id} (${degree.code} v${degree.version})`);
        
        if (studentsToUpdate.length > 0) {
          // Log details about the first few students (for debugging)
          const sampleStudents = studentsToUpdate.slice(0, Math.min(5, studentsToUpdate.length));
          console.log('Sample students being migrated:', sampleStudents.map(s => ({
            id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            student_id: s.student_id,
            email: s.email,
            old_degree_id: s.degree_id,
            current_semester: s.current_semester
          })));
          
          // Update all students to point to the new degree version
          const studentUpdateResult = await User.update(
            { degree_id: degree.id },
            {
              where: {
                id: {
                  [Op.in]: studentsToUpdate.map(s => s.id)
                }
              }
            }
          );
          
          console.log(`Successfully updated ${studentUpdateResult[0]} active students to new degree version ${degree.id} (${degree.code} v${degree.version})`);
        } else {
          console.log(`No active students found for previous degree versions to migrate`);
        }
        
        // Now archive the old degree versions
        await Degree.update(
          { status: 'archived' },
          {
            where: {
              [Op.and]: [
                {
                  [Op.or]: [
                    { id: parentId },
                    { parent_degree_id: parentId },
                  ],
                },
                { status: 'active' },
                { id: { [Op.ne]: degree.id } },
              ],
            },
          }
        );
      }

      await degree.update({
        status: 'active',
        updated_by: user.id || req.body.userId,
      });

      res.json({
        message: 'Degree published and is now active',
        degree,
        migration_summary: {
          courses_migrated: createdCourses.length,
          students_updated: studentsToUpdate.length
        }
      });
    } catch (error) {
      console.error('Error publishing degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
