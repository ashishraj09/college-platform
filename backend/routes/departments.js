const express = require('express');
const router = express.Router();
const { Department } = require('../models');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

// Get all departments (now requires authentication)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']],
    });
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch departments',
      message: error.message 
    });
  }
});

// Get department by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ 
      error: 'Failed to fetch department',
      message: error.message 
    });
  }
});

// Create new department (now requires authentication)
router.post('/', authenticateToken, authorizeRoles('admin'), auditMiddleware('create', 'department'), async (req, res) => {
  try {
    const { name, code, description } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Name and code are required' 
      });
    }

    // Create department
    const department = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || null,
    });

    res.status(201).json(department);
  } catch (error) {
    console.error('Error creating department:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;
      return res.status(409).json({ 
        error: 'Department already exists',
        message: `A department with this ${field} already exists` 
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({ 
      error: 'Failed to create department',
      message: error.message 
    });
  }
});

// Update department
router.put('/:id', authenticateToken, authorizeRoles('admin'), auditMiddleware('update', 'department'), async (req, res) => {
  try {
    const { name, code, description, status } = req.body;
    
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Update department
    await department.update({
      name: name?.trim() || department.name,
      code: code?.trim().toUpperCase() || department.code,
      description: description?.trim() || department.description,
      status: status || department.status,
    });

    res.json(department);
  } catch (error) {
    console.error('Error updating department:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;
      return res.status(409).json({ 
        error: 'Department already exists',
        message: `A department with this ${field} already exists` 
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        message: error.errors.map(e => e.message).join(', ')
      });
    }

    res.status(500).json({ 
      error: 'Failed to update department',
      message: error.message 
    });
  }
});

// Delete department
router.delete('/:id', authenticateToken, authorizeRoles('admin'), auditMiddleware('delete', 'department'), async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    await department.destroy();
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({ 
        error: 'Cannot delete department',
        message: 'This department is referenced by other records and cannot be deleted' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to delete department',
      message: error.message 
    });
  }
});

module.exports = router;
