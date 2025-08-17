// src/services/api.ts

import axios from 'axios';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and dev bypass header
api.interceptors.request.use(
  (config) => {
    const tokens = sessionStorage.getItem('tokens');
    if (tokens) {
      try {
        const parsedTokens = JSON.parse(tokens);
        if (parsedTokens.access) {
          config.headers.Authorization = `Bearer ${parsedTokens.access}`;
        }
      } catch (error) {
        console.error('Error parsing tokens:', error);
      }
    }
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
  approveCourse: async (id: string) => (await api.patch(`/courses/${id}/approve`)).data,
  rejectCourse: async (id: string, reason: string) => (await api.patch(`/courses/${id}/reject`, { reason })).data,
  getFacultyCourses: async (deptId?: string, userId?: string) => {
    // Use /my-courses route as per backend
    return (await api.get('/courses/my-courses', { params: { departmentId: deptId, userId } })).data;
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
  deleteDegree: async (id: string) => (await api.delete(`/degrees/${id}`)).data,
  getDegreesByDepartment: async (departmentId: string) => (await api.get(`/degrees/department/${departmentId}`)).data,
  submitDegreeForApproval: async (id: string, message: string, userId?: string, departmentId?: string) => (await api.patch(`/degrees/${id}/submit`, { message, userId, departmentId })).data,
  getFacultyDegrees: async (deptId?: string) => {
    // Use /degrees/my-degrees route as per backend
    return (await api.get('/degrees/my-degrees', { params: { departmentId: deptId } })).data;
  },
  submitDegree: async (id: string, payload?: any) => (await api.patch(`/degrees/${id}/submit`, payload)).data,
  approveDegree: async (id: string) => (await api.patch(`/degrees/${id}/approve`)).data,
  rejectDegree: async (id: string, reason: string) => (await api.patch(`/degrees/${id}/reject`, { reason })).data,
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
