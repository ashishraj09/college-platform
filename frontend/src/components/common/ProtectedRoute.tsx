import React, { ReactNode, useEffect } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { Box, CircularProgress } from '@mui/material';
import { getUserEffectiveRole } from '../../store/slices/authSlice';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'student' | 'faculty' | 'office' | 'admin' | 'hod';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, user, loading } = useAppSelector((state) => state.auth);
  const effectiveRole = getUserEffectiveRole(user);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor={(theme) => theme.palette.background.default}
      >
        <CircularProgress size={50} />
        <Box mt={2}>Authenticating...</Box>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  const router = require('next/router').useRouter();
  useEffect(() => {
    if (!loading && (!isAuthenticated || !user)) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, user, router]);
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check if user has required role based on effective role
  if (requiredRole && effectiveRole !== requiredRole) {
    // Redirect to their appropriate dashboard based on effective role
    useEffect(() => {
      if (!loading && isAuthenticated && user && requiredRole && effectiveRole !== requiredRole) {
        router.replace(`/${effectiveRole}`);
      }
    }, [loading, isAuthenticated, user, requiredRole, effectiveRole, router]);
    return null;
  }

  // Check if user account is active
  if (user.status !== 'active') {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        p={4}
      >
        <h2>Account Not Active</h2>
        <p>Your account is not active. Please contact the administrator.</p>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
