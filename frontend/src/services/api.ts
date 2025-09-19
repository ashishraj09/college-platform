// src/services/api.ts

import axios from 'axios';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add dev bypass header only
api.interceptors.request.use(
  (config) => {
    // Add dev bypass header if enabled
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.REACT_APP_BYPASS_AUTH === 'true'
    ) {
      config.headers['X-Dev-Bypass-Auth'] = 'true';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Prevent infinite loops
    if (originalRequest && originalRequest._retry) {
      return Promise.reject(error);
    }
    // Handle 401 errors (unauthorized)
    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      if (window.location.pathname !== '/login') {
        console.log('Authentication failed, redirecting to login');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);


// --- Auth API ---
export const authAPI = {
  login: async (data: any) => (await api.post('/auth/login', data)).data,
  register: async (data: any) => (await api.post('/auth/register', data)).data,
  logout: async () => (await api.post('/auth/logout')).data,
  me: async () => (await api.get('/auth/me')).data,
  forgotPassword: async (email: string) => (await api.post('/auth/forgot-password', { email })).data,
  resetPassword: async (payload: { token: string; password: string }) => (await api.post('/auth/reset-password', payload)).data,
  getProfile: async () => (await api.get('/auth/me')).data,
};

// --- Users API ---
export const usersAPI = {
  getUsers: async (params?: any) => (await api.get('/users', { params })).data,
  getUserById: async (id: string) => (await api.get(`/users/${id}`)).data,
  createUser: async (data: any) => (await api.post('/users', data)).data,
  updateUser: async (id: string, data: any) => (await api.put(`/users/${id}`, data)).data,
  deleteUser: async (id: string) => (await api.delete(`/users/${id}`)).data,
  getUsersByDepartment: async (departmentId: string, options?: { user_type?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (options?.user_type) params.append('user_type', options.user_type);
    if (options?.status) params.append('status', options.status);
    const { data } = await api.get(`/users/department/${departmentId}${params.toString() ? `?${params}` : ''}`);
    return data;
  },
  resetUserPassword: async (id: string) => (await api.post(`/users/${id}/reset-password`)).data,
};

// --- Courses API (backwards-compatible) ---
export const coursesAPI = {
  getCourses: async (params?: any) => (await api.get('/courses', { params })).data,
  getCourseById: async (id: string) => (await api.get(`/courses/${id}`)).data,
  getCourseForEdit: async (id: string, resolveNames = false) => (await api.get(`/courses/${id}/edit?resolve_names=${resolveNames}`)).data,
  createCourse: async (payload: any, userId?: string, deptId?: string) => {
    if (userId === undefined && deptId === undefined) {
      return (await api.post('/courses', payload)).data;
    }
    return (await api.post('/courses', { ...payload, userId, deptId })).data;
  },
  updateCourse: async (id: string, payload: any, userId?: string, deptId?: string) => {
    if (userId === undefined && deptId === undefined) {
      return (await api.put(`/courses/${id}`, payload)).data;
    }
    return (await api.put(`/courses/${id}`, { ...payload, userId, deptId })).data;
  },
  deleteCourse: async (id: string, payload?: any) => (await api.delete(`/courses/${id}`, { data: payload })).data,
  approveCourse: async (id: string, payload?: any) => (await api.patch(`/courses/${id}/approve`, payload)).data,
  rejectCourse: async (id: string, reason: string) => (await api.patch(`/courses/${id}/reject`, { reason })).data,
    getFacultyCourses: async (deptId?: string, userId?: string) => {
    if (!deptId) {
      throw new Error('Department ID is required');
    }
    
    // For HOD view - shows all department courses
    if (process.env.REACT_APP_HOD_VIEW === 'true') {
      return (await api.get('/courses/department-courses', { params: { departmentId: deptId } })).data;
    }
    
    // Regular faculty view - shows only their own courses
    // Ensure userId is passed explicitly if available
    const params: any = { departmentId: deptId };
    if (userId) {
      params.userId = userId;
    } else {
      console.warn('No userId available for my-courses request');
    }
    
    return (await api.get('/courses/my-courses', { params })).data;
  },
  getDepartmentCourses: async (params?: { departmentId?: string }) => (await api.get('/courses/department-courses', { params })).data,
  submitCourse: async (id: string, payload?: any) => (await api.patch(`/courses/${id}/submit`, payload)).data,
  publishCourse: async (id: string, payload?: any) => (await api.patch(`/courses/${id}/publish`, payload)).data,
  checkCanEdit: async (id: string) => (await api.get(`/courses/${id}/can-edit`)).data,
  createCourseVersion: async (id: string) => (await api.post(`/courses/${id}/create-version`)).data,
  submitCourseForApproval: async (id: string, message: string, userId?: string, departmentId?: string) => (await api.patch(`/courses/${id}/submit`, { message, userId, departmentId })).data,
};

// --- Degrees API (backwards-compatible) ---
export const degreesAPI = {
  getDegrees: async (params?: any) => (await api.get('/degrees', { params })).data,
  getDegreeById: async (id: string) => (await api.get(`/degrees/${id}`)).data,
  createDegree: async (payload: any) => (await api.post('/degrees', payload)).data,
  updateDegree: async (id: string, payload: any) => (await api.put(`/degrees/${id}`, payload)).data,
  deleteDegree: async (id: string, payload?: any) => (await api.delete(`/degrees/${id}`, { data: payload })).data,
  getDegreesByDepartment: async (departmentId: string, isHodView: boolean = false) => {
    // For HODs, show all department degrees
    if (isHodView) {
      return (await api.get(`/degrees`, { params: { department_id: departmentId } })).data;
    }
    // For regular faculty, this will use the filter in the backend to show only their degrees
    return (await api.get(`/degrees/department/${departmentId}`)).data;
  },
  submitDegreeForApproval: async (id: string, message: string, userId?: string, departmentId?: string) => (await api.patch(`/degrees/${id}/submit`, { message, userId, departmentId })).data,
  getFacultyDegrees: async (deptId?: string, userId?: string, isHodView: boolean = false) => {
    // For HODs viewing all department degrees, use a different approach
    if (isHodView) {
      return (await api.get('/degrees', { params: { department_id: deptId } })).data;
    }
    // Regular faculty view - shows only their own degrees
    return (await api.get('/degrees/my-degrees', { params: { departmentId: deptId, userId } })).data;
  },
  submitDegree: async (id: string, payload?: any) => (await api.patch(`/degrees/${id}/submit`, payload)).data,
  approveDegree: async (id: string, payload?: any) => (await api.patch(`/degrees/${id}/approve`, payload)).data,
  rejectDegree: async (id: string, payload: { reason: string; userId?: string }) => (await api.patch(`/degrees/${id}/reject`, payload)).data,
  publishDegree: async (id: string, payload?: any) => (await api.patch(`/degrees/${id}/publish`, payload)).data,
  postComment: async (degreeId: string, text: string, userId: string, userName: string, userType: string) => (await api.post(`/degrees/${degreeId}/comment`, { text, userId, userName, userType })).data,
  getComments: async (degreeId: string) => {
    const { data } = await api.get(`/degrees/${degreeId}`);
    return data.degree.comments || [];
  },
};

// --- Departments API ---
export const departmentsAPI = {
  getDepartments: async (params?: any) => (await api.get('/departments', { params })).data,
  getDepartmentById: async (id: string) => (await api.get(`/departments/${id}`)).data,
  createDepartment: async (payload: any) => (await api.post('/departments', payload)).data,
  updateDepartment: async (id: string, payload: any) => (await api.put(`/departments/${id}`, payload)).data,
  deleteDepartment: async (id: string, payload?: any) => (await api.delete(`/departments/${id}`, { data: payload })).data,
};

// --- Enrollments API ---
export const enrollmentsAPI = {
  getEnrollments: async (params?: any) => (await api.get('/enrollments', { params })).data,
  getEnrollmentById: async (id: string) => (await api.get(`/enrollments/${id}`)).data,
  createEnrollment: async (payload: any) => (await api.post('/enrollments', payload)).data,
  updateEnrollment: async (id: string, payload: any) => (await api.put(`/enrollments/${id}`, payload)).data,
  approveEnrollment: async (id: string, approverType: 'hod' | 'office') => (await api.patch(`/enrollments/${id}/approve`, { approver_type: approverType })).data,
  rejectEnrollment: async (id: string, reason: string) => (await api.patch(`/enrollments/${id}/reject`, { reason })).data,
  getPendingApprovals: async (params?: any) => (await api.get('/enrollments/pending-approvals', { params })).data,
  hodDecision: async (payload: { enrollment_ids: string[]; action: 'approve' | 'reject'; rejection_reason?: string }) => (await api.post('/enrollments/hod-decision', payload)).data,
};

// --- Message API ---
export const messageAPI = {
  getInbox: (userId: string) => api.get(`/messages/inbox/${userId}`),
  getSent: (userId: string) => api.get(`/messages/sent/${userId}`),
  sendMessage: (data: any) => api.post('/messages', data),
  deleteMessage: (id: string) => api.delete(`/messages/${id}`),
};

// --- Timeline API (entityType + entityId) ---
export const timelineAPI = {
  getTimeline: async (entityType: string, entityId: string) => (await api.get(`/timeline/${entityType}/${entityId}`)).data,
  getTimelineForUser: async (userId: string) => (await api.get(`/timeline/user/${userId}`)).data,
  getTimelineForDepartment: async (departmentId: string) => (await api.get(`/timeline/department/${departmentId}`)).data,
  createTimelineEvent: async (payload: any) => (await api.post('/timeline', payload)).data,
  updateTimelineEvent: async (id: string, payload: any) => (await api.put(`/timeline/${id}`, payload)).data,
  deleteTimelineEvent: async (id: string) => (await api.delete(`/timeline/${id}`)).data,
};

// --- Default export ---
export default api;
