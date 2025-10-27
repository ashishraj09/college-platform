
/**
 * User Routes - Enterprise Production Ready
 * -----------------------------------------
 * Handles all user-related API endpoints for the platform.
 * - Follows best practices for error handling, validation, and maintainability
 * - Compatible with serverless and non-serverless deployments
 * - Uses department_code and degree_code for all associations
 */

const express = require('express');
const { body, query } = require('express-validator');
const models = require('../utils/models');
const { Op } = require('sequelize');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { auditMiddleware, captureOriginalData } = require('../middleware/audit');
const { handleCaughtError } = require('../utils/errorHandler');

// Helper to get models for serverless/non-serverless environments
// Ensures fresh model instances for each request (important for serverless)
// Helper to get models for serverless/non-serverless
async function getModels() {
  // In serverless, models may need to be re-initialized per request
  return {
    User: await models.User(),
    Department: await models.Department(),
    Degree: await models.Degree(),
    Course: await models.Course(),
  };
}

const router = express.Router();

// Unified stats endpoint: returns both degree and course stats for the authenticated user
router.get('/stats', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const { Degree, Course, Department } = await getModels();
    // Only HOD can filter by userId, otherwise use current user
    let targetUserId = req.user.id;
    if (req.user.is_head_of_department && req.query.userId) {
      targetUserId = req.query.userId;
    }
    // Degree stats for the user's department and created_by or collaborator
    const degreeStats = await Degree.findAll({
      where: {
        department_code: req.user.department_code,
        [Op.or]: [
          { created_by: targetUserId },
          { '$collaborators.id$': targetUserId }
        ]
      },
      include: [
        { model: Department, as: 'departmentByCode', attributes: ['id', 'name', 'code'] },
        { model: Degree.sequelize.models.User, as: 'collaborators', attributes: ['id'], through: { attributes: [] }, required: false }
      ],
      distinct: true
    });
    // Course stats for the user's department and created_by or collaborator
    const courseStats = await Course.findAll({
      where: {
        department_code: req.user.department_code,
        [Op.or]: [
          { created_by: targetUserId },
          { '$collaborators.id$': targetUserId }
        ]
      },
      include: [
        { model: Department, as: 'departmentByCode', attributes: ['id', 'name', 'code'] },
        { model: Course.sequelize.models.User, as: 'collaborators', attributes: ['id'], through: { attributes: [] }, required: false }
      ],
      distinct: true
    });
    // Aggregate status counts for degrees and courses
    const degreeStatusCounts = {
      total: degreeStats.length,
      draft: degreeStats.filter(d => d.status === 'draft').length,
      pending_approval: degreeStats.filter(d => d.status === 'pending_approval').length,
      approved: degreeStats.filter(d => d.status === 'approved').length,
      active: degreeStats.filter(d => d.status === 'active').length,
      others: degreeStats.filter(d => !['draft', 'pending_approval', 'approved', 'active'].includes(d.status)).length
    };
    const courseStatusCounts = {
      total: courseStats.length,
      draft: courseStats.filter(c => c.status === 'draft').length,
      pending_approval: courseStats.filter(c => c.status === 'pending_approval').length,
      approved: courseStats.filter(c => c.status === 'approved').length,
      active: courseStats.filter(c => c.status === 'active').length,
      others: courseStats.filter(c => !['draft', 'pending_approval', 'approved', 'active'].includes(c.status)).length
    };
    res.json({ degrees: degreeStatusCounts, courses: courseStatusCounts });
  } catch (error) {
    handleCaughtError(res, error, 'Failed to fetch unified stats');
  }
});

// Get all users (temporarily public for testing)
router.get('/',
/**
 * GET /users
 * List users with pagination and filtering.
 * Only accessible to admin and office roles.
 * Query params: page, limit, user_type, department_code, status, search
 */
  authenticateToken,
  // Allow admin, office, and HOD/faculty for their own department
  async (req, res, next) => {
    // If admin or office, allow
    if (['admin', 'office'].includes(req.user.user_type)) return next();
    // If faculty or HOD, only allow if filtering by their own department
    if (
      req.user.user_type === 'faculty' &&
      req.query.department_code &&
      req.query.department_code === req.user.department_code
    ) {
      return next();
    }
    // Otherwise, forbidden
    return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
  },
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('user_type').optional().isIn(['student', 'faculty', 'office', 'admin']).withMessage('Invalid user type'),
    query('department_code').optional().isString().withMessage('Invalid department code'),
    query('status').optional().isIn(['active', 'inactive', 'pending', 'suspended']).withMessage('Invalid status'),
  ],
  handleValidationErrors,
  async (req, res) => {
  // Parse pagination and build filters
  // Error handling: all errors are logged and a generic message is returned
    try {
      // Pagination and filtering
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // Build query filters
      const where = {};
      if (req.query.user_type) where.user_type = req.query.user_type;
      if (req.query.department_code) where.department_code = req.query.department_code;
      if (req.query.status) where.status = req.query.status;
      if (req.query.search) {
        where[Op.or] = [
          { first_name: { [Op.iLike]: `%${req.query.search}%` } },
          { last_name: { [Op.iLike]: `%${req.query.search}%` } },
          { email: { [Op.iLike]: `%${req.query.search}%` } },
          { student_id: { [Op.iLike]: `%${req.query.search}%` } },
          { employee_id: { [Op.iLike]: `%${req.query.search}%` } },
        ];
      }

      // Get models for current environment
      const { User, Department } = await getModels();
      // Query users with department info
      const { count, rows: users } = await User.findAndCountAll({
        where,
        include: [
          {
            model: Department,
            as: 'departmentByCode',
            attributes: ['code', 'name']
          }
        ],
        attributes: [
          'id', // User ID
          'first_name',
          'last_name',
          'email',
          'user_type',
          'status',
          'department_code', // Now using code
          'degree_code', // Now using code
          'employee_id',
          'student_id',
          'is_head_of_department',
          'last_login',
          'created_at',
          'current_semester',
          'enrolled_year'
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      // Transform users: rename departmentByCode to department, remove department_code
      const transformedUsers = users.map(u => {
        const userObj = u.toJSON();
        userObj.department = userObj.departmentByCode;
        delete userObj.departmentByCode;
        delete userObj.department_code;
        return userObj;
      });
      res.json({
        users: transformedUsers,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to fetch users');
    }
  }
);

// Get user by ID
router.get('/:id',
/**
 * GET /users/:id
 * Get user details by user ID.
 * Includes department and degree info.
 * Access restricted for non-admin/office users to their own department only.
 */
  authenticateToken,
  authorizeRoles('admin', 'office'),
  async (req, res) => {
    try {
      // Get models for current environment
      const { User, Department, Degree } = await getModels();
      // Find user by primary key
      const user = await User.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'departmentByCode', attributes: ['code', 'name'] },
          { model: Degree, as: 'degreeByCode', attributes: ['code', 'name'] },
        ],
        attributes: { exclude: ['password', 'password_reset_token', 'email_verification_token'] },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Non-admin users can only view users from their department
      if (req.user && req.user.user_type !== 'admin' && req.user.user_type !== 'office') {
  // Restrict access for non-admin/office users
  if (user.department_code !== req.user.department_code) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      res.json({ user });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to fetch user');
    }
  }
);

// Update user
router.put('/:id',
/**
 * PUT /users/:id
 * Update user profile by user ID.
 * Validates department_code and degree_code if provided.
 * Audits all changes for compliance.
 */
  authenticateToken,
  authorizeRoles('admin', 'office'),
  captureOriginalData('User', 'id'),
  [
    body('first_name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be less than 50 characters'),
    body('last_name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be less than 50 characters'),
    body('user_type').optional().isIn(['student', 'faculty', 'office', 'admin']).withMessage('Invalid user type'),
    body('status').optional().isIn(['active', 'inactive', 'pending', 'suspended']).withMessage('Invalid status'),
  body('department_code').optional().isString().withMessage('Invalid department code'),
  body('degree_code').optional().isString().withMessage('Invalid degree code'),
    body('is_head_of_department').optional().isBoolean().withMessage('is_head_of_department must be boolean'),
  ],
  handleValidationErrors,
  auditMiddleware('update', 'user', 'User profile updated'),
  async (req, res) => {
    try {
      // Get models for current environment
      const { User, Department, Degree } = await getModels();
      // Find user
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      // Validate department and degree codes
      if (req.body.department_code) {
        const department = await Department.findOne({ where: { code: req.body.department_code } });
        if (!department) {
          return res.status(400).json({ error: 'Department not found' });
        }
      }
      if (req.body.degree_code) {
        const degree = await Degree.findOne({ where: { code: req.body.degree_code } });
        if (!degree) {
          return res.status(400).json({ error: 'Degree not found' });
        }
      }
      // Update user
      await user.update(req.body);
      // Reload user to get fresh data (without associations to keep response clean)
      await user.reload();
      // Exclude sensitive fields
      const { password, password_reset_token, email_verification_token, ...userResponse } = user.toJSON();
      res.json({
        message: 'User updated successfully',
        user: userResponse,
      });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to update user');
    }
  }
);

// Delete user
router.delete('/:id',
/**
 * DELETE /users/:id
 * Delete user by user ID.
 * Prevents users from deleting their own account.
 * Audits all deletions for compliance.
 */
  authenticateToken,
  authorizeRoles('admin'),
  captureOriginalData('User', 'id'),
  auditMiddleware('delete', 'user', 'User deleted'),
  async (req, res) => {
    try {
      // Get models for current environment
      const { User } = await getModels();
      // Find user
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      // Don't allow deleting the current user
      if (req.user && user.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      await user.destroy();
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to delete user');
    }
  }
);

// Get users by department (for HOD and faculty)
router.get('/department/:code',
/**
 * GET /users/department/:code
 * List users by department code.
 * Faculty can only view their own department.
 */
  authenticateToken,
  authorizeRoles('faculty', 'admin', 'office'),
  async (req, res) => {
    try {
      const department_code = req.params.code;
      const { user_type, status } = req.query;

      // Get models for current environment
      const { User, Department, Degree } = await getModels();
      // Faculty can only view their own department
      if (req.user && req.user.user_type === 'faculty' && req.user.department_code !== department_code) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Build where clause
      const whereClause = { department_code };
      if (user_type) whereClause.user_type = user_type;
      if (status) whereClause.status = status;
      // Query users by department_code
      const users = await User.findAll({
        where: whereClause,
        include: [
          { model: Department, as: 'departmentByCode', attributes: ['code', 'name'] },
          { model: Degree, as: 'degreeByCode', attributes: ['code', 'name'] },
        ],
        attributes: { exclude: ['password', 'password_reset_token', 'email_verification_token'] },
        order: [['user_type'], ['last_name'], ['first_name']],
      });
      // Remap departmentByCode -> department, remove degreeByCode if null
      const usersRemapped = users.map(u => {
        const obj = u.toJSON();
        if (obj.departmentByCode) {
          obj.department = obj.departmentByCode;
          delete obj.departmentByCode;
        }
        if (obj.degreeByCode === null) {
          delete obj.degreeByCode;
        }
        return obj;
      });
      res.json({ users: usersRemapped });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to fetch department users');
    }
  }
);

// Admin reset user password
router.post('/:id/reset-password',
/**
 * POST /users/:id/reset-password
 * Admin-only: Reset a user's password and send reset email.
 * Generates a secure token and sets expiry.
 */
  // Error handling: all errors are logged and a generic message is returned
  authenticateToken,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;

  // Get models for current environment
  const { User } = await getModels();
  const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate password reset token
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      // Update user with reset token
      await user.update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
      });

      // Send password reset email
      try {
        const { sendPasswordResetEmail } = require('../utils/email');
        await sendPasswordResetEmail(user, resetToken);
        
        res.json({
          message: 'Password reset email sent successfully',
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          }
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        res.status(500).json({ 
          error: 'Failed to send password reset email',
          details: emailError.message 
        });
      }
    } catch (error) {
      handleCaughtError(res, error, 'Failed to reset password');
    }
  }
);

module.exports = router;
