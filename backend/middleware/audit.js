const { AuditLog } = require('../models');

const logAuditEvent = async (userId, action, entityType, entityId = null, oldValues = null, newValues = null, metadata = null, description = null) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      metadata,
      description,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};

const auditMiddleware = (action, entityType, description = null) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only log successful operations (status < 400)
      if (res.statusCode < 400 && req.user) {
        const userId = req.user.id;
        const entityId = data?.id || req.params?.id || null;
        const metadata = {
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          method: req.method,
          url: req.originalUrl,
          status_code: res.statusCode,
        };

        let oldValues = null;
        let newValues = null;

        // Capture data for different actions
        if (action === 'create' && data) {
          newValues = data;
        } else if (action === 'update') {
          oldValues = req.originalData || null;
          newValues = data;
        } else if (action === 'delete') {
          oldValues = req.originalData || null;
        }

        // Log the audit event asynchronously
        setImmediate(() => {
          logAuditEvent(
            userId,
            action,
            entityType,
            entityId,
            oldValues,
            newValues,
            metadata,
            description
          );
        });
      }

      // Call original res.json
      return originalJson.call(this, data);
    };

    next();
  };
};

const captureOriginalData = (model, idField = 'id') => {
  return async (req, res, next) => {
    try {
      const id = req.params[idField];
      if (id) {
        const originalData = await model.findByPk(id);
        if (originalData) {
          req.originalData = originalData.toJSON();
        }
      }
    } catch (error) {
      console.error('Failed to capture original data:', error);
    }
    next();
  };
};

module.exports = {
  logAuditEvent,
  auditMiddleware,
  captureOriginalData,
};
