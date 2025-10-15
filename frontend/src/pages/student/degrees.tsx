import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
} from '@mui/material';
import UniversityCoursesTab from '../../components/student/UniversityCoursesTab';

const DegreesPage: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          University Degrees & Courses
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Explore all available degrees and courses offered by the university
        </Typography>
      </Box>

      <Paper sx={{ width: '100%', p: 3 }}>
        <UniversityCoursesTab />
      </Paper>
    </Container>
  );
};

export default DegreesPage;
