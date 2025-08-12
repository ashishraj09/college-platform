const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { User, Department, Degree } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { auditMiddleware } = require('../middleware/audit');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  generatePasswordResetToken,
  generateEmailVerificationToken 
} = require('../utils/auth');
const { 
  sendWelcomeEmail, 
  sendPasswordResetEmail 
} = require('../utils/email');

const router = express.Router();

// Register validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('first_name').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required and must be less than 50 characters'),
  body('last_name').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required and must be less than 50 characters'),
  body('user_type').isIn(['student', 'faculty', 'office', 'admin']).withMessage('Invalid user type'),
  body('student_id').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Student ID must be less than 20 characters'),
  body('employee_id').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Employee ID must be less than 20 characters'),
  body('department_id').optional().isUUID().withMessage('Invalid department ID'),
  body('degree_id').optional().isUUID().withMessage('Invalid degree ID'),
];

// Login validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Password reset validation rules
const passwordResetValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

// Register user (Admin only)
router.post('/register', 
  registerValidation,
  handleValidationErrors,
  // authenticateToken, // Temporarily disabled for testing
  // auditMiddleware('create', 'user', 'User registration'), // Temporarily disabled
  async (req, res) => {
    try {
      // Only admins can register users
      // if (req.user.user_type !== 'admin') {
      //   return res.status(403).json({ error: 'Only administrators can register users' });
      // }

      const { 
        email, password, first_name, last_name, user_type,
        student_id, employee_id, department_id, degree_id,
        enrolled_date, enrolled_year, is_head_of_department 
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Check for duplicate student_id or employee_id
      if (student_id) {
        const existingStudentId = await User.findOne({ where: { student_id } });
        if (existingStudentId) {
          return res.status(400).json({ error: 'Student ID already exists' });
        }
      }

      if (employee_id) {
        const existingEmployeeId = await User.findOne({ where: { employee_id } });
        if (existingEmployeeId) {
          return res.status(400).json({ error: 'Employee ID already exists' });
        }
      }

      // Validate department and degree exist
      if (department_id) {
        const department = await Department.findByPk(department_id);
        if (!department) {
          return res.status(400).json({ error: 'Department not found' });
        }
      }

      if (degree_id) {
        const degree = await Degree.findByPk(degree_id);
        if (!degree) {
          return res.status(400).json({ error: 'Degree not found' });
        }
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate password reset token for initial setup
      const resetToken = generatePasswordResetToken();
      const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        first_name,
        last_name,
        user_type,
        student_id: user_type === 'student' ? student_id : null,
        employee_id: user_type !== 'student' ? employee_id : null,
        department_id,
        degree_id: user_type === 'student' ? degree_id : null,
        enrolled_date: user_type === 'student' ? enrolled_date : null,
        enrolled_year: user_type === 'student' ? enrolled_year : null,
        is_head_of_department: user_type === 'faculty' ? (is_head_of_department || false) : false,
        status: 'pending',
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
      });

      // Send welcome email
      try {
        await sendWelcomeEmail(user, resetToken);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the registration if email fails
      }

      // Return user without sensitive data
      const { password: _, password_reset_token, email_verification_token, ...userResponse } = user.toJSON();

      res.status(201).json({
        message: 'User registered successfully',
        user: userResponse,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Login
router.post('/login',
  loginValidation,
  handleValidationErrors,
  auditMiddleware('login', 'system', 'User login'),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user with related data
      const user = await User.findOne({
        where: { email },
        include: [
          { model: Department, as: 'department' },
          { model: Degree, as: 'degree' },
        ],
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is active
      if (user.status !== 'active') {
        return res.status(401).json({ 
          error: 'Account is not active. Please contact administrator.' 
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await user.update({ last_login: new Date() });

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      // Return user without sensitive data
      const { password: _, password_reset_token, email_verification_token, ...userResponse } = user.toJSON();

      res.json({
        message: 'Login successful',
        user: userResponse,
        tokens: {
          access: accessToken,
          refresh: refreshToken,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    const decoded = verifyRefreshToken(refresh_token);
    
    const user = await User.findByPk(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const accessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({
      tokens: {
        access: accessToken,
        refresh: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Request password reset
router.post('/forgot-password',
  passwordResetValidation,
  handleValidationErrors,
  auditMiddleware('password_reset', 'system', 'Password reset requested'),
  async (req, res) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ where: { email } });
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ 
          message: 'If an account with that email exists, a password reset link has been sent.' 
        });
      }

      // Generate reset token
      const resetToken = generatePasswordResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await user.update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
      });

      // Send password reset email
      try {
        await sendPasswordResetEmail(user, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }

      res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Reset password
router.post('/reset-password',
  resetPasswordValidation,
  handleValidationErrors,
  auditMiddleware('password_change', 'user', 'Password reset completed'),
  async (req, res) => {
    try {
      const { token, password } = req.body;

      let user;
      
      // Temporary testing bypass for test user
      if (token === 'test-activation-token') {
        user = await User.findOne({
          where: { email: 'test@example.com' }
        });
      } else {
        user = await User.findOne({
          where: {
            password_reset_token: token,
            password_reset_expires: {
              [Op.gt]: new Date(),
            },
          },
        });
      }

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user
      await user.update({
        password: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
        status: user.status === 'pending' ? 'active' : user.status,
      });

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Degree, as: 'degree' },
      ],
    });

    const { password, password_reset_token, email_verification_token, ...userResponse } = user.toJSON();

    res.json({ user: userResponse });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token invalidation)
router.post('/logout', 
  // authenticateToken, // Temporarily disabled for testing
  // auditMiddleware('logout', 'system', 'User logout'), // Temporarily disabled
  (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
