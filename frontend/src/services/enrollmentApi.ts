const API_BASE_URL = 'http://localhost:3001/api';

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
    const params = new URLSearchParams();
    if (filters?.academic_year) params.append('academic_year', filters.academic_year);
    if (filters?.status) params.append('status', filters.status);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/enrollments/my-enrollments${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch enrollments: ${response.statusText}`);
    }
    return response.json();
  }

  // Get student's degree courses by semester
  async getMyDegreeCourses(semester?: number): Promise<DegreeCourses> {
    const params = new URLSearchParams();
    if (semester) params.append('semester', semester.toString());
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/enrollments/my-degree-courses${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch degree courses: ${response.statusText}`);
    }
    return response.json();
  }

  // Create enrollment request
  async createEnrollment(enrollmentData: EnrollmentRequest): Promise<{
    message: string;
    enrollments: Enrollment[];
  }> {
    const response = await fetch(`${API_BASE_URL}/enrollments/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrollmentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to create enrollment: ${response.statusText}`);
    }
    return response.json();
  }

  // Get all university courses organized by department
  async getUniversityCourses(departmentId?: string): Promise<UniversityDepartment[]> {
    const params = new URLSearchParams();
    if (departmentId) params.append('department_id', departmentId);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/enrollments/university-courses${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch university courses: ${response.statusText}`);
    }
    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/enrollments/draft`);
    if (!response.ok) {
      throw new Error('Failed to fetch enrollment draft');
    }
    return response.json();
  }

  async saveEnrollmentDraft(courseIds: string[]): Promise<{ message: string; draft: any }> {
    const response = await fetch(`${API_BASE_URL}/enrollments/draft`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        course_ids: courseIds,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save enrollment draft');
    }

    return response.json();
  }

  async submitEnrollmentDraft(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/enrollments/draft/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit enrollment draft');
    }

    return response.json();
  }

  // HOD approval methods
  async getPendingApprovals(params?: {
    degree_id?: string;
    semester?: string;
    search?: string;
  }): Promise<{ pendingApprovals: any[] }> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const response = await fetch(`${API_BASE_URL}/enrollments/pending-approvals${queryString ? `?${queryString}` : ''}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch pending approvals');
    }
    return response.json();
  }

  async hodDecision(data: {
    enrollment_ids: string[];
    action: 'approve' | 'reject';
    rejection_reason?: string;
  }): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/enrollments/hod-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process HOD decision');
    }

    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/enrollments/active-status`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check active enrollment status');
    }

    return response.json();
  }
}

const enrollmentApiInstance = new EnrollmentAPI();
export const enrollmentAPI = enrollmentApiInstance;
export default enrollmentApiInstance;
