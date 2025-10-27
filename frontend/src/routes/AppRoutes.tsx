import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import { CircularProgress, Box } from '@mui/material';

// Import components (will be created)
import LoginPage from '../pages/login';
import CreateDegreePage from '../pages/create-degree';
import ActivateAccountPage from '../pages/activate-account';
import ForgotPasswordPage from '../pages/forgot-password';
import ResetPasswordPage from '../pages/reset-password';
import DashboardLayout from '../layouts/DashboardLayout';
import AdminDashboard from '../pages/admin';
import CreateUser from '../pages/admin/user/create';
import FacultyDashboard from '../pages/faculty';
import CourseDetailsView from '../pages/faculty/course-details';
import DegreesPage from '../pages/faculty/degrees';
import DegreeDetailsPage from '../pages/faculty/degree-details';
import StudentDashboard from '../pages/student';
import StudentDegreesPage from '../pages/student/degrees';
import OfficeDashboard from '../pages/office';
import ProtectedRoute from '../components/common/ProtectedRoute';
import Homepage from '../pages/homepage';
import DegreeDetail from '../pages/degree/[id]';
import CourseDetail from '../pages/course/[id]';
import DepartmentDetail from '../pages/department/[code]';

import HODDashboard from '../pages/hod';
import FacultyApprovalPage from '../pages/hod/faculty-approval';
import EnrollmentApprovalPage from '../pages/hod/enrollment-approval';
import DepartmentManagementPage from '../pages/hod/department-management';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user, loading } = useAppSelector((state) => state.auth);

  // Determine dashboard route based on user type
  const getDashboardRoute = () => {
    if (!user) return '/login';
    
    // Check for HOD role first (faculty with HOD status)
    if (user.user_type === 'faculty' && user.is_head_of_department) {
      return '/hod';
    }
    
    // Otherwise route based on user_type
    switch (user.user_type) {
      case 'admin':
        return '/admin';
      case 'faculty':
        return '/faculty';
      case 'student':
        return '/student';
      case 'office':
        return '/office';
      default:
        return '/login';
    }
  };

  // Show loading spinner while checking authentication status
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
        <Box mt={2}>Loading application...</Box>
      </Box>
    );
  }

  return (
    <Routes>
      {/* Public Routes - No Authentication Required */}
      <Route path="/homepage" element={<Homepage />} />
      <Route path="/degree/:id" element={<DegreeDetail />} />
      <Route path="/course/:id" element={<CourseDetail />} />
      <Route path="/department/:code" element={<DepartmentDetail />} />
      
      {/* Create Degree Page (all users) */}
      <Route path="/degrees/create" element={<CreateDegreePage />} />
      
      {/* Authentication Routes */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to={getDashboardRoute()} replace /> : <LoginPage />} 
      />
         
      {/* Password Reset Routes */}
      <Route 
        path="/forgot-password" 
        element={isAuthenticated ? <Navigate to={getDashboardRoute()} replace /> : <ForgotPasswordPage />} 
      />
      
      <Route 
        path="/reset-password" 
        element={isAuthenticated ? <Navigate to={getDashboardRoute()} replace /> : <ResetPasswordPage />} 
      />
      
      {/* Account Activation Route */}
      <Route 
        path="/activate" 
        element={<ActivateAccountPage />} 
      />
      
      {/* Protected Routes - Temporarily bypassed for testing */}
      <Route
        path="/admin/*"
        element={
          <DashboardLayout>
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="create-user" element={<CreateUser />} />
              <Route path="edit-user/:userId" element={<CreateUser />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </DashboardLayout>
        }
      />
      
      <Route
        path="/faculty/*"
        element={
          <ProtectedRoute requiredRole="faculty">
            <DashboardLayout>
              <Routes>
                <Route index element={<FacultyDashboard />} />
                <Route path="new-dashboard" element={<FacultyDashboard />} />
                <Route path="degrees" element={<DegreesPage />} />
                <Route path="degrees/:degreeId" element={<DegreeDetailsPage />} />
                <Route path="course/:courseId" element={<CourseDetailsView />} />
                <Route path="courses/:courseId" element={<CourseDetailsView />} />
                <Route path="courses/create" element={<Navigate to="/faculty" replace />} />
                {/* <Route path="degrees/create" element={<Navigate to="/faculty" replace />} /> */}
                <Route path="*" element={<Navigate to="/faculty" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hod/*"
        element={
          <ProtectedRoute requiredRole="hod">
            <DashboardLayout>
              <Routes>
                <Route index element={<HODDashboard />} />
                <Route path="faculty-approvals" element={<FacultyApprovalPage />} />
                <Route path="enrollment-approvals" element={<EnrollmentApprovalPage />} />
                <Route path="department-management" element={<DepartmentManagementPage />} />
                <Route path="*" element={<Navigate to="/hod" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/student/*"
        element={
          <ProtectedRoute requiredRole="student">
            <DashboardLayout>
              <Routes>
                <Route index element={<StudentDashboard />} />
                <Route path="degrees" element={<StudentDegreesPage />} />
                <Route path="*" element={<Navigate to="/student" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/office/*"
        element={
          <ProtectedRoute requiredRole="office">
            <DashboardLayout>
              <OfficeDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Default redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={getDashboardRoute()} replace />
          ) : (
            <Navigate to="/homepage" replace />
          )
        }
      />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
