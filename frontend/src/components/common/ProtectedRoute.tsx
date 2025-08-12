import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'student' | 'faculty' | 'office' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, user, loading } = useAppSelector((state) => state.auth);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (requiredRole && user.user_type !== requiredRole) {
    // Redirect to their appropriate dashboard
    const redirectPath = `/${user.user_type}`;
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
