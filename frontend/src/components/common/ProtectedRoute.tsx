import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
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
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role based on effective role
  if (requiredRole && effectiveRole !== requiredRole) {
    // Redirect to their appropriate dashboard based on effective role
    const redirectPath = `/${effectiveRole}`;
    return <Navigate to={redirectPath} replace />;
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
