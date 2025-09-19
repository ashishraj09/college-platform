
import api from './api';

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_status: 'pending_hod_approval' | 'pending_office_approval' | 'approved' | 'rejected' | 'withdrawn';
  academic_year: string;
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
    courses_per_semester?: { [key: string]: number };
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
  academic_year: string;
  semester: number;
}

class EnrollmentAPI {
  // Get student's enrollments
  async getMyEnrollments(filters?: { academic_year?: string; status?: string }): Promise<Enrollment[]> {
    const params: any = {};
    if (filters?.academic_year) params.academic_year = filters.academic_year;
    if (filters?.status) params.status = filters.status;
    const response = await api.get('/enrollments/my-enrollments', { params });
    return response.data;
  }

  // Get student's degree courses by semester
  async getMyDegreeCourses(semester?: number): Promise<DegreeCourses> {
    const params: any = {};
    if (semester) params.semester = semester;
    const response = await api.get('/enrollments/my-degree-courses', { params });
    return response.data;
  }

  // Create enrollment request
  async createEnrollment(enrollmentData: EnrollmentRequest): Promise<{
    message: string;
    enrollments: Enrollment[];
  }> {
    const response = await api.post('/enrollments/enroll', enrollmentData);

    return response.data;
  }

  // Get all university courses organized by department
  async getUniversityCourses(departmentId?: string): Promise<UniversityDepartment[]> {
    const params: any = {};
    if (departmentId) params.department_id = departmentId;
    const response = await api.get('/enrollments/university-courses', { params });
    return response.data;
  }

  // Helper method to get current academic year
  getCurrentAcademicYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Academic year typically starts in July/August
    if (month >= 7) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  // Helper method to get current semester
  getCurrentSemester(): number {
    const now = new Date();
    const month = now.getMonth() + 1;
    
    // Assuming semester 1 is July-December, semester 2 is January-June
    return month >= 7 ? 1 : 2;
  }

  // Draft management
  async getEnrollmentDraft(): Promise<any> {
    const response = await api.get('/enrollments/draft');
    return response.data;
  }

  async saveEnrollmentDraft(courseIds: string[]): Promise<{ message: string; draft: any }> {
  const response = await api.put('/enrollments/draft', { course_ids: courseIds });
  return response.data;
  }

  async submitEnrollmentDraft(): Promise<{ message: string }> {
  const response = await api.post('/enrollments/draft/submit');
  return response.data;
  }

  // HOD approval methods
  async getPendingApprovals(params?: {
    degree_id?: string;
    semester?: string;
    search?: string;
  }): Promise<{ pendingApprovals: any[] }> {
    const response = await api.get('/enrollments/pending-approvals', { params });
    return response.data;
  }

  async hodDecision(data: {
    enrollment_ids: string[];
    action: 'approve' | 'reject';
    rejection_reason?: string;
  }): Promise<{ message: string }> {
    const response = await api.post('/enrollments/hod-decision', data);

    return response.data;
  }

  async checkActiveEnrollmentStatus(): Promise<{
    hasActiveEnrollment: boolean;
    activeEnrollments: Array<{
      id: string;
      courseId: string;
      courseName: string;
      courseCode: string;
      status: string;
      submittedAt: string;
    }>;
    count: number;
  }> {
    const response = await api.get('/enrollments/active-status');
    
    return response.data;
  }
}

const enrollmentApiInstance = new EnrollmentAPI();
export const enrollmentAPI = enrollmentApiInstance;
export default enrollmentApiInstance;
