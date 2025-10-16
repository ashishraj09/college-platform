import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';

const OfficeDashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Office Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Welcome to the office dashboard
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
              Pending Enrollments
            </Typography>
            <Typography variant="body2" color="textSecondary">
              No pending enrollments
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Student Records
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Manage student records
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default OfficeDashboard;
