import React, { useEffect, useState } from 'react';
import { timelineAPI } from '../../services/api';
import { Typography, Box, Paper } from '@mui/material';

interface User {
  id: string;
  name: string;
}

interface Message {
  id: string;
  message: string;
  user?: User;
  timestamp: string;
}

interface Audit {
  id: string;
  action: string;
  user?: User;
  timestamp: string;
  description?: string;
}

interface FacultyTimelineProps {
  entityType: 'course' | 'degree';
  entityId: string;
  currentUser: User;
}

const FacultyTimeline: React.FC<FacultyTimelineProps> = ({ entityType, entityId, currentUser }) => {
  const [audit, setAudit] = useState<Audit[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    async function fetchTimeline() {
      const res = await timelineAPI.getTimeline(entityType, entityId);
      setAudit(res.audit || []);
      setMessages(res.messages || []);
    }
    fetchTimeline();
  }, [entityType, entityId]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Messages</Typography>
      {messages.map(msg => (
        <Paper key={msg.id} sx={{ p: 2, mb: 2 }}>
          <Typography>
            <strong>
              {msg.user?.name || 'Unknown Faculty'}
              {msg.user?.id === currentUser.id ? ' (current user)' : ''}
            </strong>
            : {msg.message}
          </Typography>
        </Paper>
      ))}

      <Typography variant="h6" gutterBottom>Audit Logs</Typography>
      {audit.map(log => (
        <Paper key={log.id} sx={{ p: 2, mb: 2 }}>
          <Typography>
            Audit → {log.action} on {entityType}
          </Typography>
          {log.description && (
            <Typography color="text.secondary">{log.description}</Typography>
          )}
        </Paper>
      ))}
    </Box>
  );
};

export default FacultyTimeline;
