
/**
 * Authentication & Authorization Middleware
 * ----------------------------------------
 * Provides JWT authentication and role-based access control for API routes.
 * - authenticateToken: verifies JWT and attaches user to request
 * - authorizeRoles: restricts access by user_type
 * - authorizeHOD: restricts access to Head of Department
 * - authorizeDepartmentAccess: restricts access to department resources
 * - authorizeResourceOwner: restricts access to resource owner or admin/office
 * - Enterprise-grade error handling and maintainability
 */

const jwt = require('jsonwebtoken');
const getModel = require('../utils/getModel');

const authenticateToken = async (req, res, next) => {
  // Authenticates user by JWT token in cookie only
  // Dev mode bypass: if header X-Dev-Bypass-Auth is true, skip auth
  if (process.env.NODE_ENV === 'development' && req.headers['x-dev-bypass-auth'] === 'true') {
    return next();
  }
  
  try {
    // Read JWT from HTTP-only cookie
    const token = req.cookies && req.cookies.token;

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token is required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    try {
      // Get models using getModel utility for proper initialization
      const User = await getModel('User');
      const Department = await getModel('Department');
      const Degree = await getModel('Degree');
      
      const user = await User.findByPk(decoded.userId, {
        include: [
          { model: Department, as: 'departmentByCode' },
          { model: Degree, as: 'degreeByCode' },
        ],
      });
      
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found' 
        });
      }

      if (user.status !== 'active') {
        return res.status(401).json({ 
          error: 'Account is not active' 
        });
      }

      req.user = user;
      // Rolling session: reset cookie expiration on every authenticated request
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
        maxAge: 60 * 60 * 1000 // 60 minutes
      });
      next();
    } catch (error) {
      console.error('Authentication error (database):', error.message);
      console.error('Full error object:', error);
      if (error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      return res.status(500).json({
        error: 'Internal server error during authentication',
        message: process.env.NODE_ENV === 'production' ? undefined : error.message,
        stack: error.stack || null,
        debug: {
          userId: decoded && decoded.userId,
        }
      });
    }
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token has expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token' 
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

const authorizeRoles = (...roles) => {
  // Restricts access to specified user roles
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

const authorizeHOD = async (req, res, next) => {
  // Restricts access to Head of Department only
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  if (req.user.user_type !== 'faculty' || !req.user.is_head_of_department) {
    return res.status(403).json({ 
      error: 'Access denied. Head of Department privileges required.' 
    });
  }

  next();
};

const authorizeDepartmentAccess = (req, res, next) => {
  // Restricts access to department resources
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  // Admin can access everything
  if (req.user.user_type === 'admin') {
    return next();
  }

  // Office users can access everything
  if (req.user.user_type === 'office') {
    return next();
  }

  // For department-specific access
  const departmentId = req.params.departmentId || req.body.department_id;
  
  if (departmentId && req.user.department_id !== departmentId) {
    return res.status(403).json({ 
      error: 'Access denied. You can only access resources from your department.' 
    });
  }

  next();
};

const authorizeResourceOwner = (resourceUserIdField = 'created_by') => {
  // Restricts access to resource owner or admin/office
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    // Admin can access everything
    if (req.user.user_type === 'admin') {
      return next();
    }

    // Office users can access everything
    if (req.user.user_type === 'office') {
      return next();
    }

    // Check if user owns the resource
    if (req.resource && req.resource[resourceUserIdField] !== req.user.id) {
      // HODs can access resources from their department
      if (req.user.user_type === 'faculty' && req.user.is_head_of_department) {
        if (req.resource.department_id === req.user.department_id) {
          return next();
        }
      }
      
      return res.status(403).json({ 
        error: 'Access denied. You can only access your own resources.' 
      });
    }

    next();
  };
};

module.exports = {
  // Export authentication and authorization middleware
  authenticateToken,
  authorizeRoles,
  authorizeHOD,
  authorizeDepartmentAccess,
  authorizeResourceOwner,
};
