import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';

const StudentDashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Student Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Welcome to your student dashboard
      </Typography>

      <Box 
        display="grid" 
        gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }}
        gap={3} 
        sx={{ mt: 2 }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              My Courses
            </Typography>
            <Typography variant="body2" color="textSecondary">
              No courses enrolled yet
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Enrollments
            </Typography>
            <Typography variant="body2" color="textSecondary">
              No pending enrollments
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default StudentDashboard;
