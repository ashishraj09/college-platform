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
import { useRouter } from 'next/router';
import { getUserEffectiveRole } from '../store/slices/authSlice';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const router = useRouter();
  const effectiveRole = getUserEffectiveRole(user);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
  router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, redirect to login
  router.push('/login');
    } finally {
      handleClose();
    }
  };

  return (
  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Box
            sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => {
              if (user && effectiveRole === 'student') {
                router.push('/student');
              } else if (user && effectiveRole === 'hod') {
                router.push('/hod');
              } else if (user && effectiveRole === 'faculty') {
                router.push('/faculty');
              } else if (user && effectiveRole === 'admin') {
                router.push('/admin');
              } else {
                router.push('/');
              }
            }}
          >
            <img
              src="/static/college-logo.png"
              alt="College Logo"
              style={{ height: 40, marginRight: 14, background: 'transparent', borderRadius: 8 }}
            />
            <Typography variant="h6" component="div" sx={{ fontWeight: 700, textAlign: 'left', letterSpacing: 0.5 }}>
              {process.env.NEXT_PUBLIC_APP_NAME}
            </Typography>
          </Box>
          
          {/* Navigation Links */}
          {user?.user_type === 'faculty' && user?.is_head_of_department && router.pathname !== '/hod' && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Button
                color="inherit"
                startIcon={<DashboardIcon />}
                onClick={() => router.push('/hod')}
              >
                Dashboard
              </Button>
            </Box>
          )}

          {/* Navigation Links - For students */}
          {user?.user_type === 'student' && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Button
                color="inherit"
                startIcon={<DashboardIcon />}
                onClick={() => {
                  const degreeCode = user?.degree?.code;
                  if (degreeCode) {
                    router.push(`/degree/${encodeURIComponent(degreeCode)}`);
                  } else {
                    router.push('/student');
                  }
                }}
              >
                My Degree
              </Button>
              <Button
                color="inherit"
                startIcon={<SchoolIcon />}
                onClick={() => window.location.assign('/')}
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
      <Box component="footer" sx={{
        width: '100%',
        mt: 'auto',
        py: 2,
        bgcolor: 'grey.100',
        borderTop: '1px solid',
        borderColor: 'grey.200',
        textAlign: 'center',
        fontSize: { xs: '0.95rem', sm: '1rem' },
        color: 'text.secondary',
      }}>
  © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || 'College Platform'}. All rights reserved.
      </Box>
    </Box>
  );
};

export default DashboardLayout;
