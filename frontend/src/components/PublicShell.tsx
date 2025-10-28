import React from 'react';
import { Box, Container, Button, Typography, Divider, IconButton, Menu, MenuItem, ListItemIcon } from '@mui/material';
import Grid from '@mui/material/Grid';
import { Login as LoginIcon, AccountCircle, ExitToApp } from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

const PublicHeader: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = async () => {
    try {
      await logout();
      handleClose();
      router.push('/login');
    } catch (err) {
      // fallback: navigate to login
      handleClose();
      router.push('/login');
    }
  };

  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
            onClick={() => router.push('/')}
          >
            <Box
              component="img"
              src="/static/college-logo.png"
              alt="College Logo"
              sx={{
                height: 40,
                width: 'auto',
                objectFit: 'contain',
              }}
            />
            <Typography variant="h5" fontWeight={700} color="primary">
              {process.env.NEXT_PUBLIC_APP_NAME}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 3, cursor: 'pointer' }} onClick={() => router.push('/') }>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3L2 9L12 15L22 9L12 3Z" fill="#fff"/>
                <path d="M2 17V9L12 15L22 9V17C22 17.5304 21.7893 18.0391 21.4142 18.4142C21.0391 18.7893 20.5304 19 20 19H4C3.46957 19 2.96086 18.7893 2.58579 18.4142C2.21071 18.0391 2 17.5304 2 17Z" fill="#fff"/>
              </svg>
              <Typography variant="h6" fontWeight={500} color="inherit" sx={{ ml: 1, color: '#fff' }}>
                DEGREES
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isAuthenticated && user && (
              <Button
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 600, px: 2 }}
                onClick={() => {
                  if (user.user_type === 'student') {
                    router.push('/student');
                  } else if (user.user_type === 'faculty') {
                    router.push('/faculty');
                  } else if (user.user_type === 'office') {
                    router.push('/office');
                  } else if (user.user_type === 'admin') {
                    router.push('/admin');
                  } else {
                    router.push('/');
                  }
                }}
              >
                Dashboard
              </Button>
            )}
            {loading ? (
              <Box sx={{ width: 110, height: 36 }} />
            ) : isAuthenticated && user ? (
              <>
                <IconButton size="large" onClick={handleMenu} color="primary">
                  <AccountCircle />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem disabled>
                    {user.first_name} {user.last_name}
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <ExitToApp fontSize="small" />
                    </ListItemIcon>
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant="outlined"
                startIcon={<LoginIcon />}
                onClick={() => router.push('/login')}
                sx={{ fontWeight: 600, px: { xs: 1, sm: 3 }, width: { xs: '100%', sm: 'auto' } }}
                fullWidth
              >
                Login
              </Button>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

const PublicFooter: React.FC<{ extraCountText?: string }> = ({ extraCountText }) => {
  const router = useRouter();
  return (
    <Box
      sx={{
        bgcolor: '#f8f9fa',
        borderTop: '1px solid',
        borderColor: 'divider',
        py: 6,
        mt: 8,
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2, md: 0 } }}>
        <Grid container spacing={4} alignItems="flex-start" justifyContent={{ xs: 'center', md: 'space-between' }}>
          <Grid item xs={12} sm={6} md={3} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                component="img"
                src="/static/college-logo.png"
                alt="College Logo"
                sx={{
                  height: 32,
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
              <Typography variant="h6" fontWeight={700}>
                {process.env.NEXT_PUBLIC_APP_NAME}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Empowering students through world-class education.
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={2} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
              Quick Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                onClick={() => router.push('/')}
              >
                All Programmes
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                onClick={() => router.push('/login')}
              >
                Student Login
                </Typography>
              </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={2} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
              Information For
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Future Students
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current Students
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Staff
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={2} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
              About
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Our Story
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Leadership
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Careers
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
              Contact
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {extraCountText || ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Email: info@college.edu
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Typography variant="body2" color="text.secondary" align="center">
          © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME}. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

const PublicShell: React.FC<{ children: React.ReactNode; footerCountText?: string }> = ({ children, footerCountText }) => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff' }}>
      <PublicHeader />
      <Box>
        {children}
      </Box>
      <PublicFooter extraCountText={footerCountText} />
    </Box>
  );
};

export default PublicShell;
