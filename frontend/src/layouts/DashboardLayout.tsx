import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  CssBaseline,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard,
  School,
  People,
  Class,
  ExitToApp,
  AccountCircle,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 240;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, redirect to login
      navigate('/login');
    } finally {
      handleClose();
    }
  };

  const getMenuItems = () => {
    if (!user) return [];

    const getBasePath = () => {
      switch (user.user_type) {
        case 'admin': return '/admin';
        case 'faculty': return '/faculty';
        case 'office': return '/office';
        case 'student': return '/student';
        default: return '';
      }
    };

    const basePath = getBasePath();
    const commonItems = [
      { text: 'Dashboard', icon: <Dashboard />, path: basePath },
    ];

    switch (user.user_type) {
      case 'admin':
        return [
          ...commonItems,
          { text: 'Users', icon: <People />, path: '/admin/users' },
          { text: 'Departments', icon: <School />, path: '/admin/departments' },
          { text: 'Degrees', icon: <Class />, path: '/admin/degrees' },
          { text: 'Courses', icon: <Class />, path: '/admin/courses' },
        ];
      case 'faculty':
        return [
          ...commonItems,
          { text: 'My Courses', icon: <Class />, path: '/my-courses' },
          { text: 'Students', icon: <People />, path: '/students' },
        ];
      case 'office':
        return [
          ...commonItems,
          { text: 'Enrollments', icon: <School />, path: '/enrollments' },
          { text: 'Students', icon: <People />, path: '/students' },
        ];
      case 'student':
        return [
          ...commonItems,
          { text: 'My Courses', icon: <Class />, path: '/my-courses' },
          { text: 'Enrollments', icon: <School />, path: '/enrollments' },
        ];
      default:
        return commonItems;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            College Platform - {user?.user_type?.toUpperCase()} Dashboard
          </Typography>
          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                {user?.first_name} {user?.last_name}
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <ExitToApp fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {getMenuItems().map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton onClick={() => navigate(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;
