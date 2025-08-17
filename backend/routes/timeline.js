const express = require('express');
const router = express.Router();
const { AuditLog, Message, User } = require('../models');

// GET /api/timeline/:entityType/:entityId
router.get('/:entityType/:entityId', async (req, res) => {
  const { entityType, entityId } = req.params;
  try {
    // Fetch audit logs
    const auditLogs = await AuditLog.findAll({
      where: { entity_type: entityType, entity_id: entityId },
      order: [['created_at', 'ASC']]
    });
    // Fetch messages
    const messages = await Message.findAll({
      where: { type: entityType, reference_id: entityId },
      order: [['created_at', 'ASC']]
    });

    // Collect all user IDs from audit and messages
    const auditUserIds = auditLogs.map(log => log.user_id).filter(Boolean);
    const messageUserIds = messages.map(msg => msg.sender_id).filter(Boolean);
    const allUserIds = Array.from(new Set([...auditUserIds, ...messageUserIds]));

    // Fetch user details
    const users = await User.findAll({
      where: { id: allUserIds },
      attributes: ['id', 'first_name', 'last_name']
    });
    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = { id: u.id, name: `${u.first_name} ${u.last_name}` };
    });

    // Map audit logs
    const audit = auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      user: log.user_id ? userMap[log.user_id] || { id: log.user_id } : null,
      timestamp: log.createdAt,
      description: log.description
    }));
    // Map messages
    const messagesArr = messages.map(msg => ({
      id: msg.id,
      message: msg.message,
      user: msg.sender_id ? userMap[msg.sender_id] || { id: msg.sender_id } : null,
      timestamp: msg.createdAt
    }));
    res.json({ audit, messages: messagesArr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

module.exports = router;
