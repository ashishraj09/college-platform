import React, { useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import Homepage from './homepage';
import PublicShell from '../components/PublicShell';
import type { NextPage } from 'next';

const HomeRedirect: NextPage & { getLayout?: (page: React.ReactElement) => React.ReactNode } = () => {
  const auth = useContext(AuthContext);

  if (auth?.loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={50} />
        <Box mt={2}>Loading...</Box>
      </Box>
    );
  }

  // Always show the homepage wrapped in the public shell, regardless of authentication
  return (
    <PublicShell>
      <Homepage />
    </PublicShell>
  );
};

// Disable the default DashboardLayout for this page
HomeRedirect.getLayout = (page: React.ReactElement) => page;

export default HomeRedirect;
