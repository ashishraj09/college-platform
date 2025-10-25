import React from 'react';
import { Box, Container, Button, Typography, Grid, Divider, IconButton, Menu, MenuItem, ListItemIcon } from '@mui/material';
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
          </Box>

          <Box>
            {loading ? (
              // keep header spacing stable while auth refresh completes
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
                sx={{ fontWeight: 600, px: 3 }}
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
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 3 }}>
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

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
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

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
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

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
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

          <Grid size={{ xs: 6, sm: 3, md: 3 }}>
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
