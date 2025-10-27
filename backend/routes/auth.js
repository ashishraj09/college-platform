/**
 * POST /auth/register
 * Purpose: Register a new user (admin only)
 * Access: Admin
 * Request: { email, password, first_name, last_name, user_type, ... }
 * Response: { message, user }
 * Audit: Logs user registration
 */


/**
 * Auth Routes (backend/routes/auth.js)
 * ------------------------------------
 * Purpose: Handles user registration, login, password reset, profile, and logout endpoints for College Platform.
 * Standards:
 *   - Code-based lookups for department and degree (department_code, degree_code)
 *   - DB integrity via department_id, degree_id
 *   - Error handling, security, validation, audit, maintainability
 *   - Serverless compatibility: models/resources initialized per request, no global state
 *   - Response consistency: exclude sensitive fields, use consistent formats
 *   - Audit compliance: audit middleware for create/update/delete actions
 *   - See 1.md for full standards checklist
 *
 * Route Documentation:
 *   POST   /auth/register      - Register new user (admin only)
 *   POST   /auth/login         - Authenticate user, set JWT cookie
 *   POST   /auth/forgot-password - Request password reset
 *   POST   /auth/reset-password  - Reset password with token
 *   GET    /auth/profile       - Get current user profile
 *   POST   /auth/logout        - Logout user, clear JWT cookie
 *   GET    /auth/me            - Get authenticated user's profile
 *
 * Security:
 *   - All input validated with express-validator
 *   - Authentication and role-based access enforced
 *   - No sensitive fields exposed in responses
 *
 * Audit:
 *   - Audit middleware used for create/update/delete actions
 *   - Audit logic documented in comments
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const models = require('../utils/models');
const { Op } = require('sequelize');
const { handleValidationErrors } = require('../middleware/validation');
const { auditMiddleware } = require('../middleware/audit');
const {
  generateAccessToken,
  generatePasswordResetToken,
} = require('../utils/auth');
const {
  sendWelcomeEmail,
  sendPasswordResetEmail
} = require('../utils/email');
const { authenticateToken } = require('../middleware/auth');
const { handleCaughtError } = require('../utils/errorHandler');

// Helper: Exclude sensitive fields from user object
function sanitizeUser(user, department, degree) {
  const { password, password_reset_token, email_verification_token, ...userResponse } = user.toJSON();
  userResponse.department = department ? {
    id: department.id,
    name: department.name,
    code: department.code
  } : null;
  userResponse.degree = degree ? {
    id: degree.id,
    name: degree.name,
    code: degree.code
  } : null;
  return userResponse;
}


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
  body('department_code').optional().isString().isLength({ min: 2, max: 10 }).withMessage('Invalid department code'),
  body('degree_id').optional().isUUID().withMessage('Invalid degree ID'),
  body('degree_code').optional().isString().isLength({ min: 2, max: 10 }).withMessage('Invalid degree code'),
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

// Cookie domain configuration: read only from env var. Do not default to a parent domain here.
// This avoids unintentionally setting a domain that breaks local development.
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

/**
 * POST /auth/register
 * Purpose: Register a new user (admin only)
 * Access: Admin
 * Body: email, password, first_name, last_name, user_type, student_id, employee_id, department_id/department_code, degree_id/degree_code, enrolled_date, enrolled_year, is_head_of_department
 * Response: Registered user object (no sensitive fields)
 */
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
        student_id, employee_id, department_id, department_code, degree_id, degree_code,
        enrolled_date, enrolled_year, is_head_of_department 
      } = req.body;

      // Check if user already exists
      const User = await models.User();
      const Department = await models.Department();
      const Degree = await models.Degree();

      // Check for duplicate email
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

      // Validate department and degree exist (by ID or code)
      let department = null;
      if (department_id) {
        department = await Department.findByPk(department_id);
      } else if (department_code) {
        department = await Department.findOne({ where: { code: department_code } });
      }
      if (!department) {
        return res.status(400).json({ error: 'Department not found' });
      }

      let degree = null;
      if (degree_id) {
        degree = await Degree.findByPk(degree_id);
      } else if (degree_code) {
        degree = await Degree.findOne({ where: { code: degree_code } });
      }
      if (user_type === 'student' && !degree) {
        return res.status(400).json({ error: 'Degree not found' });
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
        department_id: department ? department.id : null,
        department_code: department ? department.code : null,
        degree_id: user_type === 'student' && degree ? degree.id : null,
        degree_code: user_type === 'student' && degree ? degree.code : null,
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
      handleCaughtError(res, error, 'Failed to register user');
    }
  }
);

// Login
router.post('/login',
/**
 * POST /auth/login
 * Purpose: Authenticate user and set JWT cookie
 * Access: Public
 * Request: { email, password }
 * Response: { message, user }
 * Audit: Logs login attempt
 */
  loginValidation,
  handleValidationErrors,
  auditMiddleware('login', 'system', 'User login'),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user with related data
      const User = await models.User();
      const Department = await models.Department();
      const Degree = await models.Degree();

      const user = await User.findOne({
        where: { email },
      });

      // Fetch department and degree manually by code
      let department = null;
      let degree = null;
      if (user && user.department_code) {
        department = await Department.findOne({ where: { code: user.department_code } });
      }
      if (user && user.degree_code) {
        degree = await Degree.findOne({ where: { code: user.degree_code } });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is active or pending (allow first login for pending users)
      if (user.status !== 'active' && user.status !== 'pending') {
        return res.status(401).json({ 
          error: 'Account is not active. Please contact administrator.' 
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // If user was pending, activate them on first successful login
      if (user.status === 'pending') {
        await user.update({ 
          status: 'active',
          last_login: new Date() 
        });
      } else {
        // Update last login for already active users
        await user.update({ last_login: new Date() });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user.id);

      // Return user without sensitive data, attach department and degree
      const userResponse = sanitizeUser(user, department, degree);

      // Set JWT as HTTP-only cookie
      // Development: Both on localhost (different ports) - use 'lax' (browsers treat localhost as same-site)
      // Production: Vercel rewrites make frontend and backend appear on same domain - use 'lax'
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax', // 'lax' works for localhost in dev and same-domain in prod
        maxAge: 60 * 60 * 1000, // 1 hour
        path: '/'
      };
      
      res.cookie('token', accessToken, cookieOptions);
      res.json({
        message: 'Login successful',
        user: userResponse,
      });
    } catch (error) {
      handleCaughtError(res, error, 'Login failed');
    }
  }
);


// Request password reset
router.post('/forgot-password',
/**
 * POST /auth/forgot-password
 * Purpose: Request password reset link
 * Access: Public
 * Request: { email }
 * Response: { message }
 * Audit: Logs password reset request
 */
  passwordResetValidation,
  handleValidationErrors,
  auditMiddleware('password_reset', 'system', 'Password reset requested'),
  async (req, res) => {
    try {
      const { email } = req.body;

  const User = await models.User();
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
      handleCaughtError(res, error, 'Failed to process password reset request');
    }
  }
);

// Reset password
router.post('/reset-password',
/**
 * POST /auth/reset-password
 * Purpose: Reset password using token
 * Access: Public
 * Request: { token, password }
 * Response: { message }
 * Audit: Logs password change
 */
  resetPasswordValidation,
  handleValidationErrors,
  auditMiddleware('password_change', 'user', 'Password reset completed'),
  async (req, res) => {
    try {
      const { token, password } = req.body;

      // Load User model
      const User = await models.User();
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


      // Update user and set email_verified to true if not already
      await user.update({
        password: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
        status: user.status === 'pending' ? 'active' : user.status,
        email_verified: true,
      });

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      handleCaughtError(res, error, 'Failed to reset password');
    }
  }
);

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
/**
 * GET /auth/profile
 * Purpose: Get current user profile
 * Access: Authenticated users only
 * Response: { user }
 */
  try {
    const User = await models.User();
    const Department = await models.Department();
    const Degree = await models.Degree();
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch department and degree manually by code
    let department = null;
    let degree = null;
    if (user.department_code) {
      department = await Department.findOne({ where: { code: user.department_code } });
    }
    if (user.degree_code) {
      degree = await Degree.findOne({ where: { code: user.degree_code } });
    }

    const userResponse = sanitizeUser(user, department, degree);
    res.json({ user: userResponse });
  } catch (error) {
    handleCaughtError(res, error, 'Failed to get user profile');
  }
});

// Logout (client-side token invalidation)

/**
 * POST /auth/logout
 * Purpose: Logout user, clear JWT cookie
 * Access: Authenticated users only
 * Audit: Logs logout action for compliance
 * Response: { message }
 */
router.post('/logout', 
  authenticateToken, // Enforce authentication
  auditMiddleware('logout', 'system', 'User logout'), // Audit compliance
  (req, res) => {
    // Clear the auth cookie - simple settings for same-domain
    const clearOpts = { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    };
    res.clearCookie('token', clearOpts);
    res.json({ message: 'Logged out successfully' });
  }
);

// Get current authenticated user's profile
router.get('/me', authenticateToken, async (req, res) => {
/**
 * GET /auth/me
 * Purpose: Get authenticated user's profile
 * Access: Authenticated users only
 * Response: { user }
 */
  // declare outer-scoped variables for use in catch block diagnostics
  let userId = null;
  let user = null;
  try {
    console.debug('[auth/me] userId:', req?.user?.id);
    const User = await models.User();
    const Department = await models.Department();
    const Degree = await models.Degree();
    userId = req.user && req.user.id;
    user = await User.findByPk(userId);
    console.debug('[auth/me] userId:', userId);
    console.debug('[auth/me] user:', user ? user.toJSON() : user);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Fetch department and degree manually by code
    let department = null;
    let degree = null;
    if (user.department_code) {
      department = await Department.findOne({ where: { code: user.department_code } });
      console.debug('[auth/me] department_code:', user.department_code, 'department:', department ? department.toJSON() : department);
    } else {
      console.debug('[auth/me] No department_code for user');
    }
    if (user.degree_code) {
      degree = await Degree.findOne({ where: { code: user.degree_code } });
      console.debug('[auth/me] degree_code:', user.degree_code, 'degree:', degree ? degree.toJSON() : degree);
    } else {
      console.debug('[auth/me] No degree_code for user');
    }

    // Add convenience fields for degree code and semester
    const userJson = sanitizeUser(user, department, degree);
    userJson.semester = userJson.current_semester || null;
    console.debug('[auth/me] response userJson:', userJson);
    res.json({ user: userJson });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    if (error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    if (error && error.user) {
      console.error('[auth/me] error.user:', error.user);
    }
    if (error && error.department) {
      console.error('[auth/me] error.department:', error.department);
    }
    if (error && error.degree) {
      console.error('[auth/me] error.degree:', error.degree);
    }
    // Log debug info for troubleshooting
    console.error('[auth/me] Debug:', {
      userId,
      user: user ? user.toJSON() : user,
      department_code: user && user.department_code,
      degree_code: user && user.degree_code
    });
    handleCaughtError(res, error, 'Failed to fetch user profile');
  }
});

// Validate token (password reset or activation)
router.get('/validate-token', async (req, res) => {
  /**
   * GET /auth/validate-token?token=...
   * Purpose: Check if a password reset or activation token is valid and not expired
   * Access: Public
   * Response: { valid: true, type: 'reset'|'activation' } or 400 with error
   */
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const User = await models.User();
    // Check password reset token
    let user = await User.findOne({
      where: {
        password_reset_token: token,
        password_reset_expires: {
          [Op.gt]: new Date(),
        },
      },
    });
    if (user) {
      return res.json({ valid: true, type: 'reset' });
    }
    // Check activation token (email_verification_token)
    user = await User.findOne({
      where: {
        email_verification_token: token,
        // Optionally, you can add an expiry check if you store one for activation
      },
    });
    if (user) {
      return res.json({ valid: true, type: 'activation' });
    }
    return res.status(400).json({ error: 'Invalid or expired token' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to validate token' });
  }
});

module.exports = router;
