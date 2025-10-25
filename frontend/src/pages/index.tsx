import React, { useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import Homepage from './homepage';
import PublicShell from '../components/PublicShell';
import type { NextPage } from 'next';

const HomeRedirect: NextPage & { getLayout?: (page: React.ReactElement) => React.ReactNode } = () => {
  const router = useRouter();
  const auth = useContext(AuthContext);

  useEffect(() => {
    if (!auth) return;
    if (auth.loading) return; // Don't redirect while loading
    if (auth.isAuthenticated && auth.user) {
      const user = auth.user;
      if (user.user_type === 'faculty' && user.is_head_of_department) {
        router.replace('/hod');
      } else {
        switch (user.user_type) {
          case 'admin':
            router.replace('/admin');
            break;
          case 'faculty':
            router.replace('/faculty');
            break;
          case 'student':
            router.replace('/student');
            break;
          case 'office':
            router.replace('/office');
            break;
          default:
            router.replace('/login');
        }
      }
    }
  }, [auth, router]);

  if (auth?.loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={50} />
        <Box mt={2}>Loading...</Box>
      </Box>
    );
  }

  // If not authenticated, show the homepage wrapped in the public shell
  if (!auth?.isAuthenticated) {
    return (
      <PublicShell>
        <Homepage />
      </PublicShell>
    );
  }

  return null;
};

// Disable the default DashboardLayout for this page
HomeRedirect.getLayout = (page: React.ReactElement) => page;

export default HomeRedirect;
