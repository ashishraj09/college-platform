const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const { Degree, Department, User, Course } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { auditMiddleware, captureOriginalData } = require('../middleware/audit');

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
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
  try {
    const {
      department_id,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const whereClause = {};
    if (department_id) whereClause.department_id = department_id;
    if (status) whereClause.status = status;

    const offset = (page - 1) * limit;

    const degrees = await Degree.findAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json(degrees);
  } catch (error) {
    console.error('Error fetching degrees:', error);
    res.status(500).json({ error: 'Failed to fetch degrees' });
  }
});

// Get faculty's department degrees (for department overview)
router.get('/my-degrees', 
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
  try {
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
    } else {
      // If no user context and no departmentId query param, return empty array
      whereClause.department_id = 'none-found';
    }
    
    const degrees = await Degree.findAll({
      where: whereClause,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Group by status for better dashboard display
    const degreesByStatus = {
      draft: degrees.filter(degree => degree.status === 'draft'),
      submitted: degrees.filter(degree => degree.status === 'submitted'),
      approved: degrees.filter(degree => degree.status === 'approved'),
      active: degrees.filter(degree => degree.status === 'active'),
      others: degrees.filter(degree => !['draft', 'submitted', 'approved', 'active'].includes(degree.status))
    };

    res.json({
      all: degrees,
      byStatus: degreesByStatus,
      departmentInfo: degrees.length > 0 ? {
        id: degrees[0].department.id,
        name: degrees[0].department.name,
        code: degrees[0].department.code
      } : null,
      summary: {
        total: degrees.length,
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
  // authenticateToken, // Temporarily disabled for testing
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

      // Create degree
      const degree = await Degree.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        duration_years,
        department_id,
        status: 'draft', // Default status
      });

      // Fetch degree with associations
      const createdDegree = await Degree.findByPk(degree.id, {
        include: [
          { model: Department, as: 'department' },
        ],
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
          details: error.errors.map(e => ({ field: e.path, message: e.message })),
        });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get degree by ID
router.get('/:id',
  async (req, res) => {
    try {
      const degree = await Degree.findByPk(req.params.id, {
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

      res.json({ degree });
    } catch (error) {
      console.error('Error fetching degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get degrees by department
router.get('/department/:departmentId',
  // authenticateToken, // Temporarily disabled for testing
  async (req, res) => {
    try {
      const { departmentId } = req.params;
      
      // For development/testing when authentication is disabled
      // Use the departmentId from the request parameters as fallback
      const user = req.user || { 
        id: 'temp-user-id',
        department_id: departmentId,
        user_type: 'faculty'
      };

      // Security check: Users can only access degrees from their own department
      // unless they are admin or office staff
      if (user.user_type !== 'admin' && user.user_type !== 'office' && user.department_id !== departmentId) {
        return res.status(403).json({ 
          error: 'Access denied. You can only access degrees from your own department.' 
        });
      }

      const degrees = await Degree.findAll({
        where: { department_id: departmentId },
        include: [
          { model: Department, as: 'department' },
        ],
        order: [['name', 'ASC']],
      });

      res.json({ degrees });
    } catch (error) {
      console.error('Error fetching degrees by department:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update degree (Faculty only - same department)
router.put('/:id',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('faculty', 'admin'), // Temporarily disabled for testing
  degreeValidation,
  handleValidationErrors,
  captureOriginalData(Degree, 'id'),
  auditMiddleware('update', 'degree', 'Degree updated'),
  async (req, res) => {
    try {
      const degree = await Degree.findByPk(req.params.id);

      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }

      // Faculty can only update degrees in their department (temporarily bypassed for testing)
      const user = req.user || { department_id: degree.department_id, user_type: 'faculty' }; // Temp for testing
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
      const allowedFields = ['name', 'code', 'description', 'duration_years'];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updatedFields[field] = req.body[field];
        }
      });

      if (updatedFields.code) {
        updatedFields.code = updatedFields.code.toUpperCase();
      }

      await degree.update(updatedFields);

      const updatedDegree = await Degree.findByPk(degree.id, {
        include: [
          { model: Department, as: 'department' },
        ],
      });

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
  }
);

// Submit degree for approval (Faculty only)
router.patch('/:id/submit',
  // authenticateToken, // Temporarily disabled for testing
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
  }
);

// Approve degree (HOD only)
router.patch('/:id/approve',
  // authenticateToken, // Temporarily disabled for testing
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
  }
);

// Delete degree (Faculty - same department, Admin)
router.delete('/:id',
  // authenticateToken, // Temporarily disabled for testing
  // authorizeRoles('faculty', 'admin'), // Temporarily disabled for testing
  captureOriginalData(Degree, 'id'),
  auditMiddleware('delete', 'degree', 'Degree deleted'),
  async (req, res) => {
    try {
      const degree = await Degree.findByPk(req.params.id);

      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }

      // Faculty can only delete degrees from their department
      const user = req.user || { department_id: degree.department_id, user_type: 'faculty' }; // Temp for testing
      if (user.department_id !== degree.department_id && user.user_type !== 'admin') {
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

module.exports = router;
