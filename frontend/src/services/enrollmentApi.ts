
import api from './api';

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_status: 'pending_hod_approval' | 'pending_office_approval' | 'approved' | 'rejected' | 'withdrawn';
  semester: number;
  rejection_reason?: string;
  grade?: string;
  grade_points?: number;
  hod_approved_at?: string;
  office_approved_at?: string;
  createdAt: string;
  updatedAt: string;
  course: {
    id: string;
    name: string;
    code: string;
    credits: number;
    semester: number;
    overview: string;
    status: string;
    department: {
      id: string;
      name: string;
      code: string;
    };
    degree: {
      id: string;
      name: string;
      code: string;
    };
  };
  hodApprover?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  officeApprover?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface CourseWithEnrollmentStatus {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  overview: string;
  max_students?: number;
  prerequisites: string[];
  is_elective: boolean;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  department: {
    id: string;
    name: string;
    code: string;
  };
  degree: {
    id: string;
    name: string;
    code: string;
  };
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  isEnrolled: boolean;
  enrollmentStatus?: string;
  rejectionReason?: string;
  conversationMessages?: string;
  hodApprovedAt?: string;
  officeApprovedAt?: string;
}

export interface DegreeCourses {
  degree: {
    id: string;
    name: string;
    code: string;
    duration_years: number;
    courses_per_semester?: { 
      [key: string]: { 
        count: string; 
        enrollment_start: string;
        enrollment_end: string;
      } 
    };
    department: {
      id: string;
      name: string;
      code: string;
    };
  };
  student: {
    current_semester: number;
    enrolled_year: number;
  };
  courses: CourseWithEnrollmentStatus[];
  enrollment_start_at?: string;
  enrollment_end_at?: string;
}

export interface UniversityDepartment {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
  degrees: {
    id: string;
    name: string;
    code: string;
    duration_years: number;
    description?: string;
    status: string;
    courses: {
      id: string;
      name: string;
      code: string;
      credits: number;
      semester: number;
      overview: string;
      max_students?: number;
      prerequisites: string[];
      is_elective: boolean;
      status: string;
      creator: {
        id: string;
        first_name: string;
        last_name: string;
      };
    }[];
  }[];
}

export interface EnrollmentRequest {
  course_ids: string[];
  semester: number;
}

export interface EnrollmentData {
  id: string;
  student_id: string;
  enrollment_status: string;
  semester: number;
  submitted_at: string;
  is_submitted?: boolean;
  course_ids: string[];
  courses: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

export interface EnrollmentResponse {
  enrollments: EnrollmentData[];
  currentSemester: number;
}

class EnrollmentAPI {
  private enrollmentData: EnrollmentResponse | null = null;
  private lastFetchTime: number = 0;
  private fetchPromise: Promise<EnrollmentResponse> | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  // Central method to fetch all enrollment data
  async fetchEnrollmentData(forceRefresh = false): Promise<EnrollmentResponse> {
    const now = Date.now();
    
    // Use cached data if available and not expired, unless force refresh is requested
    if (
      !forceRefresh && 
      this.enrollmentData && 
      now - this.lastFetchTime < this.CACHE_DURATION
    ) {
      return this.enrollmentData;
    }
    
    // If a fetch is already in progress, return that promise to avoid duplicate requests
    if (this.fetchPromise) {
      return this.fetchPromise;
    }
    
    // Make the API call
    const fetchOperation = async (): Promise<EnrollmentResponse> => {
      const response = await api.get('/enrollments');
      const data: EnrollmentResponse = response.data;
      this.enrollmentData = data;
      this.lastFetchTime = now;
      return data;
    };
    
    this.fetchPromise = fetchOperation();
    
    try {
      return await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  // Get all enrollments with filtering options
  async getAllEnrollments(params?: {
    status?: string | string[];
    semester?: number;
    student_id?: string;
  }): Promise<EnrollmentResponse> {
    // If no params, use the cached data
    if (!params || Object.keys(params).length === 0) {
      return this.fetchEnrollmentData();
    }
    
    // Otherwise, make a direct API call with the filters
    const processedParams: Record<string, string | number> = {};
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // Convert array parameters to comma-separated strings
        if (Array.isArray(value)) {
          processedParams[key] = value.join(',');
        } else {
          processedParams[key] = value;
        }
      });
    }
    
    const response = await api.get('/enrollments', { params: processedParams });
    return response.data;
  }

  // Get student's enrollments with filtering options
  async getMyEnrollments(params?: {
    status?: string | string[];
    semester?: number;
  }): Promise<{
    enrollments: EnrollmentData[];
    count: number;
    hasActiveEnrollment: boolean;
  }> {
    // Use the centralized method if no specific filters
    if (!params || Object.keys(params).length === 0) {
      const data = await this.fetchEnrollmentData();
      
      // Calculate derived values locally
      const activeEnrollments = data.enrollments.filter(
        e => e.enrollment_status !== 'draft' && e.enrollment_status !== 'rejected'
      );
      
      return {
        enrollments: data.enrollments,
        count: data.enrollments.length,
        hasActiveEnrollment: activeEnrollments.length > 0
      };
    }
    
    // Otherwise use the getAllEnrollments with filters
    const response = await this.getAllEnrollments(params);
    
    // Calculate derived values locally
    const activeEnrollments = response.enrollments.filter(
      e => e.enrollment_status !== 'draft' && e.enrollment_status !== 'rejected'
    );
    
    return {
      enrollments: response.enrollments,
      count: response.enrollments.length,
      hasActiveEnrollment: activeEnrollments.length > 0
    };
  }

  // Cache for my degree courses data
  private myDegreeCoursesCache: { [semester: string]: any } = {};
  private myDegreeCoursesCacheTime: { [semester: string]: number } = {};

  // Get student's degree courses by semester
  async getMyDegreeCourses(semester?: number): Promise<DegreeCourses> {
    const semKey = String(semester || 'all');
    const now = Date.now();
    
    // Use cached data if available and not expired
    if (
      this.myDegreeCoursesCache[semKey] &&
      this.myDegreeCoursesCacheTime[semKey] &&
      now - this.myDegreeCoursesCacheTime[semKey] < this.CACHE_DURATION
    ) {
      return this.myDegreeCoursesCache[semKey];
    }
    
    const params: any = {};
    if (semester) params.semester = semester;
    const response = await api.get('/enrollments/my-degree-courses', { params });
    
    // Cache the response
    this.myDegreeCoursesCache[semKey] = response.data;
    this.myDegreeCoursesCacheTime[semKey] = now;
    
    return response.data;
  }

  // Helper method to invalidate cache after mutations
  invalidateCache(): void {
    this.enrollmentData = null;
    this.lastFetchTime = 0;
    this.myDegreeCoursesCache = {};
    this.myDegreeCoursesCacheTime = {};
  }

  // Create enrollment request
  async createEnrollment(enrollmentData: EnrollmentRequest): Promise<{
    message: string;
    enrollments: Enrollment[];
  }> {
    const response = await api.post('/enrollments/enroll', enrollmentData);
    this.invalidateCache();
    return response.data;
  }

  // Get all university courses organized by department
  async getUniversityCourses(departmentId?: string): Promise<UniversityDepartment[]> {
    const params: any = {};
    if (departmentId) params.department_id = departmentId;
    const response = await api.get('/enrollments/university-courses', { params });
    return response.data;
  }

  // Helper method to get current semester
  getCurrentSemester(): number {
    const now = new Date();
    const month = now.getMonth() + 1;
    
    // Assuming semester 1 is July-December, semester 2 is January-June
    return month >= 7 ? 1 : 2;
  }
  
  // Public method to force refresh the enrollment data
  async refreshEnrollmentData(): Promise<EnrollmentResponse> {
    return this.fetchEnrollmentData(true);
  }

  // Draft management
  async getEnrollmentDraft(): Promise<{ exists: boolean; draft?: EnrollmentData; message?: string }> {
    try {
      // Use the cached data when possible
      const data = await this.fetchEnrollmentData();
      
      // Find draft enrollment for current semester
      const currentSemester = this.getCurrentSemester();
      
      const draft = data.enrollments.find(e => 
        e.enrollment_status === 'draft' && 
        e.semester === currentSemester
      );
      
      if (draft) {
        return { 
          exists: true, 
          draft 
        };
      } else {
        return { 
          exists: false, 
          message: 'No draft exists yet' 
        };
      }
    } catch (error) {
      console.error('Error getting enrollment draft:', error);
      return { 
        exists: false, 
        message: 'Error fetching draft' 
      };
    }
  }

  async saveEnrollmentDraft(courseIds: string[]): Promise<{ message: string; draft: any }> {
    const response = await api.put('/enrollments/draft', { course_ids: courseIds });
    this.invalidateCache();
    return response.data;
  }

  async submitEnrollmentDraft(): Promise<{ message: string }> {
    const response = await api.post('/enrollments/draft/submit');
    this.invalidateCache();
    return response.data;
  }

  // HOD approval methods
  async getPendingApprovals(params?: {
    degree_id?: string;
    semester?: string;
    search?: string;
  }): Promise<{ pendingApprovals: EnrollmentData[] }> {
    try {
      // Always use the direct API call to ensure proper filtering
      const response = await api.get('/enrollments-hod/pending-approvals', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      return { pendingApprovals: [] };
    }
  }

  async hodDecision(data: {
    enrollment_ids: string[];
    action: 'approve' | 'reject';
    rejection_reason?: string;
  }): Promise<{ message: string }> {
    const response = await api.post('/enrollments-hod/hod-decision', data);
    this.invalidateCache();
    return response.data;
  }

  async checkActiveEnrollmentStatus(): Promise<{
    hasActiveEnrollment: boolean;
    activeEnrollments: EnrollmentData[];
    hasDraft: boolean;
    draftEnrollment: EnrollmentData | null;
  }> {
    try {
      // Use the cached data
      const data = await this.fetchEnrollmentData();
      
      // Get current semester from data
      const currentSemester = data.currentSemester || 1;
      
      // Filter enrollments for the current semester
      const currentSemesterEnrollments = data.enrollments.filter(
        enrollment => enrollment.semester === currentSemester
      );
      
      // Get active enrollments (in approval pipeline)
      // These are enrollments that are not drafts, rejected, or cancelled
      const activeEnrollments = currentSemesterEnrollments.filter(
        enrollment => 
          enrollment.enrollment_status !== 'draft' && 
          enrollment.enrollment_status !== 'rejected' &&
          enrollment.enrollment_status !== 'cancelled'
          // Important: Do NOT filter out approved enrollments, as we need them
          // for the hasApprovedEnrollment check in the UI
      );
      
      // Get pending enrollments (not approved or rejected yet)
      const pendingEnrollments = activeEnrollments.filter(
        enrollment => enrollment.enrollment_status !== 'approved'
      );
      
      // Check for draft enrollments
      const draftEnrollments = currentSemesterEnrollments.filter(
        enrollment => enrollment.enrollment_status === 'draft'
      );
      
      return {
        // Only return hasActiveEnrollment: true when there are pending enrollments
        // (not drafts, not approved)
        hasActiveEnrollment: pendingEnrollments.length > 0,
        // Return all active enrollments including approved ones for UI filtering
        activeEnrollments,
        hasDraft: draftEnrollments.length > 0,
        draftEnrollment: draftEnrollments.length > 0 ? draftEnrollments[0] : null
      };
    } catch (error) {
      console.error('Error checking active enrollment status:', error);
      return {
        hasActiveEnrollment: false,
        activeEnrollments: [],
        hasDraft: false,
        draftEnrollment: null
      };
    }
  }
  
  // Helper methods for enrollment approvals
  async approveEnrollments(data: {
    enrollment_ids: string[];
  }): Promise<{ message: string }> {
    return this.hodDecision({
      enrollment_ids: data.enrollment_ids,
      action: 'approve'
    });
  }
  
  async rejectEnrollments(data: {
    enrollment_ids: string[];
    rejection_reason: string;
  }): Promise<{ message: string }> {
    return this.hodDecision({
      enrollment_ids: data.enrollment_ids,
      action: 'reject',
      rejection_reason: data.rejection_reason
    });
  }
}

const enrollmentApiInstance = new EnrollmentAPI();
export const enrollmentAPI = enrollmentApiInstance;
export default enrollmentApiInstance;
