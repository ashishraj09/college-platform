import React from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button
} from '@mui/material';
import { 
  School as SchoolIcon, 
  Assignment as AssignmentIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';

const IndexPage: React.FC = () => {
  const router = useRouter();

  const dashboardTiles = [
    {
      title: 'Faculty Course Approval',
      description: 'Review and approve course creation and modification requests from faculty members',
      icon: <SchoolIcon sx={{ fontSize: 48, color: '#1976d2' }} />,
      route: '/hod/faculty-approval',
      buttonText: 'Manage Course Approvals'
    },
    {
      title: 'Student Enrollment Approval',
      description: 'Review and approve student course enrollment requests for the current semester',
      icon: <AssignmentIcon sx={{ fontSize: 48, color: '#2e7d32' }} />,
      route: '/hod/enrollment-approval',
      buttonText: 'Manage Enrollments'
    },
    {
      title: 'Department Management',
      description: 'Create and update department information, courses, and academic programs',
      icon: <SettingsIcon sx={{ fontSize: 48, color: '#ed6c02' }} />,
      route: '/hod/department-management',
      buttonText: 'Manage Department'
    }
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          HOD Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          Welcome to the Head of Department dashboard. Manage approvals and department settings.
        </Typography>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: 3 
        }}>
          {dashboardTiles.map((tile, index) => (
            <Card 
              key={index}
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <CardContent sx={{ flex: 1, textAlign: 'center', py: 4 }}>
                <Box sx={{ mb: 3 }}>
                  {tile.icon}
                </Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {tile.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tile.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => router.push(tile.route)}
                  sx={{ 
                    minWidth: 200,
                    borderRadius: 2
                  }}
                >
                  {tile.buttonText}
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default IndexPage;
