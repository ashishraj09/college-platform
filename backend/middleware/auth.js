const jwt = require('jsonwebtoken');
const { User, initializeAssociations } = require('../models');

const authenticateToken = async (req, res, next) => {
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
      // Make sure associations are initialized before querying with includes
      if (process.env.NODE_ENV === 'production') {
        const { initializeAssociations } = require('../models/associations');
        await initializeAssociations();
      }
      
      const user = await User.findByPk(decoded.userId, {
        include: [
          { model: require('../models').Department, as: 'department' },
          { model: require('../models').Degree, as: 'degree' },
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
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 60 * 60 * 1000 // 60 minutes
      });
      next();
    } catch (error) {
      console.error('Authentication error (database):', error.message);
      return res.status(500).json({
        error: 'Internal server error during authentication',
        message: process.env.NODE_ENV === 'production' ? undefined : error.message
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
  authenticateToken,
  authorizeRoles,
  authorizeHOD,
  authorizeDepartmentAccess,
  authorizeResourceOwner,
};
