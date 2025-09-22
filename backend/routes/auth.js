const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
// Remove direct model imports, use getModel utility
const getModel = require('../utils/getModel');
const { Op } = require('sequelize');
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
const { authenticateToken } = require('../middleware/auth');


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
  const User = await getModel('User');
  const Department = await getModel('Department');
  const Degree = await getModel('Degree');

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
      const User = await getModel('User');
      const Department = await getModel('Department');
      const Degree = await getModel('Degree');

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

      // Return user without sensitive data
      const { password: _, password_reset_token, email_verification_token, ...userResponse } = user.toJSON();

      // Set JWT as HTTP-only cookie, expires in 60 minutes
      res.cookie('token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 60 * 60 * 1000 // 60 minutes
      });
      res.json({
        message: 'Login successful',
        user: userResponse
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);


// Request password reset
router.post('/forgot-password',
  passwordResetValidation,
  handleValidationErrors,
  auditMiddleware('password_reset', 'system', 'Password reset requested'),
  async (req, res) => {
    try {
      const { email } = req.body;

  const User = await getModel('User');
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
  // Clear the auth cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? true : false,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  res.json({ message: 'Logged out successfully' });
});

// Temporary test endpoint to create demo users
router.post('/create-demo-users', async (req, res) => {
  try {
    // Create department first
    let department = await Department.findOne({ where: { code: 'CS' } });
    if (!department) {
      department = await Department.create({
        name: 'Computer Science',
        code: 'CS',
        description: 'Computer Science Department',
        status: 'active'
      });
    }

    // Create degree
    let degree = await Degree.findOne({ where: { code: 'BSC-CS' } });
    if (!degree) {
      degree = await Degree.create({
        name: 'Bachelor of Science in Computer Science',
        code: 'BSC-CS',
        description: 'Computer Science degree program',
        duration_years: 4,
        department_id: department.id,
        status: 'active',
        courses_per_semester: JSON.stringify({
          "1": 5, "2": 5, "3": 5, "4": 5,
          "5": 4, "6": 4, "7": 4, "8": 4
        })
      });
    }

    // Create HOD user
    const hodEmail = 'hod@example.com';
    let hodUser = await User.findOne({ where: { email: hodEmail } });
    if (!hodUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      hodUser = await User.create({
        first_name: 'John',
        last_name: 'Doe',
        email: hodEmail,
        password: hashedPassword,
        user_type: 'faculty',
        employee_id: 'HOD001',
        status: 'active',
        email_verified: true,
        department_id: department.id,
        degree_id: degree.id,
        is_head_of_department: true
      });
    }

    // Create student user
    const studentEmail = 'student@example.com';
    let studentUser = await User.findOne({ where: { email: studentEmail } });
    if (!studentUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      studentUser = await User.create({
        first_name: 'Jane',
        last_name: 'Smith',
        email: studentEmail,
        password: hashedPassword,
        user_type: 'student',
        student_id: 'STU001',
        status: 'active',
        email_verified: true,
        department_id: department.id,
        degree_id: degree.id,
        enrolled_date: new Date(),
        enrolled_year: 2023,
        current_semester: 3
      });
    }

    // Create some courses
    const courseData = [
      {
        name: 'Data Structures and Algorithms',
        code: 'CS301',
        overview: 'Fundamental data structures and algorithms',
        credits: 3,
        semester: 3,
        is_elective: false
      },
      {
        name: 'Database Systems',
        code: 'CS302',
        overview: 'Introduction to database management systems',
        credits: 3,
        semester: 3,
        is_elective: false
      },
      {
        name: 'Web Development',
        code: 'CS303',
        overview: 'Modern web development techniques',
        credits: 3,
        semester: 3,
        is_elective: true
      }
    ];

    for (const courseInfo of courseData) {
      let course = await Course.findOne({ where: { code: courseInfo.code } });
      if (!course) {
        course = await Course.create({
          ...courseInfo,
          department_id: department.id,
          degree_id: degree.id,
          created_by: hodUser.id,
          status: 'active',
          study_details: JSON.stringify({
            learning_objectives: ['Learn fundamental concepts'],
            topics: ['Basic topics'],
            assessment_methods: ['Exams', 'Assignments']
          }),
          faculty_details: JSON.stringify({
            primary_instructor: 'Dr. John Doe',
            co_instructors: [],
            guest_lecturers: [],
            lab_instructors: []
          })
        });
      }
    }

    res.json({ 
      message: 'Demo users created successfully',
      users: {
        hod: { email: 'hod@example.com', password: 'password123' },
        student: { email: 'student@example.com', password: 'password123' }
      }
    });
  } catch (error) {
    console.error('Error creating demo users:', error);
    res.status(500).json({ error: 'Failed to create demo users', details: error.message });
  }
});

// Get current authenticated user's profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
  const User = await getModel('User');
  const Department = await getModel('Department');
  const Degree = await getModel('Degree');
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Degree,
          as: 'degree',
          attributes: ['id', 'name', 'code'],
        }
      ]
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
