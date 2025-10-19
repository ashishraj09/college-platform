import React, { useEffect, useState } from 'react';
import { Container, Typography, Card, CardContent, CardActions, Button, Box, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import { degreesAPI, coursesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Degree {
  id: string;
  name: string;
  code: string;
  description?: string;
  duration_years: number;
  status?: string;
  createdAt?: string;
  activatedAt?: string;
  lastUpdatedAt?: string;
  department?: { name: string; code: string };
  courses?: Course[];
}

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
}

const DegreesPage: React.FC = () => {
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDegrees = async () => {
      try {
        // Use public API - no authentication required, only active degrees
        const data = await degreesAPI.getPublicDegrees();
        const degreesArray = data?.degrees || [];
        setDegrees(degreesArray);
      } catch (error) {
        console.error('Error fetching degrees:', error);
        setDegrees([]);
      }
    };
    fetchDegrees();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Degree Programmes
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Explore all available degree programmes and their associated courses.
        </Typography>
      </Box>
      {degrees.map(degree => (
        <Card key={degree.id} sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <SchoolIcon color="primary" />
              <Typography variant="h5">{degree.name}</Typography>
              <Chip label={degree.code} variant="outlined" />
              {degree.status && <Chip label={degree.status} color="info" />}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {degree.description}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Duration: {degree.duration_years} years
            </Typography>
            {degree.department && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                Department: {degree.department.name}
              </Typography>
            )}
            {/* Faculty-only fields */}
            {user?.user_type === 'faculty' && (
              <Box sx={{ mt: 2, mb: 2, display: 'flex', gap: 2 }}>
                <Chip label={`Created: ${degree.createdAt || '-'}`} />
                <Chip label={`Activated: ${degree.activatedAt || '-'}`} />
                <Chip label={`Last Updated: ${degree.lastUpdatedAt || '-'}`} />
                <Chip label={`Status: ${degree.status || '-'}`} />
              </Box>
            )}
            {/* Courses Table */}
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Course Name</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>Credits</TableCell>
                    <TableCell>Semester</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {degree.courses?.map(course => (
                    <TableRow key={course.id}>
                      <TableCell>{course.name}</TableCell>
                      <TableCell>{course.code}</TableCell>
                      <TableCell>{course.credits}</TableCell>
                      <TableCell>{course.semester}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
          <CardActions>
            <Button variant="outlined">View Details</Button>
          </CardActions>
        </Card>
      ))}
    </Container>
  );
};

export default DegreesPage;
