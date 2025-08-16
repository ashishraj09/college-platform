import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip
} from '@mui/material';

const CourseApprovalsTab: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Course Approvals
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Typography color="text.secondary">
          Course approval functionality will be implemented here.
        </Typography>
        <Chip label="Coming Soon" color="primary" variant="outlined" sx={{ mt: 2 }} />
      </Paper>
    </Box>
  );
};

export default CourseApprovalsTab;
