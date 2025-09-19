const express = require('express');
const { body, query } = require('express-validator');
const { Degree, Department, User, Course } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { auditMiddleware, captureOriginalData } = require('../middleware/audit');

const router = express.Router();
// Add a comment to degree (conversation timeline)
router.post('/:id/comment',
  authenticateToken,
  auditMiddleware('update', 'degree', 'Degree comment added'),
  async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || text.trim().length < 2) return res.status(400).json({ error: 'Comment text required' });
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
      const degree = await Degree.findByPk(req.params.id);
      if (!degree) return res.status(404).json({ error: 'Degree not found' });
      const user = req.user || { id: req.body.userId, department_id: req.body.departmentId, user_type: 'faculty' };
      if (!user.id || !user.department_id) return res.status(400).json({ error: 'User context required' });
      if (degree.created_by && degree.created_by !== user.id) return res.status(403).json({ error: 'Only creator can submit for approval' });
      if (user.user_type !== 'admin' && user.department_id !== degree.department_id) return res.status(403).json({ error: 'Can only submit degrees in your own department' });
      if (degree.status !== 'draft') return res.status(400).json({ error: 'Only draft degrees can be submitted' });
      await degree.update({ status: 'pending_approval', updated_by: user.id });

      // Add message to messages table
      const Message = require('../models/Message');
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
  auditMiddleware('update', 'degree', 'Degree approved'),
  async (req, res) => {
    try {
      const degree = await Degree.findByPk(req.params.id);
      if (!degree) return res.status(404).json({ error: 'Degree not found' });
      const user = req.user || { department_id: degree.department_id, is_head_of_department: true };
      if (user.department_id !== degree.department_id || !user.is_head_of_department) return res.status(403).json({ error: 'Only Head of Department can approve degrees' });
      if (degree.status !== 'pending_approval') return res.status(400).json({ error: 'Only pending approval degrees can be approved', currentStatus: degree.status });
      await degree.update({ status: 'approved', approved_by: user.id || req.body.userId, updated_by: user.id || req.body.userId });
      res.json({ message: 'Degree approved', degree });
    } catch (error) {
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
      const degree = await Degree.findByPk(req.params.id);
      if (!degree) return res.status(404).json({ error: 'Degree not found' });
      const user = req.user || { department_id: degree.department_id, is_head_of_department: true };
      if (user.department_id !== degree.department_id || !user.is_head_of_department) return res.status(403).json({ error: 'Only Head of Department can reject degrees' });
      if (degree.status !== 'pending_approval') return res.status(400).json({ error: 'Only pending approval degrees can be rejected' });
      await degree.update({ status: 'draft', feedback: reason, updated_by: user.id || req.body.userId });

      // Add rejection message to messages table
      const Message = require('../models/Message');
      await Message.create({
        type: 'degree',
        reference_id: degree.id,
        sender_id: user.id || req.body.userId,
        message: `Degree rejected: ${reason}`,
      });

      res.json({ message: 'Degree rejected', degree });
    } catch (error) {
      console.error('Error rejecting degree:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Publish/Activate degree (Faculty only - for approved degrees)
router.patch('/:id/publish',
  auditMiddleware('update', 'degree', 'Degree published/activated'),
  async (req, res) => {
    try {
      const degree = await Degree.findByPk(req.params.id);
      if (!degree) return res.status(404).json({ error: 'Degree not found' });
      if (degree.status !== 'approved') return res.status(400).json({ error: 'Only approved degrees can be published' });
      await degree.update({ status: 'active' });
      res.json({ message: 'Degree published/activated', degree });
    } catch (error) {
      console.error('Error publishing degree:', error);
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
      const maxVersionDegree = await Degree.findOne({
        where: {
          [Op.or]: [
            { id: req.params.id },
            { parent_degree_id: req.params.id },
            { id: degree.parent_degree_id },
            { parent_degree_id: degree.parent_degree_id },
          ],
        },
        order: [['version', 'DESC']],
      });

      // Create a new version with proper parent reference
      const newDegreeData = {
        name: degree.name,
        code: degree.code,
        description: degree.description,
        department_id: degree.department_id,
        courses: degree.courses,
        requirements: degree.requirements,
        created_by: req.user.id,
        version: nextVersion,
        parent_degree_id: degree.parent_degree_id || degree.id,
        is_latest_version: true,
        status: 'draft',
      };
      
      console.log(`[DEBUG] Creating new degree version with data:`, {
        name: newDegreeData.name,
        code: newDegreeData.code,
        version: newDegreeData.version,
        parent_degree_id: newDegreeData.parent_degree_id,
        created_by: newDegreeData.created_by
      });

      // Mark all previous versions as not latest
      await Degree.update(
        { is_latest_version: false },
        {
          where: {
            [Op.or]: [
              { id: req.params.id },
              { parent_degree_id: req.params.id },
              { id: degree.parent_degree_id },
              { parent_degree_id: degree.parent_degree_id },
            ],
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

      res.status(201).json({
        message: `Degree version ${nextVersion} created successfully`,
        degree: createdDegree,
        version: nextVersion
      });
    } catch (error) {
      console.error('Error creating degree version:', error);
      res.status(500).json({ error: 'Failed to create degree version', details: error.message });
    }
  });
);

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
    const {
      department_id,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const whereClause = {};
    if (department_id) whereClause.department_id = department_id;
    if (status) whereClause.status = status;
    
    // Filter degrees by owner (created_by) for non-admin users
    if (req.user && req.user.user_type !== 'admin') {
      whereClause.created_by = req.user.id;
    }

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
  authenticateToken,
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
      
      // Regular faculty see only their own degrees
      if (user.user_type !== 'admin' && !user.is_head_of_department && user.user_type !== 'office') {
        whereClause.created_by = user.id;
      }
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
        enrollment_start_dates: req.body.enrollment_start_dates || {},
        enrollment_end_dates: req.body.enrollment_end_dates || {},
      });

      // Fetch degree with associations
      const createdDegree = await Degree.findByPk(degree.id, {
        include: [
          { model: Department, as: 'department' },
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

// Get degree by ID
router.get('/:id',
  authenticateToken,
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
      
      // Only allow access if user is admin or degree creator
      if (req.user && req.user.user_type !== 'admin' && degree.created_by !== req.user.id) {
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
        'enrollment_start_dates',
        'enrollment_end_dates',
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
          { model: Department, as: 'department' },
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
      
      // Only degree creator or admin can delete
      if (degree.created_by !== user.id && user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Only degree creator or admin can delete this degree' });
      }
      
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
  });

module.exports = router;
