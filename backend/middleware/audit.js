const { AuditLog } = require('../models');

const logAuditEvent = async (userId, action, entityType, entityId = null, oldValues = null, newValues = null, metadata = null, description = null, ip_address = null, user_agent = null) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      metadata,
      ip_address,
      user_agent,
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
      if (res.statusCode < 400 && req.user) {
        const userId = req.user.id;
        // Try to extract entityId from common places
        let entityId = null;
        if (data?.id) entityId = data.id;
        else if (data?.draft?.id) entityId = data.draft.id;
        else if (data?.enrollment?.id) entityId = data.enrollment.id;
        else if (data?.enrollments && Array.isArray(data.enrollments) && data.enrollments.length > 0 && data.enrollments[0].id) entityId = data.enrollments[0].id;
        else if (req.params?.id) entityId = req.params.id;

        const ip_address = req.ip;
        const user_agent = req.get('User-Agent');
        const metadata = {
          method: req.method,
          url: req.originalUrl,
          status_code: res.statusCode,
        };

        let oldValues = null;
        let newValues = null;

        // For create/update, include full data if available
        if (action === 'create' && data) {
          newValues = data;
        } else if (action === 'update') {
          const original = req.originalData || {};
          const updated = data?.draft || data?.enrollment || data || {};
          oldValues = {};
          newValues = {};
          Object.keys(updated).forEach(key => {
            if (original[key] !== undefined && original[key] !== updated[key]) {
              oldValues[key] = original[key];
              newValues[key] = updated[key];
            }
          });
          if (Object.keys(newValues).length === 0) {
            oldValues = null;
            newValues = null;
          }
        } else if (action === 'delete') {
          oldValues = req.originalData || null;
        }

        setImmediate(() => {
          logAuditEvent(
            userId,
            action,
            entityType,
            entityId,
            oldValues,
            newValues,
            metadata,
            description,
            ip_address,
            user_agent
          );
        });
      }
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
