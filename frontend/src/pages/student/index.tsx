import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import MyDegreeTab from '../../components/student/MyDegreeTab';

const StudentDashboard: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h4" gutterBottom>
          My Degree - Course Enrollment
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage your course enrollments for your current semester
        </Typography>
      </Box>

      <Paper sx={{ width: '100%', p: 3 }}>
        <MyDegreeTab />
      </Paper>
    </Container>
  );
};

export default StudentDashboard;
