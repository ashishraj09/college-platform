import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';

// Import components (will be created)
import LoginPage from '../pages/auth/LoginPage';
import ActivateAccountPage from '../pages/auth/ActivateAccountPage';
import DashboardLayout from '../layouts/DashboardLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import DepartmentsPage from '../pages/admin/DepartmentsPage';
import { UsersPage } from '../pages/UsersPage';
import TestPage from '../pages/TestPage';
import FacultyDashboard from '../pages/faculty/FacultyDashboard';
import CourseDetailsView from '../pages/faculty/CourseDetailsView';
import StudentDashboard from '../pages/student/StudentDashboard';
import OfficeDashboard from '../pages/office/OfficeDashboard';
import ProtectedRoute from '../components/common/ProtectedRoute';
import DataDebugger from '../components/debug/DataDebugger';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  // Determine dashboard route based on user type
  const getDashboardRoute = () => {
    if (!user) return '/login';
    
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

  return (
    <Routes>
      {/* Test Route */}
      <Route 
        path="/test" 
        element={<TestPage />} 
      />
      
      {/* Debug Route */}
      <Route 
        path="/debug" 
        element={<DataDebugger />} 
      />
      
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to={getDashboardRoute()} replace /> : <LoginPage />} 
      />
      
      {/* Account Activation Route */}
      <Route 
        path="/activate" 
        element={<ActivateAccountPage />} 
      />
      
      {/* Password Reset Route */}
      <Route 
        path="/reset-password" 
        element={<ActivateAccountPage />} 
      />
      
      {/* Protected Routes - Temporarily bypassed for testing */}
      <Route
        path="/admin/*"
        element={
          <DashboardLayout>
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="users" element={<UsersPage />} />
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
                <Route path="course/:courseId" element={<CourseDetailsView />} />
                <Route path="courses/create" element={<Navigate to="/faculty" replace />} />
                <Route path="degrees/create" element={<Navigate to="/faculty" replace />} />
                <Route path="*" element={<Navigate to="/faculty" replace />} />
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
              <StudentDashboard />
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
            <Navigate to="/login" replace />
          )
        }
      />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
