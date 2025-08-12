import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const tokens = localStorage.getItem('tokens');
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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const tokens = localStorage.getItem('tokens');
      if (tokens) {
        try {
          const parsedTokens = JSON.parse(tokens);
          if (parsedTokens.refresh) {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: parsedTokens.refresh,
            });
            
            const newTokens = response.data.tokens;
            localStorage.setItem('tokens', JSON.stringify(newTokens));
            
            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          localStorage.removeItem('tokens');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  
  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  
  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  
  resetPassword: async (data: { token: string; password: string }) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  register: async (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    user_type: 'student' | 'faculty' | 'office' | 'admin';
    student_id?: string;
    employee_id?: string;
    department_id?: string;
    degree_id?: string;
    enrolled_date?: string;
    enrolled_year?: number;
    is_head_of_department?: boolean;
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getUsers: async (params?: any) => {
    const response = await api.get('/users', { params });
    return response.data;
  },
  
  getUserById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  updateUser: async (id: string, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  
  deleteUser: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  
  getUsersByDepartment: async (departmentId: string) => {
    const response = await api.get(`/users/department/${departmentId}`);
    return response.data;
  },

  resetUserPassword: async (userId: string) => {
    const response = await api.post(`/users/${userId}/reset-password`);
    return response.data;
  },
};

// Courses API
export const coursesAPI = {
  getCourses: async (params?: any) => {
    const response = await api.get('/courses', { params });
    return response.data;
  },
  
  getCourseById: async (id: string) => {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  },
  
  createCourse: async (data: any, userId?: string, departmentId?: string) => {
    const courseData = { ...data };
    if (userId) courseData.userId = userId;
    if (departmentId) courseData.departmentId = departmentId;
    
    const response = await api.post('/courses', courseData);
    return response.data;
  },
  
  updateCourse: async (id: string, data: any, userId?: string, departmentId?: string) => {
    const courseData = { ...data };
    if (userId) courseData.userId = userId;
    if (departmentId) courseData.departmentId = departmentId;
    
    const response = await api.put(`/courses/${id}`, courseData);
    return response.data;
  },
  
  deleteCourse: async (id: string, userId?: string, departmentId?: string) => {
    const requestData: any = {};
    if (userId) requestData.userId = userId;
    if (departmentId) requestData.departmentId = departmentId;
    
    const response = await api.delete(`/courses/${id}`, { data: requestData });
    return response.data;
  },
  
  approveCourse: async (id: string) => {
    const response = await api.patch(`/courses/${id}/approve`);
    return response.data;
  },
  
  rejectCourse: async (id: string, reason: string) => {
    const response = await api.patch(`/courses/${id}/reject`, { reason });
    return response.data;
  },

  getFacultyCourses: async (userDepartmentId?: string, userId?: string) => {
    const params: any = {};
    if (userDepartmentId) {
      params.departmentId = userDepartmentId;
    }
    if (userId) {
      params.userId = userId;
    }
    const response = await api.get('/courses/my-courses', { params });
    return response.data;
  },

  getDepartmentCourses: async (userDepartmentId?: string) => {
    const params: any = {};
    if (userDepartmentId) {
      params.departmentId = userDepartmentId;
    }
    const response = await api.get('/courses/department-courses', { params });
    return response.data;
  },

  submitCourse: async (id: string, userId?: string, departmentId?: string) => {
    const requestData: any = {};
    if (userId) requestData.userId = userId;
    if (departmentId) requestData.departmentId = departmentId;
    
    const response = await api.patch(`/courses/${id}/submit`, requestData);
    return response.data;
  },

  publishCourse: async (id: string, userId?: string, departmentId?: string) => {
    const requestData: any = {};
    if (userId) requestData.userId = userId;
    if (departmentId) requestData.departmentId = departmentId;
    
    const response = await api.patch(`/courses/${id}/approve`, requestData);
    return response.data;
  },
};

// Departments API
export const departmentsAPI = {
  getDepartments: async (params?: any) => {
    const response = await api.get('/departments', { params });
    return response.data;
  },
  
  getDepartmentById: async (id: string) => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },
  
  createDepartment: async (data: any) => {
    const response = await api.post('/departments', data);
    return response.data;
  },
  
  updateDepartment: async (id: string, data: any) => {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
  },
  
  deleteDepartment: async (id: string) => {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
  },
};

// Degrees API
export const degreesAPI = {
  getDegrees: async (params?: any) => {
    const response = await api.get('/degrees', { params });
    return response.data;
  },
  
  getDegreeById: async (id: string) => {
    const response = await api.get(`/degrees/${id}`);
    return response.data;
  },
  
  createDegree: async (data: any) => {
    const response = await api.post('/degrees', data);
    return response.data;
  },
  
  updateDegree: async (id: string, data: any) => {
    const response = await api.put(`/degrees/${id}`, data);
    return response.data;
  },
  
  deleteDegree: async (id: string) => {
    const response = await api.delete(`/degrees/${id}`);
    return response.data;
  },
  
  getDegreesByDepartment: async (departmentId: string) => {
    const response = await api.get(`/degrees/department/${departmentId}`);
    return response.data;
  },

  getFacultyDegrees: async (userDepartmentId?: string) => {
    const params: any = {};
    if (userDepartmentId) {
      params.departmentId = userDepartmentId;
    }
    const response = await api.get('/degrees/my-degrees', { params });
    return response.data;
  },

  submitDegree: async (id: string) => {
    const response = await api.patch(`/degrees/${id}/submit`);
    return response.data;
  },

  approveDegree: async (id: string) => {
    const response = await api.patch(`/degrees/${id}/approve`);
    return response.data;
  },

  rejectDegree: async (id: string, reason: string) => {
    const response = await api.patch(`/degrees/${id}/reject`, { reason });
    return response.data;
  },
};

// Enrollments API
export const enrollmentsAPI = {
  getEnrollments: async (params?: any) => {
    const response = await api.get('/enrollments', { params });
    return response.data;
  },
  
  getEnrollmentById: async (id: string) => {
    const response = await api.get(`/enrollments/${id}`);
    return response.data;
  },
  
  createEnrollment: async (data: any) => {
    const response = await api.post('/enrollments', data);
    return response.data;
  },
  
  updateEnrollment: async (id: string, data: any) => {
    const response = await api.put(`/enrollments/${id}`, data);
    return response.data;
  },
  
  approveEnrollment: async (id: string, approverType: 'hod' | 'office') => {
    const response = await api.patch(`/enrollments/${id}/approve`, { approver_type: approverType });
    return response.data;
  },
  
  rejectEnrollment: async (id: string, reason: string) => {
    const response = await api.patch(`/enrollments/${id}/reject`, { reason });
    return response.data;
  },
};

export default api;
