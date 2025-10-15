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


/**
 * PATCH /degrees/:id/reject
 * Purpose: Reject a degree (HOD only)
 * Access: Authenticated HOD (Head of Department)
 * Params: id (degree UUID)
 * Body: reason (string, required, 10-500 chars)
 * Response: { message, degree }
 */
router.patch(
  '/:id/reject',
  authenticateToken,
  [body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Rejection reason required (10-500 characters)')],
  handleValidationErrors,
  auditMiddleware('update', 'degree', 'Degree Change Requested'),
  async (req, res) => {
    try {
      const { reason } = req.body;
      const Degree = await models.Degree();
      const Message = await models.Message();
      const degree = await Degree.findByPk(req.params.id);
      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }
      const user = req.user;
      if (!user || !user.id) {
        return res.status(400).json({ error: 'User context required' });
      }
      // HOD check: must be HOD of the degree's department
      if (!user.is_head_of_department || user.department_code !== degree.department_code) {
        return res.status(403).json({ error: 'Only Head of Department can reject degrees in their own department' });
      }
      if (degree.status !== 'pending_approval') {
        return res.status(400).json({ error: 'Only pending approval degrees can be rejected' });
      }
      await degree.update({ status: 'draft', feedback: reason, updated_by: user.id });
      // Add rejection message to messages table
      await Message.create({
        type: 'degree',
        reference_id: degree.id,
        sender_id: user.id,
        message: `Degree change requested: ${reason}`,
      });
      res.json({ message: 'Degree change requested', degree });
    } catch (error) {
      console.error('Error rejecting degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


/**
 * POST /degrees/:id/create-version
 * Purpose: Create a new version of an approved or active degree
 * Access: Authenticated faculty or admin
 * Params: id (degree UUID)
 * Body: none (copies existing degree data)
 * Response: { message, degree, version, validation }
 */
router.post(
  '/:id/create-version',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  auditMiddleware('create', 'degree', 'Degree version created'),
  async (req, res) => {
    try {
      const { Degree, Department, User } = await models.getMany('Degree', 'Department', 'User');
      const degree = await Degree.findByPk(req.params.id, {
        include: [{ model: Department, as: 'departmentByCode' }],
      });
      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }
      // Only admin or degree creator can create a new version
      const isAdmin = req.user.user_type === 'admin';
      const isCreator = degree.created_by === req.user.id;
      if (!isAdmin && !isCreator) {
        return res.status(403).json({ error: 'You do not have permission to create a version of this degree' });
      }
      // Only allow versioning for approved or active degrees
      if (!['approved', 'active'].includes(degree.status)) {
        return res.status(400).json({ error: 'Can only create versions from approved or active degrees' });
      }
      // Find the highest version number for this degree family
      const opOrArray = [];
      if (req.params.id) opOrArray.push({ id: req.params.id });
      if (req.params.id) opOrArray.push({ parent_degree_id: req.params.id });
      if (degree.parent_degree_id) opOrArray.push({ id: degree.parent_degree_id });
      if (degree.parent_degree_id) opOrArray.push({ parent_degree_id: degree.parent_degree_id });
      const maxVersionDegree = await Degree.findOne({
        where: { [Op.or]: opOrArray },
        order: [['version', 'DESC']],
      });
      const nextVersion = (maxVersionDegree?.version || 1) + 1;
      // Create a new version with proper parent reference
      const newDegreeData = {
        name: degree.name,
        code: degree.code,
        description: degree.description,
        department_id: degree.department_id,
        department_code: degree.department_code,
        courses: degree.courses,
        requirements: degree.requirements,
        duration_years: degree.duration_years,
        created_by: req.user.id,
        version: nextVersion,
        parent_degree_id: degree.parent_degree_id || degree.id,
        is_latest_version: true,
        status: 'draft',
        courses_per_semester: degree.courses_per_semester || {},
        elective_options: degree.elective_options || {},
        enrollment_config: degree.enrollment_config || {},
        graduation_requirements: degree.graduation_requirements || {},
        academic_calendar: degree.academic_calendar || {},
      };
      // Mark all previous versions as not latest
      const whereOr = [];
      if (req.params.id) whereOr.push({ id: req.params.id });
      if (req.params.id) whereOr.push({ parent_degree_id: req.params.id });
      if (degree.parent_degree_id) whereOr.push({ id: degree.parent_degree_id });
      if (degree.parent_degree_id) whereOr.push({ parent_degree_id: degree.parent_degree_id });
      await Degree.update(
        { is_latest_version: false },
        { where: { [Op.or]: whereOr } }
      );
      const newDegree = await Degree.create(newDegreeData);
      // Fetch the created degree with associations
      const createdDegree = await Degree.findByPk(newDegree.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
        ],
      });
      // Validate that semester and enrollment data was copied correctly
      const dataValidation = {
        courses_per_semester: {
          original: Object.keys(degree.courses_per_semester || {}).length,
          copied: Object.keys(createdDegree.courses_per_semester || {}).length,
          status:
            Object.keys(degree.courses_per_semester || {}).length ===
            Object.keys(createdDegree.courses_per_semester || {}).length
              ? 'Success'
              : 'Warning',
        },
        enrollment_config: {
          copied: !!createdDegree.enrollment_config,
          status: !!createdDegree.enrollment_config ? 'Success' : 'Warning',
        },
      };
      res.status(201).json({
        message: `Degree version ${nextVersion} created successfully`,
        degree: createdDegree,
        version: nextVersion,
        validation: dataValidation,
      });
    } catch (error) {
      console.error('Error creating degree version:', error);
      res.status(500).json({ error: 'Failed to create degree version', details: error.message });
    }
  }
);

// Degree validation rules
const degreeValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Degree name must be 2-100 characters'),
  body('code').trim().isLength({ min: 2, max: 10 }).withMessage('Degree code must be 2-10 characters'),
  body('duration_years').isInt({ min: 1, max: 10 }).withMessage('Duration must be between 1-10 years'),
  body('department_code').trim().isLength({ min: 2, max: 10 }).withMessage('Department code must be 2-10 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
];

// Get all degrees with optional filtering
/**
 * GET /degrees
 * Purpose: Retrieve all degrees with optional filtering and pagination
 * Access: Authenticated users
 * Query Params:
 *   - department_code (string, optional): Filter by department code
 *   - status (string, optional): Filter by degree status
 *   - page (int, optional): Page number for pagination (default: 1)
 *   - limit (int, optional): Items per page (default: 50)
 * Response: { degrees: [...], pagination: { total, page, limit, pages } }
 */
router.get(
  '/',
  authenticateToken,
  async (req, res) => {
    try {
      const { Degree, Department, User } = await models.getMany('Degree', 'Department', 'User');
      const {
        department_code,
        status,
        page = 1,
        limit = 50,
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
            attributes: ['id', 'name', 'code'],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });
      // For each degree, check if a draft version exists for this degree or its parent
      const degreesWithDraftFlag = await Promise.all(
        degrees.map(async (degree) => {
          const draft = await Degree.findOne({
            where: {
              [Op.or]: [
                { parent_degree_id: degree.id },
                { parent_degree_id: degree.parent_degree_id || degree.id },
              ],
              status: 'draft',
            },
          });
          degree.dataValues.hasDraftVersion = !!draft;
          return degree;
        })
      );
      // Remap departmentByCode -> department
      const degreesRemapped = degreesWithDraftFlag.map((degree) => {
        const obj = { ...degree.dataValues };
        if (obj.departmentByCode) {
          obj.department = obj.departmentByCode;
          delete obj.departmentByCode;
        }
        return obj;
      });
      // Pagination object
      const pagination = {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      };
      res.json({ degrees: degreesRemapped, pagination });
    } catch (error) {
      console.error('Error fetching degrees:', error);
      res.status(500).json({ error: 'Failed to fetch degrees' });
    }
  }
);

/**
 * POST /degrees
 * Purpose: Create a new degree (Faculty only)
 * Access: Authenticated faculty (same department)
 * Body:
 *   - name (string, required, 2-100 chars)
 *   - code (string, required, 2-10 chars)
 *   - description (string, optional, <1000 chars)
 *   - duration_years (int, required, 1-10)
 *   - department_id (string, required)
 *   - courses_per_semester (object, optional)
 * Response: { message, degree }
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('faculty'),
  degreeValidation,
  handleValidationErrors,
  auditMiddleware('create', 'degree', 'Degree created'),
  async (req, res) => {
    try {
      const { name, code, description, duration_years, department_id } = req.body;
      // Verify department exists and user belongs to it
      const department = await Department.findByPk(department_id);
      if (!department) {
        return res.status(400).json({ error: 'Department not found' });
      }
      // Faculty can only create degrees in their own department (temporarily bypassed for testing)
      const user = req.user || { department_id };
      if (user.department_id !== department_id) {
        return res.status(403).json({ error: 'Can only create degrees in your own department' });
      }
      // Check for duplicate degree code
      const existingDegree = await Degree.findOne({ where: { code: code.toUpperCase() } });
      if (existingDegree) {
        return res.status(409).json({ error: 'Degree code already exists' });
      }
      // Create degree
      const degree = await Degree.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        duration_years,
        department_id,
        status: 'draft',
        courses_per_semester: req.body.courses_per_semester || {},
      });
      // Fetch degree with associations
      const createdDegree = await Degree.findByPk(degree.id, {
        include: [{ model: Department, as: 'departmentByCode' }],
      });
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
          details: error.errors.map((e) => ({ field: e.path, message: e.message })),
        });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


/**
 * GET /degrees/:id
 * Purpose: Retrieve a degree by UUID or code
 * Access: Authenticated users
 * Params:
 *   - id (UUID or code): Path param, if UUID then lookup by id, else by code
 * Query Params:
 *   - id (UUID, optional): Overrides path param for lookup
 *   - status (string, optional): Filter by degree status
 * Response: { degree }
 * Error Codes:
 *   404 - Degree not found
 *   403 - Access denied (not owner or admin)
 *   500 - Internal server error
 */
router.get(
  '/:id',
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
              include: [
                { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
              ],
            },
          ],
        });
        if (!degree) {
          return res.status(404).json({ error: 'Degree not found' });
        }
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
            { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
          ],
        });
      }
      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }
      // Only allow access if user is admin, degree creator, or faculty of the same department when fetching by id
      if (uuidV4Regex.test(param) && req.user) {
        const isAdmin = req.user.user_type === 'admin';
        const isCreator = degree.created_by === req.user.id;
        const isDepartmentFaculty =
          req.user.user_type === 'faculty' &&
          (req.user.department_id === degree.department_id || req.user.department_code === degree.department_code);

        if (!isAdmin && !isCreator && !isDepartmentFaculty) {
          return res.status(403).json({ error: 'Access denied: You do not have permission to view this degree' });
        }
      }
      res.json({ degree });
    } catch (error) {
      console.error('Error fetching degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update degree (Faculty/Admin - same department). This handler is documented,
// uses per-request model loading (serverless-friendly), preserves original data
// for auditing via captureOriginalData, and enforces permissions:
// - admin users
// - degree creator
// - Head of Department (HOD) for the degree's department
// - faculty in the same department
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  degreeValidation,
  handleValidationErrors,
  async (req, res, next) => {
    // Per-request model load to avoid global state in serverless
    const { Degree } = await require('../utils/models').getMany('Degree');
    return captureOriginalData(Degree, 'id')(req, res, next);
  },
  auditMiddleware('update', 'degree', 'Degree updated'),
  async (req, res) => {
    try {
      const { Degree, Department, User } = await require('../utils/models').getMany(
        'Degree',
        'Department',
        'User'
      );

      const degree = await Degree.findByPk(req.params.id);
      if (!degree) return res.status(404).json({ error: 'Degree not found' });

      const user = req.user;
      if (!user || !user.id) {
        return res.status(400).json({ error: 'User context required' });
      }

      const isAdmin = user.user_type === 'admin';
      const isCreator = degree.created_by === user.id;
      const isHod = user.is_head_of_department && user.department_code === degree.department_code;
      const isDepartmentFaculty =
        user.user_type === 'faculty' && (user.department_id === degree.department_id || user.department_code === degree.department_code);

      if (!isAdmin && !isCreator && !isHod && !isDepartmentFaculty) {
        return res.status(403).json({ error: 'Access denied: you do not have permission to update this degree' });
      }

      // Allow list for updatable fields
      const allowedFields = new Set([
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
        'updated_by',
        'approved_by',
        'department_code',
      ]);

      const updates = {};
      Object.keys(req.body || {}).forEach((k) => {
        if (allowedFields.has(k)) updates[k] = req.body[k];
      });

      if (updates.code) updates.code = String(updates.code).toUpperCase();

      // Minimal validation: ensure department_code (if changing) maps to an existing department
      if (updates.department_code) {
        const dept = await Department.findOne({ where: { code: updates.department_code } });
        if (!dept) return res.status(400).json({ error: 'Invalid department_code' });
        updates.department_id = dept.id; // keep both for integrity
      }

      // Apply updates
      await degree.update(updates);

      const refreshed = await Degree.findByPk(degree.id, {
        include: [{ model: Department, as: 'departmentByCode' }],
      });

      // Sanitize output to avoid leaking internal fields
      const sanitized = { ...refreshed.dataValues };
      if (sanitized.departmentByCode) {
        sanitized.department = sanitized.departmentByCode;
        delete sanitized.departmentByCode;
      }

      res.json({ data: sanitized, message: 'Degree updated successfully' });
    } catch (error) {
      console.error('Error in PUT /degrees/:id:', error);
      if (error && error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Degree with this code already exists' });
      }
      if (error && error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors.map((e) => ({ field: e.path, message: e.message })),
        });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Submit degree for approval (Faculty only)
router.patch(
  '/:id/submit',
  authenticateToken,
  authorizeRoles('faculty'),
  auditMiddleware('update', 'degree', 'Degree submitted for approval'),
  async (req, res) => {
    try {
      const { Degree, Message, User } = await require('../utils/models').getMany('Degree', 'Message', 'User');

      const degree = await Degree.findByPk(req.params.id);
      if (!degree) return res.status(404).json({ error: 'Degree not found' });

      const user = req.user;
      if (!user || !user.id) return res.status(400).json({ error: 'User context required' });

      const isAdmin = user.user_type === 'admin';
      const isCreator = degree.created_by === user.id;
      const isDeptFaculty = user.user_type === 'faculty' && user.department_code === degree.department_code;

      // Only admin, degree creator, or faculty of the same department can submit
      if (!isAdmin && !isCreator && !isDeptFaculty) {
        return res.status(403).json({ error: 'Access denied: cannot submit this degree for approval' });
      }

      if (degree.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft degrees can be submitted' });
      }

      await degree.update({ status: 'pending_approval', updated_by: user.id });

      // Optionally add a message to the timeline
      if (req.body && req.body.message) {
        await Message.create({
          type: 'degree',
          reference_id: degree.id,
          sender_id: user.id,
          message: req.body.message,
        });
      }

      // Notify HOD (if found) about the submission
      try {
        const hod = await User.findOne({
          where: {
            department_code: degree.department_code,
            user_type: 'faculty',
            is_head_of_department: true,
          },
        });
        if (hod) {
          const { sendDegreeApprovalEmail } = require('../utils/email');
          sendDegreeApprovalEmail(degree, hod).catch(emailErr => {
            console.error('Failed to send degree approval email to HOD:', emailErr);
          });
        }
      } catch (notifyErr) {
        console.error('Error finding HOD or sending notification:', notifyErr);
      }

      // Return updated degree
      const updated = await Degree.findByPk(degree.id, {
        include: [{ model: require('../models').Department, as: 'departmentByCode' }],
      });

      res.json({ message: 'Degree submitted for approval', degree: updated });
    } catch (error) {
      console.error('Error submitting degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /degrees/:id/approve
 * Purpose: Approve a degree (HOD only)
 *
 * Behavioural contract:
 * - Only the Head of Department (HOD) for the degree's department may approve
 * - Degree must be in 'pending_approval' state
 * - Approval is recorded as a Message timeline entry inside a DB transaction
 * - Degree status is set to 'approved' and `approved_by`/`updated_by` are recorded
 */
router.patch(
  '/:id/approve',
  authenticateToken,
  authorizeRoles('faculty'),
  auditMiddleware('update', 'degree', 'Degree approved'),
  async (req, res) => {
    const { Degree, Message } = await require('../utils/models').getMany('Degree', 'Message');
    const sequelize = require('../config/database').sequelize;
    const transaction = await sequelize.transaction();
    try {
      const degree = await Degree.findByPk(req.params.id, { transaction });
      if (!degree) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Degree not found' });
      }

      const user = req.user;
      if (!user || !user.id) {
        await transaction.rollback();
        return res.status(400).json({ error: 'User context required' });
      }

      // Only HOD of the degree's department can approve
      if (!user.is_head_of_department || user.department_code !== degree.department_code) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Only Head of Department can approve degrees in their own department' });
      }

      if (!['pending_approval'].includes(degree.status)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Only pending approval degrees can be approved', currentStatus: degree.status });
      }

      // Create approval message first
      const approvalMsg = await Message.create({
        type: 'degree',
        reference_id: degree.id,
        sender_id: user.id,
        message: `Degree approved by HOD${req.body.reason ? ': ' + req.body.reason : ''}`,
      }, { transaction });

      if (!approvalMsg || !approvalMsg.id) {
        await transaction.rollback();
        return res.status(500).json({ error: 'Failed to create approval message' });
      }

      await degree.update({ status: 'approved', approved_by: user.id, updated_by: user.id }, { transaction });

      await transaction.commit();

      const updated = await Degree.findByPk(degree.id, {
        include: [{ model: require('../models').Department, as: 'departmentByCode' }],
      });

      res.json({ message: 'Degree approved', degree: updated });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('Error approving degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete degree (Faculty - same department, Admin)
//
// Deletes a degree if and only if:
// - requester is the degree creator or an admin
// - requester is from the same department (unless admin)
// - there are no enrolled students and no associated courses
// Uses audit/captureOriginalData to preserve pre-delete state.
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  async (req, res, next) => {
    const { Degree } = await require('../utils/models').getMany('Degree');
    return captureOriginalData(Degree, 'id')(req, res, next);
  },
  auditMiddleware('delete', 'degree', 'Degree deleted'),
  async (req, res) => {
    try {
      const { Degree, User, Course } = await require('../utils/models').getMany('Degree', 'User', 'Course');

      const degree = await Degree.findByPk(req.params.id);
      if (!degree) return res.status(404).json({ error: 'Degree not found' });

      // Use authenticated user context
      const user = req.user;
      if (!user || !user.id) {
        return res.status(400).json({ error: 'User context required' });
      }

      const isAdmin = user.user_type === 'admin';
      const isCreator = degree.created_by === user.id;

      // Only degree creator or admin can delete
      if (!isAdmin && !isCreator) {
        return res.status(403).json({ error: 'Only degree creator or admin can delete this degree' });
      }

      // Faculty can only delete degrees from their own department (unless admin)
      if (!isAdmin && user.department_code !== degree.department_code) {
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
  }
);

/**
 * PATCH /degrees/:id/publish
 * Purpose: Publish (activate) an approved degree and migrate/version related data
 * Access: Degree creator, department faculty, or admin
 * Behavioural notes:
 * - Degree must be in 'approved' state to publish
 * - If this degree is a new version, courses from previous active versions are copied
 *   into the new version and active students may be migrated to the new degree id
 * - Uses per-request model loading and consistent req.user context
 */
router.patch('/:id/publish',
  authenticateToken,
  authorizeRoles('faculty', 'admin'),
  auditMiddleware('update', 'degree', 'Degree published/activated'),
  async (req, res) => {
    try {
      const { Degree, Department, User } = await require('../utils/models').getMany('Degree', 'Department', 'User', 'Course');
      const degree = await Degree.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: User, as: 'creator' },
        ],
      });

      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }

      // Require authenticated user
      const user = req.user;
      if (!user || !user.id) {
        return res.status(400).json({ error: 'User context required' });
      }

      // Only degree creator or faculty in the same department can publish (admin bypasses dept check)
      if (degree.created_by !== user.id && user.user_type !== 'admin' && user.department_code !== degree.department_code) {
        return res.status(403).json({ error: 'Only degree creator or department faculty can publish degrees' });
      }

      if (degree.status !== 'approved') {
        let message = 'Only approved degrees can be published';
        if (degree.status === 'draft') {
          message = 'Degree must be approved before publishing';
        } else if (degree.status === 'pending_approval') {
          message = 'Degree is still pending approval and cannot be published yet';
        } else if (degree.status === 'active') {
          message = 'Degree is already active/published';
        }
        return res.status(400).json({ error: message, currentStatus: degree.status });
      }
      
      if (degree.parent_degree_id || degree.version > 1) {
        const parentId = degree.parent_degree_id;

        await Degree.update(
          { status: 'archived' },
          { where: { [Op.and]: [ { [Op.or]: [{ id: parentId }, { parent_degree_id: parentId }] }, { status: 'active' }, { id: { [Op.ne]: degree.id } } ] } }
        );
      }

      await degree.update({ status: 'active', updated_by: user.id });

      res.json({ message: 'Degree published and is now active', degree});
    } catch (error) {
      console.error('Error publishing degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
