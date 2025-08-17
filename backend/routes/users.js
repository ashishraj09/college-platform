const express = require('express');
const { body, query } = require('express-validator');
const { User, Department, Degree } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { auditMiddleware, captureOriginalData } = require('../middleware/audit');

const router = express.Router();

// Get all users (temporarily public for testing)
router.get('/',
  authenticateToken,
  authorizeRoles('admin', 'office'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('user_type').optional().isIn(['student', 'faculty', 'office', 'admin']).withMessage('Invalid user type'),
    query('department_id').optional().isUUID().withMessage('Invalid department ID'),
    query('status').optional().isIn(['active', 'inactive', 'pending', 'suspended']).withMessage('Invalid status'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const where = {};
      if (req.query.user_type) where.user_type = req.query.user_type;
      if (req.query.department_id) where.department_id = req.query.department_id;
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

      const { count, rows: users } = await User.findAndCountAll({
        where,
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name', 'code']
          }
        ],
        attributes: [
          'id',
          'first_name',
          'last_name',
          'email',
          'user_type',
          'status',
          'department_id',
          'employee_id',
          'student_id',
          'is_head_of_department',
          'last_login',
          'created_at'
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      res.json({
        users,
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get user by ID
router.get('/:id',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('admin', 'office'),
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id, {
        include: [
          { model: Department, as: 'department' },
          { model: Degree, as: 'degree' },
        ],
        attributes: { exclude: ['password', 'password_reset_token', 'email_verification_token'] },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Non-admin users can only view users from their department
      if (req.user && req.user.user_type !== 'admin' && req.user.user_type !== 'office') {
        if (user.department_id !== req.user.department_id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update user
router.put('/:id',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('admin', 'office'),
  captureOriginalData(User, 'id'),
  [
    body('first_name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be less than 50 characters'),
    body('last_name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be less than 50 characters'),
    body('user_type').optional().isIn(['student', 'faculty', 'office', 'admin']).withMessage('Invalid user type'),
    body('status').optional().isIn(['active', 'inactive', 'pending', 'suspended']).withMessage('Invalid status'),
    body('department_id').optional().isUUID().withMessage('Invalid department ID'),
    body('degree_id').optional().isUUID().withMessage('Invalid degree ID'),
    body('is_head_of_department').optional().isBoolean().withMessage('is_head_of_department must be boolean'),
  ],
  handleValidationErrors,
  auditMiddleware('update', 'user', 'User profile updated'),
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate department and degree exist if provided
      if (req.body.department_id) {
        const department = await Department.findByPk(req.body.department_id);
        if (!department) {
          return res.status(400).json({ error: 'Department not found' });
        }
      }

      if (req.body.degree_id) {
        const degree = await Degree.findByPk(req.body.degree_id);
        if (!degree) {
          return res.status(400).json({ error: 'Degree not found' });
        }
      }

      // Update user
      await user.update(req.body);

      // Reload with associations
      await user.reload({
        include: [
          { model: Department, as: 'department' },
          { model: Degree, as: 'degree' },
        ],
      });

      const { password, password_reset_token, email_verification_token, ...userResponse } = user.toJSON();

      res.json({
        message: 'User updated successfully',
        user: userResponse,
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete user
router.delete('/:id',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('admin'),
  captureOriginalData(User, 'id'),
  auditMiddleware('delete', 'user', 'User deleted'),
  async (req, res) => {
    try {
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
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get users by department (for HOD and faculty)
router.get('/department/:departmentId',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('faculty', 'admin', 'office'),
  async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { user_type, status } = req.query;

      // Faculty can only view their own department (only if authenticated)
      if (req.user && req.user.user_type === 'faculty' && req.user.department_id !== departmentId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Build where clause
      const whereClause = { department_id: departmentId };
      if (user_type) whereClause.user_type = user_type;
      if (status) whereClause.status = status;

      const users = await User.findAll({
        where: whereClause,
        include: [
          { model: Department, as: 'department' },
          { model: Degree, as: 'degree' },
        ],
        attributes: { exclude: ['password', 'password_reset_token', 'email_verification_token'] },
        order: [['user_type'], ['last_name'], ['first_name']],
      });

      res.json({ users });
    } catch (error) {
      console.error('Get department users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Admin reset user password
router.post('/:id/reset-password',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;

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
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
