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
const { handleCaughtError } = require('../utils/errorHandler');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { auditMiddleware, captureOriginalData } = require('../middleware/audit');

const router = express.Router();

/**
 * GET /degrees/public
 * Purpose: Get all active degrees with courses (public endpoint, no authentication required)
 * Access: Public (no authentication)
 * Query Params:
 *   - department_code (string, optional): Filter by department code
 * Response: { degrees: [...] }
 */
router.get('/public', async (req, res) => {
  try {
  const { Degree, Department, Course } = await models.getMany('Degree', 'Department', 'Course');
    const { department_code } = req.query;
    
    const whereClause = { status: 'active' };
    if (department_code) {
      whereClause.department_code = department_code;
    }

    const degrees = await Degree.findAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: 'departmentByCode',
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Course,
          as: 'courses',
          where: { status: 'active' },
          required: false,
          attributes: ['id', 'name', 'code', 'credits', 'semester'],
        },
      ],
      order: [['name', 'ASC']],
      attributes: [
        'id', 'name', 'code', 'description', 'duration_years', 'status', 'department_code',
        'specializations', 'career_prospects', 'admission_requirements', 'accreditation', 'fees',
        'entry_requirements', 'learning_outcomes', 'assessment_methods', 'contact_information',
        'application_deadlines', 'application_process'
      ],
    });

    // Format the response to be cleaner
    const formattedDegrees = degrees.map(degree => ({
      id: degree.id,
      name: degree.name,
      code: degree.code,
      description: degree.description,
      duration_years: degree.duration_years,
      status: degree.status,
      department: degree.departmentByCode ? {
        name: degree.departmentByCode.name,
        code: degree.departmentByCode.code,
      } : null,
      courses: degree.courses || [],
      total_credits: degree.courses ? degree.courses.reduce((sum, c) => sum + (c.credits || 0), 0) : 0,
      specializations: degree.specializations,
      career_prospects: degree.career_prospects,
      admission_requirements: degree.admission_requirements,
      accreditation: degree.accreditation,
      fees: degree.fees,
      entry_requirements: degree.entry_requirements,
      learning_outcomes: degree.learning_outcomes,
      assessment_methods: degree.assessment_methods,
      contact_information: degree.contact_information,
      application_deadlines: degree.application_deadlines,
      application_process: degree.application_process,
      created_by: degree.created_by,
      creator: degree.creator ? {
        id: degree.creator.id,
        first_name: degree.creator.first_name,
        last_name: degree.creator.last_name,
        email: degree.creator.email,
      } : null,
    }));

    res.json({ degrees: formattedDegrees });
  } catch (error) {
    handleCaughtError(res, error, 'Failed to fetch public degrees');
  }
});


/**
 * GET /degrees/public/:code
 * Purpose: Get single active degree by code with courses (public endpoint, no authentication required)
 * Access: Public (no authentication)
 * Params: code (degree code)
 * Response: { degree: {...} }
 */
router.get('/public/:code', async (req, res) => {
  try {
    const { code } = req.params;
    // Use unified helper and request only active degree + active courses for public endpoint
    const degree = await fetchAndFormatDegree({ code, includeMeta: false, resolveNames: true, activeOnly: true });
    if (!degree) {
      return res.status(404).json({ error: 'Degree programme not found or not active' });
    }
    return res.json({ degree });
  } catch (error) {
    handleCaughtError(res, error, 'Failed to fetch degree details');
  }
});

/**
 * GET /degrees/preview/:id
 * Purpose: Preview degree by ID (any status, authenticated, department-limited)
 * Access: Authenticated users of same department as degree
 * Params: id (degree UUID)
 * Response: { degree: {...} }
 */
router.get('/preview/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    // Request meta fields for preview only
    const degree = await fetchAndFormatDegree({ id, includeMeta: true });
    if (!degree) {
      return res.status(404).json({ error: 'Degree programme not found' });
    }
    // Department access check
    if (!user || !user.department_code || user.department_code !== degree.department?.code) {
      return res.status(403).json({ error: 'Access denied: not in same department as degree' });
    }
      // degree already includes meta because we requested includeMeta
      return res.json({ degree });
  } catch (error) {
    handleCaughtError(res, error, 'Failed to fetch degree preview');
  }
});

// Unified function to fetch and format degree by id or code
async function fetchAndFormatDegree({ id, code, includeMeta = false, resolveNames = true, activeOnly = false }) {
  const { Degree, Department, Course, User } = await models.getMany('Degree', 'Department', 'Course', 'User');
  let degree = null;
  if (id) {
    degree = await Degree.findByPk(id, {
      include: [
        { model: Department, as: 'departmentByCode', attributes: ['id', 'name', 'code'] },
        { model: Course, as: 'coursesByCode', required: false, attributes: ['id', 'name', 'code', 'credits', 'semester', 'status'] },
      ],
    });
  } else if (code) {
    const where = { code: code.toUpperCase() };
    if (activeOnly) where.status = 'active';
    degree = await Degree.findOne({
      where,
      include: [
        { model: Department, as: 'departmentByCode', attributes: ['id', 'name', 'code'] },
        { model: Course, as: 'coursesByCode', where: activeOnly ? { status: 'active' } : undefined, required: false, attributes: ['id', 'name', 'code', 'credits', 'semester', 'status'] },
      ],
    });
  }
  if (!degree) return null;
  // Group courses by semester for course_structure
  let course_structure = {};
  const coursesArr = degree.coursesByCode || [];
  if (coursesArr.length > 0) {
    for (const course of coursesArr) {
      const sem = course.semester || 0;
      if (!course_structure[sem]) course_structure[sem] = [];
      course_structure[sem].push(course);
    }
  }
  // Flatten course_structure to a single array for 'courses'
  let flatCourses = [];
  if (course_structure && typeof course_structure === 'object') {
    flatCourses = Object.values(course_structure).flat();
  }

  // Base return object
  const base = {
    id: degree.id,
    name: degree.name,
    code: degree.code,
    version: degree.version,
    description: degree.description,
    duration_years: degree.duration_years,
    status: degree.status,
    department: degree.departmentByCode ? {
      id: degree.departmentByCode.id,
      name: degree.departmentByCode.name,
      code: degree.departmentByCode.code,
    } : null,
    prerequisites: degree.prerequisites,
    study_details: degree.study_details ,
    faculty_details: degree.faculty_details,
    course_structure: course_structure,
    courses: flatCourses,
    total_credits: degree.total_credits,
    specializations: degree.specializations,
    career_prospects: degree.career_prospects,
    admission_requirements: degree.admission_requirements,
    accreditation: degree.accreditation,
    fees: degree.fees,
    entry_requirements: degree.entry_requirements,
    learning_outcomes: degree.learning_outcomes,
    assessment_methods: degree.assessment_methods,
    contact_information: degree.contact_information,
    application_deadlines: degree.application_deadlines,
    application_process: degree.application_process,
  };

  // faculty_details is now a rich text (HTML) string; no object resolution needed

  // If meta requested, resolve and attach creator/updater/approver names and timestamps
  if (includeMeta) {
    let createdByName = null, updatedByName = null, approvedByName = null;
    if (degree.created_by) {
      const user = await User.findByPk(degree.created_by);
      if (user) createdByName = `${user.first_name} ${user.last_name}`;
    }
    if (degree.updated_by) {
      const user = await User.findByPk(degree.updated_by);
      if (user) updatedByName = `${user.first_name} ${user.last_name}`;
    }
    if (degree.approved_by) {
      const user = await User.findByPk(degree.approved_by);
      if (user) approvedByName = `${user.first_name} ${user.last_name}`;
    }

    return {
      ...base,
      created_by: createdByName,
      created_at: degree.createdAt || null,
      updated_by: updatedByName,
      updated_at: degree.updatedAt || null,
      approved_by: approvedByName,
      approved_at: degree.approved_at || null,
    };
  }

  return base;
}

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
  await degree.update({ status: 'draft', feedback: reason, updated_by: user.id, submitted_at: null, approved_by: null, approved_at: null });
      // Add rejection message to messages table
      await Message.create({
        type: 'degree',
        reference_id: degree.id,
        sender_id: user.id,
        message: `Degree change requested: ${reason}`,
      });
      res.json({ message: 'Degree change requested', degree });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to request degree change');
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
      // Only admin, degree creator, or collaborator can create a new version
      const isAdmin = req.user.user_type === 'admin';
      const isCreator = degree.created_by === req.user.id;
      let isCollaborator = false;
      if (!isAdmin && !isCreator) {
        // Check if user is a collaborator
        if (typeof degree.getCollaborators === 'function') {
          const collaborators = await degree.getCollaborators();
          isCollaborator = collaborators.some(u => u.id === req.user.id);
        } else if (degree.collaborators && Array.isArray(degree.collaborators)) {
          isCollaborator = degree.collaborators.some(u => u.id === req.user.id);
        }
        if (!isCollaborator) {
          return res.status(403).json({ error: 'You do not have permission to create a version of this degree' });
        }
      }
      // Only allow versioning for approved or active degrees
      if (!['approved', 'active'].includes(degree.status)) {
        return res.status(400).json({ error: 'Can only create versions from approved or active degrees' });
      }

      // Check if there's already a draft, pending, or approved version in the family
      const degreeFamily = [];
      if (req.params.id) degreeFamily.push({ id: req.params.id });
      if (req.params.id) degreeFamily.push({ parent_degree_id: req.params.id });
      if (degree.parent_degree_id) degreeFamily.push({ id: degree.parent_degree_id });
      if (degree.parent_degree_id) degreeFamily.push({ parent_degree_id: degree.parent_degree_id });

      const existingDraftOrPending = await Degree.findOne({
        where: {
          [Op.or]: degreeFamily,
          status: { [Op.in]: ['draft', 'pending_approval', 'approved'] }
        }
      });

      if (existingDraftOrPending) {
        return res.status(400).json({ 
          error: 'Cannot create a new version while another version is in draft, pending approval, or approved status',
          existingVersion: {
            id: existingDraftOrPending.id,
            version: existingDraftOrPending.version,
            status: existingDraftOrPending.status
          }
        });
      }

      // Find the highest version number for this degree family
      const opOrArray = degreeFamily;
      const maxVersionDegree = await Degree.findOne({
        where: { [Op.or]: opOrArray },
        order: [['version', 'DESC']],
      });
      const nextVersion = (maxVersionDegree?.version || 1) + 1;
      // Use utility to copy all fields except blacklisted ones
      const { copyModelFieldsForVersioning } = require('../utils/versioning');
      const blacklist = [
        'id', 'created_at', 'updated_at', 'approved_at', 'approved_by', 'updated_by',
        'submitted_at', 'is_latest_version', 'status', 'version',
        'parent_degree_id', 'created_by',
      ];
      let newDegreeData = copyModelFieldsForVersioning(degree, blacklist);
      // code is now copied from the original degree
      newDegreeData.created_by = req.user.id;
      newDegreeData.version = nextVersion;
      newDegreeData.parent_degree_id = degree.parent_degree_id || degree.id;
      newDegreeData.is_latest_version = true;
      newDegreeData.status = 'draft';
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
      handleCaughtError(res, error, 'Failed to create degree version');
    }
  }
);

// Degree validation rules
const degreeValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Degree name must be 2-100 characters'),
  body('code').trim().isLength({ min: 2, max: 10 }).withMessage('Degree code must be 2-10 characters'),
  body('duration_years').isInt({ min: 1, max: 10 }).withMessage('Duration must be between 1-10 years'),
  body('department_code').trim().isLength({ min: 2, max: 10 }).withMessage('Department code must be 2-10 characters'),
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
        all_creators
      } = req.query;
  const whereClause = {};
  if (department_code) whereClause['department_code'] = department_code;
  if (status) whereClause.status = status;
      // Filter by department and ownership/collaboration for non-admin users
      let isRestrictedFaculty = false;
      if (req.user && req.user.user_type !== 'admin') {
        whereClause.department_code = req.user.department_code;
        if (!req.user.is_head_of_department && String(all_creators) !== 'true') {
          isRestrictedFaculty = true;
        }
      }
      const offset = (page - 1) * limit;
      // Use findAndCountAll for pagination meta
      let degrees = [];
      let count = 0;
      if (isRestrictedFaculty) {
        // Fetch created_by
        const createdDegrees = await Degree.findAll({
          where: { ...whereClause, created_by: req.user.id, ...(status ? { status } : {}) },
          include: [
            { model: Department, as: 'departmentByCode', attributes: ['id', 'name', 'code'] },
            { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: User, as: 'degreeCollaborators', attributes: ['id'], through: { attributes: [] }, required: false }
          ]
        });
        // Fetch collaborated
        const collaboratedDegrees = await Degree.findAll({
          where: { ...whereClause, ...(status ? { status } : {}) },
          include: [
            { model: Department, as: 'departmentByCode', attributes: ['id', 'name', 'code'] },
            { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: User, as: 'degreeCollaborators', attributes: ['id'], through: { attributes: [] }, required: true, where: { id: req.user.id } }
          ]
        });
        // Merge and deduplicate by id
        const allDegrees = [...createdDegrees, ...collaboratedDegrees];
        const seen = new Set();
        degrees = allDegrees.filter(d => {
          if (seen.has(d.id)) return false;
          seen.add(d.id);
          return true;
        });
        count = degrees.length;
        // Paginate in JS
        degrees = degrees.sort((a, b) => b.createdAt - a.createdAt).slice(offset, offset + parseInt(limit));
      } else {
        // HOD/admin/office: normal query
        const result = await Degree.findAndCountAll({
          where: whereClause,
          include: [
            { model: Department, as: 'departmentByCode', attributes: ['id', 'name', 'code'] },
            { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: User, as: 'degreeCollaborators', attributes: ['id'], through: { attributes: [] }, required: false }
          ],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [['created_at', 'DESC']]
        });
        degrees = result.rows;
        count = result.count;
      }
      // For each degree, check if a pending child version exists
      const degreesWithPendingFlag = await Promise.all(
        degrees.map(async (degree) => {
          // Check if there's a child version that's not active/archived
          const pendingVersion = await Degree.findOne({
            where: {
              parent_degree_id: degree.id,
              status: { [Op.notIn]: ['active', 'archived'] },
            },
          });
          degree.dataValues.hasNewPendingVersion = !!pendingVersion;
          return degree;
        })
      );
      // Remap departmentByCode -> department
      const degreesRemapped = degreesWithPendingFlag.map((degree) => {
        const obj = { ...degree.dataValues };
        if (obj.departmentByCode) {
          obj.department = obj.departmentByCode;
          delete obj.departmentByCode;
        }
        // Add all rich text fields explicitly for frontend
        obj.specializations = degree.specializations;
        obj.career_prospects = degree.career_prospects;
        obj.admission_requirements = degree.admission_requirements;
        obj.accreditation = degree.accreditation;
        obj.fees = degree.fees;
        obj.entry_requirements = degree.entry_requirements;
        obj.learning_outcomes = degree.learning_outcomes;
        obj.assessment_methods = degree.assessment_methods;
        obj.contact_information = degree.contact_information;
        obj.application_deadlines = degree.application_deadlines;
        obj.application_process = degree.application_process;

        // Rename degreeCollaborators to collaborators in response
        if (obj.degreeCollaborators && Array.isArray(obj.degreeCollaborators)) {
          obj.collaborators = obj.degreeCollaborators.map(u => ({ id: u.id }));
        } else {
          obj.collaborators = [];
        }
        // Add is_collaborating flag (true if user is a collaborator but not creator)
        if (req.user && obj.collaborators && Array.isArray(obj.collaborators)) {
          const isCollaborator = obj.collaborators.some(u => u.id === req.user.id);
          obj.is_collaborating = isCollaborator && obj.created_by !== req.user.id;
        } else {
          obj.is_collaborating = false;
        }
        // Add creator object for frontend (like course API)
        obj.creator = degree.creator ? {
          id: degree.creator.id,
          first_name: degree.creator.first_name,
          last_name: degree.creator.last_name,
          email: degree.creator.email,
        } : null;
        delete obj.degreeCollaborators;
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
      handleCaughtError(res, error, 'Failed to fetch degrees');
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
      const { Degree, Department } = await models.getMany('Degree', 'Department');
      // Destructure all possible fields from req.body
      const {
        name,
        code,
        description,
        duration_years,
        department_code,
        courses_per_semester,
        accreditation,
        admission_requirements,
        application_deadlines,
        application_process,
        assessment_methods,
        career_prospects,
        contact_information,
        degree_type,
        entry_requirements,
        fees,
        learning_outcomes,
        location,
        specializations,
        study_mode,
        total_credits,
        prerequisites,
        study_details,
        faculty_details,
        requirements,
        elective_options,
        enrollment_config,
        graduation_requirements,
        academic_calendar
      } = req.body;

      // Verify department exists and user belongs to it
      const department = await Department.findOne({ where: { code: department_code } });
      if (!department) {
        return res.status(400).json({ error: 'Department not found' });
      }
      // Always use authenticated user context
      const user = req.user;
      if (!user || !user.id) {
        return res.status(400).json({ error: 'User context required' });
      }
      if (user.department_code !== department_code) {
        return res.status(403).json({ error: 'Can only create degrees in your own department' });
      }
      // Check for duplicate degree code
      const existingDegree = await Degree.findOne({ where: { code: code.trim().toUpperCase() } });
      if (existingDegree) {
        return res.status(409).json({ error: 'Degree code already exists' });
      }
      // Create degree with all fields and set created_by
      const degree = await Degree.create({
        name: name?.trim(),
        code: code?.trim().toUpperCase(),
        description: description?.trim() || null,
        duration_years,
        department_code,
        status: 'draft',
        courses_per_semester: courses_per_semester,
        accreditation,
        admission_requirements,
        application_deadlines,
        application_process,
        assessment_methods,
        career_prospects,
        contact_information,
        degree_type,
        entry_requirements,
        fees,
        learning_outcomes,
        location,
        specializations,
        study_mode,
        total_credits,
        prerequisites,
        study_details,
        faculty_details,
        requirements,
        elective_options,
        enrollment_config,
        graduation_requirements,
        academic_calendar,
        created_by: user.id
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
      handleCaughtError(res, error, 'Failed to create degree');
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
            { model: Department, as: 'departmentByCode' },
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
            { model: Department, as: 'departmentByCode', attributes: ['id', 'name', 'code'] },
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
      // Add all rich text fields explicitly for frontend
      if (degree) {
        degree.dataValues.specializations = degree.specializations;
        degree.dataValues.career_prospects = degree.career_prospects;
        degree.dataValues.admission_requirements = degree.admission_requirements;
        degree.dataValues.accreditation = degree.accreditation;
        degree.dataValues.fees = degree.fees;
        degree.dataValues.entry_requirements = degree.entry_requirements;
        degree.dataValues.learning_outcomes = degree.learning_outcomes;
        degree.dataValues.assessment_methods = degree.assessment_methods;
        degree.dataValues.contact_information = degree.contact_information;
        degree.dataValues.application_deadlines = degree.application_deadlines;
        degree.dataValues.application_process = degree.application_process;
      }
      res.json({ degree });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to fetch degree');
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
  captureOriginalData('Degree', 'id'),
  auditMiddleware('update', 'degree', 'Degree updated'),
  async (req, res) => {
    try {
      const { Degree, Department, User } = await models.getMany('Degree', 'Department', 'User');

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
      let isCollaborator = false;
      if (!isAdmin && !isCreator && !isHod && !isDepartmentFaculty) {
        // Check if user is a collaborator
        if (typeof degree.getCollaborators === 'function') {
          const collaborators = await degree.getCollaborators();
          isCollaborator = collaborators.some(u => u.id === user.id);
        } else if (degree.collaborators && Array.isArray(degree.collaborators)) {
          isCollaborator = degree.collaborators.some(u => u.id === user.id);
        }
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied: you do not have permission to update this degree' });
        }
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
        // Add all rich text fields
        'specializations',
        'career_prospects',
        'admission_requirements',
        'accreditation',
        'fees',
        'entry_requirements',
        'learning_outcomes',
        'assessment_methods',
        'contact_information',
        'application_deadlines',
        'application_process',
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

      }

      // Always set updated_by to current user
      updates.updated_by = user.id;
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
      handleCaughtError(res, error, 'Failed to update degree');
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
      const { Degree, Message, User } = await models.getMany('Degree', 'Message', 'User');

      const degree = await Degree.findByPk(req.params.id);
      if (!degree) return res.status(404).json({ error: 'Degree not found' });

      const user = req.user;
      if (!user || !user.id) return res.status(400).json({ error: 'User context required' });

      const isAdmin = user.user_type === 'admin';
      const isCreator = degree.created_by === user.id;
      const isDeptFaculty = user.user_type === 'faculty' && user.department_code === degree.department_code;
      let isCollaborator = false;
      if (!isAdmin && !isCreator && !isDeptFaculty) {
        // Check if user is a collaborator
        if (typeof degree.getCollaborators === 'function') {
          const collaborators = await degree.getCollaborators();
          isCollaborator = collaborators.some(u => u.id === user.id);
        } else if (degree.collaborators && Array.isArray(degree.collaborators)) {
          isCollaborator = degree.collaborators.some(u => u.id === user.id);
        }
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied: cannot submit this degree for approval' });
        }
      }

      if (degree.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft degrees can be submitted' });
      }

      await degree.update({ status: 'pending_approval', updated_by: user.id, submitted_at: new Date() });

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
      const Department = await models.Department();
      const updated = await Degree.findByPk(degree.id, {
        include: [{ model: Department, as: 'departmentByCode' }],
      });

      res.json({ message: 'Degree submitted for approval', degree: updated });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to submit degree for approval');
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
    const { Degree, Message } = await models.getMany('Degree', 'Message');
    const { getSequelize } = require('../config/database');
    const sequelize = await getSequelize();
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

  await degree.update({ status: 'approved', approved_by: user.id, approved_at: new Date(), updated_by: user.id }, { transaction });

      await transaction.commit();

      const Department = await models.Department();
      const updated = await Degree.findByPk(degree.id, {
        include: [{ model: Department, as: 'departmentByCode' }],
      });

      res.json({ message: 'Degree approved', degree: updated });
    } catch (error) {
      if (transaction) await transaction.rollback();
      handleCaughtError(res, error, 'Failed to approve degree');
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
  captureOriginalData('Degree', 'id'),
  auditMiddleware('delete', 'degree', 'Degree deleted'),
  async (req, res) => {
    try {
      const { Degree, User, Course } = await models.getMany('Degree', 'User', 'Course');

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

      // Check if there's another active version of this degree code
      const activeDegree = await Degree.findOne({
        where: {
          code: degree.code,
          status: 'active',
          id: { [Op.ne]: degree.id }
        }
      });

      // Can't delete degrees with students unless another active version exists
      const studentCount = await User.count({ 
        where: { degree_code: degree.code, user_type: 'student' } 
      });
      if (studentCount > 0 && !activeDegree) {
        return res.status(400).json({ error: 'Cannot delete degree with enrolled students unless another active version exists' });
      }

      // Check if there are associated courses
      const associatedCourses = await Course.findAll({ 
        where: { degree_code: degree.code } 
      });

      if (associatedCourses.length > 0) {
        // Check if all associated courses have active versions (other than this degree)
        const coursesWithoutActiveVersions = [];
        for (const course of associatedCourses) {
          const activeCourse = await Course.findOne({
            where: {
              code: course.code,
              status: 'active',
              degree_code: degree.code,
            },
          });
          if (!activeCourse) {
            coursesWithoutActiveVersions.push(course.name);
          }
        }

        // If any course doesn't have an active version, don't allow deletion
        if (coursesWithoutActiveVersions.length > 0) {
          return res.status(400).json({ 
            error: `Cannot delete degree. The following courses don't have active versions: ${coursesWithoutActiveVersions.join(', ')}` 
          });
        }

        // All checks passed - delete all associated courses first
        for (const course of associatedCourses) {
          await course.destroy();
        }
      }

      await degree.destroy();
      res.json({ message: 'Degree deleted successfully' });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to delete degree');
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
      const { Degree, Department, User, Course } = await models.getMany('Degree', 'Department', 'User', 'Course');
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


      // Only degree creator, department faculty, admin, or collaborator can publish
      let isCollaborator = false;
      if (degree.created_by !== user.id && user.user_type !== 'admin' && user.department_code !== degree.department_code) {
        // Check if user is a collaborator
        if (typeof degree.getCollaborators === 'function') {
          const collaborators = await degree.getCollaborators();
          isCollaborator = collaborators.some(u => u.id === user.id);
        } else if (degree.collaborators && Array.isArray(degree.collaborators)) {
          isCollaborator = degree.collaborators.some(u => u.id === user.id);
        }
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Only degree creator, department faculty, admin, or collaborator can publish degrees' });
        }
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
      handleCaughtError(res, error, 'Failed to publish degree');
    }
  }
);

module.exports = router;
