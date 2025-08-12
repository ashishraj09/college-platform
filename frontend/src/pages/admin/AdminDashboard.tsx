import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { People, School, Class, Assignment } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import CreateUserDialog from '../../components/admin/CreateUserDialog';
import CreateDepartmentDialog from '../../components/admin/CreateDepartmentDialog';

const AdminDashboard: React.FC = () => {
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createDepartmentOpen, setCreateDepartmentOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const stats = [
    {
      title: 'Total Users',
      count: 0,
      icon: <People sx={{ fontSize: 40 }} />,
      color: '#1976d2'
    },
    {
      title: 'Departments',
      count: 0,
      icon: <School sx={{ fontSize: 40 }} />,
      color: '#388e3c'
    },
    {
      title: 'Courses',
      count: 0,
      icon: <Class sx={{ fontSize: 40 }} />,
      color: '#f57c00'
    },
    {
      title: 'Pending Approvals',
      count: 0,
      icon: <Assignment sx={{ fontSize: 40 }} />,
      color: '#d32f2f'
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Welcome to the College Platform administration dashboard
      </Typography>

      <Box 
        display="grid" 
        gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }}
        gap={3} 
        sx={{ mt: 2 }}
      >
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" color="textSecondary">
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" color={stat.color}>
                    {stat.count}
                  </Typography>
                </Box>
                <Box sx={{ color: stat.color }}>
                  {stat.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box 
        display="grid" 
        gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }}
        gap={3} 
        sx={{ mt: 3 }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="textSecondary">
              No recent activity to display
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                sx={{ mr: 1, mb: 1 }}
                onClick={() => setCreateUserOpen(true)}
              >
                Create User
              </Button>
              <Button 
                variant="outlined" 
                sx={{ mr: 1, mb: 1 }}
                onClick={() => setCreateDepartmentOpen(true)}
              >
                Add Department
              </Button>
              <Button variant="outlined" sx={{ mr: 1, mb: 1 }}>
                Add Course
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <CreateUserDialog
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onSuccess={() => {
          setCreateUserOpen(false);
          enqueueSnackbar('User created successfully!', { variant: 'success' });
        }}
      />

      <CreateDepartmentDialog
        open={createDepartmentOpen}
        onClose={() => setCreateDepartmentOpen(false)}
        onSuccess={() => {
          setCreateDepartmentOpen(false);
          enqueueSnackbar('Department created successfully!', { variant: 'success' });
        }}
      />
    </Box>
  );
};

export default AdminDashboard;
