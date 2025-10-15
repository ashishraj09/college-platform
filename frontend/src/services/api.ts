// src/services/api.ts

import axios from 'axios';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add dev bypass header only
// Centralized request interceptor to attach JWT access token
api.interceptors.request.use(
  (config) => {
    // Add dev bypass header if enabled
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.REACT_APP_BYPASS_AUTH === 'true'
    ) {
      config.headers['X-Dev-Bypass-Auth'] = 'true';
    }
    // Attach JWT access token if present
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
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
function handleApiError(err: any) {
  if (err.response) {
    return { error: err.response.data?.error || err.message, status: err.response.status };
  }
  return { error: err.message || 'Unknown error', status: undefined };
}

export const authAPI = {
  login: async (data: any) => {
    try {
      return (await api.post('/auth/login', data)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  register: async (data: any) => {
    try {
      return (await api.post('/auth/register', data)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  logout: async () => {
    try {
      return (await api.post('/auth/logout')).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  me: async () => {
    try {
      return (await api.get('/auth/me')).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  forgotPassword: async (email: string) => {
    try {
      return (await api.post('/auth/forgot-password', { email })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  resetPassword: async (payload: { token: string; password: string }) => {
    try {
      return (await api.post('/auth/reset-password', payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getProfile: async () => {
    try {
      return (await api.get('/auth/me')).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
};

// --- Users API ---
export const usersAPI = {
  getStats: async () => {
    try {
      return (await api.get('/users/stats')).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getUsers: async (params?: any) => {
    try {
      return (await api.get('/users', { params })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getUserById: async (id: string) => {
    try {
      return (await api.get(`/users/${id}`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  createUser: async (data: any) => {
    try {
      return (await api.post('/users', data)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  updateUser: async (id: string, data: any) => {
    try {
      return (await api.put(`/users/${id}`, data)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  deleteUser: async (id: string) => {
    try {
      return (await api.delete(`/users/${id}`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getUsersByDepartment: async (departmentId: string, options?: { user_type?: string; status?: string }) => {
    try {
      const params = new URLSearchParams();
      if (options?.user_type) params.append('user_type', options.user_type);
      if (options?.status) params.append('status', options.status);
      const { data } = await api.get(`/users/department/${departmentId}${params.toString() ? `?${params}` : ''}`);
      return data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  resetUserPassword: async (id: string) => {
    try {
      return (await api.post(`/users/${id}/reset-password`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
};

// --- Courses API (backwards-compatible) ---
export const coursesAPI = {
  getCourses: async (params?: any) => {
    try {
      const { data } = await api.get('/courses', { params });
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.courses)) return data.courses;
      return [];
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getCourseById: async (id: string) => {
    try {
      return (await api.get(`/courses/${id}`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getCourseForEdit: async (id: string, resolveNames = false) => {
    try {
      return (await api.get(`/courses/${id}/edit?resolve_names=${resolveNames}`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  createCourse: async (payload: any, userId?: string, deptId?: string) => {
    try {
      if (userId === undefined && deptId === undefined) {
        return (await api.post('/courses', payload)).data;
      }
      return (await api.post('/courses', { ...payload, userId, deptId })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  updateCourse: async (id: string, payload: any, userId?: string, deptId?: string) => {
    try {
      if (userId === undefined && deptId === undefined) {
        return (await api.put(`/courses/${id}`, payload)).data;
      }
      return (await api.put(`/courses/${id}`, { ...payload, userId, deptId })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  deleteCourse: async (id: string, payload?: any) => {
    try {
      return (await api.delete(`/courses/${id}`, { data: payload })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  approveCourse: async (id: string, payload?: any) => {
    try {
      return (await api.patch(`/courses/${id}/approve`, payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  rejectCourse: async (id: string, reason: string) => {
    try {
      return (await api.patch(`/courses/${id}/reject`, { reason })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getFacultyCourses: async (deptId?: string, userId?: string) => {
    try {
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
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getDepartmentCourses: async (params?: { departmentId?: string }) => {
    try {
      return (await api.get('/courses/department-courses', { params })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getAvailableCourses: async (semester?: number) => {
    try {
      return (await api.get('/courses/available', { params: { semester } })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  submitCourse: async (id: string, payload?: any) => {
    try {
      return (await api.patch(`/courses/${id}/submit`, payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  publishCourse: async (id: string, payload?: any) => {
    try {
      return (await api.patch(`/courses/${id}/publish`, payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  checkCanEdit: async (id: string) => {
    try {
      return (await api.get(`/courses/${id}/can-edit`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  createCourseVersion: async (id: string) => {
    try {
      return (await api.post(`/courses/${id}/create-version`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  submitCourseForApproval: async (id: string, message: string) => {
    try {
      return (await api.patch(`/courses/${id}/submit`, { message })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
};

// --- Degrees API (backwards-compatible) ---
export const degreesAPI = {
  getDegrees: async (params?: any) => {
    try {
      const { data } = await api.get('/degrees', { params });
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.degrees)) return data.degrees;
      return [];
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getDegreeById: async (id: string) => {
    try {
      return (await api.get(`/degrees/${id}`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  createDegree: async (payload: any) => {
    try {
      return (await api.post('/degrees', payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  updateDegree: async (id: string, payload: any) => {
    try {
      return (await api.put(`/degrees/${id}`, payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  deleteDegree: async (id: string, payload?: any) => {
    try {
      return (await api.delete(`/degrees/${id}`, { data: payload })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  createDegreeVersion: async (id: string) => {
    try {
      return (await api.post(`/degrees/${id}/create-version`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getDegreesByDepartment: async (departmentId: string, isHodView: boolean = false) => {
    try {
      if (isHodView) {
        return (await api.get(`/degrees`, { params: { department_id: departmentId } })).data;
      }
      return (await api.get(`/degrees/department/${departmentId}`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  submitDegreeForApproval: async (id: string, message: string) => {
    try {
      return (await api.patch(`/degrees/${id}/submit`, { message })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getFacultyDegrees: async (deptId?: string, userId?: string, isHodView: boolean = false) => {
    try {
      if (isHodView) {
        return (await api.get('/degrees', { params: { department_id: deptId, status: 'active' } })).data;
      }
      return (await api.get('/degrees/my-degrees', { params: { departmentId: deptId, userId } })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  submitDegree: async (id: string, payload?: any) => {
    try {
      return (await api.patch(`/degrees/${id}/submit`, payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  approveDegree: async (id: string, payload?: any) => {
    try {
      return (await api.patch(`/degrees/${id}/approve`, payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  rejectDegree: async (id: string, payload: { reason: string; userId?: string }) => {
    try {
      return (await api.patch(`/degrees/${id}/reject`, payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  publishDegree: async (id: string, payload?: any) => {
    try {
      return (await api.patch(`/degrees/${id}/publish`, payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  postComment: async (degreeId: string, text: string, userId: string, userName: string, userType: string) => {
    try {
      return (await api.post(`/degrees/${degreeId}/comment`, { text, userId, userName, userType })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getComments: async (degreeId: string) => {
    try {
      const { data } = await api.get(`/degrees/${degreeId}`);
      return data.degree.comments || [];
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getActiveDegrees: async (department_code: string) => {
    try {
      const { data } = await api.get('/degrees', { params: { department_code: department_code, status: 'active' } });
      return data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
};

// --- Departments API ---
export const departmentsAPI = {
  getDepartments: async (params?: any) => {
    try {
      return (await api.get('/departments', { params })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getDepartmentById: async (id: string) => {
    try {
      return (await api.get(`/departments/${id}`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  createDepartment: async (payload: any) => {
    try {
      return (await api.post('/departments', payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  updateDepartment: async (id: string, payload: any) => {
    try {
      return (await api.put(`/departments/${id}`, payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  deleteDepartment: async (id: string, payload?: any) => {
    try {
      return (await api.delete(`/departments/${id}`, { data: payload })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
};

// --- Enrollments API ---
export const enrollmentsAPI = {
  getEnrollments: async (params?: any) => {
    try {
      return (await api.get('/enrollments', { params })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  updateEnrollment: async (id: string, payload: any) => {
    try {
      return (await api.put(`/enrollments/${id}`, payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  approveEnrollment: async (id: string, approverType: 'hod' | 'office') => {
    try {
      return (await api.patch(`/enrollments/${id}/approve`, { approver_type: approverType })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  rejectEnrollment: async (id: string, reason: string) => {
    try {
      return (await api.patch(`/enrollments/${id}/reject`, { reason })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getPendingApprovals: async (params?: any) => {
    try {
      return (await api.get('/enrollments/pending-approvals', { params })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  hodDecision: async (payload: { enrollment_ids: string[]; action: 'approve' | 'reject'; rejection_reason?: string }) => {
    try {
      return (await api.post('/enrollments/hod-decision', payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
};

// --- New Enrollment API (Using course codes) ---
export const enrollmentAPI = {
  // Student endpoints
  getAllEnrollments: async () => {
    try {
      return (await api.get('/enrollments')).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  createDraft: async (payload: { course_codes: string[], semester: number, degree_code: string, department_code: string }) => {
    try {
      // Backend no longer exposes /enrollments/draft; fetch drafts via enrollments list
      const { course_codes, semester, department_code } = payload as any;
      // Send department_code to backend
      const result = await enrollmentsAPI.getEnrollments();
      return result;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  saveDraft: async (payload: { enrollment_id: string, course_codes: string[], department_code?: string }) => {
    try {
      return (await api.put('/enrollments/draft', { enrollment_id: payload.enrollment_id, course_codes: payload.course_codes, department_code: payload.department_code })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  submitForApproval: async (payload: { enrollment_id: string }) => {
    try {
      return (await api.post('/enrollments/draft/submit')).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getMyDegreeCourses: async (params?: any) => {
    try {
      return (await api.get('/enrollments/my-degree-courses', { params })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  checkActiveEnrollmentStatus: async () => {
    try {
      // Backend now returns a plain array at GET /enrollments.
      // Fetch all enrollments for the current user and compute derived fields client-side.
      const enrollments: any[] = await enrollmentsAPI.getEnrollments();

      const activeEnrollments = Array.isArray(enrollments) ? enrollments : [];
      const hasDraft = activeEnrollments.some(e => e.enrollment_status === 'draft');
      const draftEnrollment = activeEnrollments.find(e => e.enrollment_status === 'draft') || null;

      return {
        activeEnrollments,
        hasDraft,
        draftEnrollment
      };
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  
  // HOD endpoints
  getPendingApprovals: async (params?: { degree_code?: string, semester?: number, search?: string }) => {
    try {
      const { data } = await api.get('/enrollment/pending-approvals', { params });
      // Normalize to object with pendingApprovals array
      if (!data) return { pendingApprovals: [] };
      if (Array.isArray(data)) return { pendingApprovals: data };
      if (Array.isArray(data.pendingApprovals)) return data;
      // Some backends may return { pendingApprovals: [] } nested under data.degree, etc.
      return { pendingApprovals: [] };
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  approveEnrollments: async (payload: { enrollment_ids: string[] }) => {
    try {
      return (await api.post('/enrollment/approve', payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  rejectEnrollments: async (payload: { enrollment_ids: string[], rejection_reason: string }) => {
    try {
      return (await api.post('/enrollment/reject', payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  // Individual enrollment approval/rejection
  approveEnrollment: async (enrollmentId: string) => {
    try {
      return (await api.post('/enrollment/approve', { enrollment_ids: [enrollmentId] })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  rejectEnrollment: async (enrollmentId: string, rejectionReason: string) => {
    try {
      return (await api.post('/enrollment/reject', { enrollment_ids: [enrollmentId], rejection_reason: rejectionReason })).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  // Get enrollments by degree code (new helper calling backend /enrollment/degree/:code)
  getEnrollmentsByDegree: async (degreeCode: string, params?: { semester?: number; academic_year?: string; status?: string }) => {
    try {
      const { data } = await api.get(`/enrollment/degree/${degreeCode}`, { params });
      // Normalize response: expect { degree, enrollment_dates, courses }
      if (!data) return { degree: null, enrollment_dates: {}, courses: [] };
      return {
        degree: data.degree || null,
        enrollment_dates: data.enrollment_dates || {},
        courses: Array.isArray(data.courses) ? data.courses : []
      };
    } catch (err: any) {
      return handleApiError(err);
    }
  },
};

// --- Timeline API (entityType + entityId) ---
export const timelineAPI = {
  getTimeline: async (entityType: string, entityId: string) => {
    try {
      return (await api.get(`/timeline/${entityType}/${entityId}`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getTimelineForUser: async (userId: string) => {
    try {
      return (await api.get(`/timeline/user/${userId}`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  getTimelineForDepartment: async (departmentId: string) => {
    try {
      return (await api.get(`/timeline/department/${departmentId}`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  createTimelineEvent: async (payload: any) => {
    try {
      return (await api.post('/timeline', payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  updateTimelineEvent: async (id: string, payload: any) => {
    try {
      return (await api.put(`/timeline/${id}`, payload)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
  deleteTimelineEvent: async (id: string) => {
    try {
      return (await api.delete(`/timeline/${id}`)).data;
    } catch (err: any) {
      return handleApiError(err);
    }
  },
};

export default api;

export type { CourseWithEnrollmentStatus, UniversityDepartment, Enrollment, EnrollmentData, EnrollmentResponse } from './types';