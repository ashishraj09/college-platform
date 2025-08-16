import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  CssBaseline,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Button,
} from '@mui/material';
import {
  ExitToApp,
  AccountCircle,
  School as SchoolIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            College Platform - {user?.user_type === 'admin' ? 'Admin' : user?.user_type === 'faculty' ? 'Faculty' : 'Student'} Dashboard
          </Typography>
          
          {/* Navigation Links */}
          {user?.user_type === 'faculty' && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Button
                color="inherit"
                startIcon={<DashboardIcon />}
                onClick={() => navigate('/faculty')}
              >
                Dashboard
              </Button>
              <Button
                color="inherit"
                startIcon={<SchoolIcon />}
                // onClick to /faculty/degrees removed
              >
                Degrees
              </Button>
            </Box>
          )}

          {/* Navigation Links - For students */}
          {user?.user_type === 'student' && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Button
                color="inherit"
                startIcon={<DashboardIcon />}
                onClick={() => navigate('/student')}
              >
                My Degree
              </Button>
              <Button
                color="inherit"
                startIcon={<SchoolIcon />}
                onClick={() => navigate('/student/degrees')}
              >
                Degrees
              </Button>
            </Box>
          )}
          
          {/* User Menu */}
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
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          mt: '64px', // Account for AppBar height
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;
