
import api from './api';
import { enrollmentAPI as centralEnrollmentAPI, enrollmentsAPI as centralEnrollmentsAPI, coursesAPI, departmentsAPI } from './api';

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

// Proxy object that delegates to the centralized APIs in src/services/api.ts
export const enrollmentAPI = {
  // Student-facing methods (delegates to enrollmentAPI in services/api.ts)
  getAvailableCourses: (semester?: number) => coursesAPI.getAvailableCourses(semester),
  getAllEnrollments: () => centralEnrollmentAPI.getAllEnrollments(),
  createDraft: (payload: { course_codes: string[]; semester: number; degree_code: string; department_code: string }) => centralEnrollmentAPI.createDraft(payload),
  saveDraft: (payload: { enrollment_id: string; course_codes: string[] }) => centralEnrollmentAPI.saveDraft(payload),
  submitForApproval: (payload: { enrollment_id: string }) => centralEnrollmentAPI.submitForApproval(payload),
  getMyDegreeCourses: (params?: any) => centralEnrollmentAPI.getMyDegreeCourses(params),
  checkActiveEnrollmentStatus: () => centralEnrollmentAPI.checkActiveEnrollmentStatus(),

  // HOD/admin methods (delegates to enrollmentAPI)
  getPendingApprovals: (params?: any) => centralEnrollmentAPI.getPendingApprovals(params),
  approveEnrollments: (payload: { enrollment_ids: string[] }) => centralEnrollmentAPI.approveEnrollments(payload),
  rejectEnrollments: (payload: { enrollment_ids: string[]; rejection_reason: string }) => centralEnrollmentAPI.rejectEnrollments(payload),
  approveEnrollment: (enrollmentId: string) => centralEnrollmentAPI.approveEnrollment(enrollmentId),
  rejectEnrollment: (enrollmentId: string, rejectionReason: string) => centralEnrollmentAPI.rejectEnrollment(enrollmentId, rejectionReason),

  // Compatibility wrappers expected by older components
  hodDecision: (payload: { enrollment_ids: string[]; action: 'approve' | 'reject'; rejection_reason?: string }) => {
    // The centralized enrollmentsAPI exposes hodDecision which expects this payload
    return centralEnrollmentsAPI.hodDecision ? centralEnrollmentsAPI.hodDecision(payload) : Promise.reject(new Error('hodDecision not implemented'));
  },

  getEnrollmentDraft: () => {
    // enrollmentAPI.getEnrollmentDraft isn't available; emulate via enrollmentsAPI endpoints if present
    if (centralEnrollmentsAPI && (centralEnrollmentsAPI as any).getEnrollments) {
      return (async () => {
        try {
          const drafts = await (centralEnrollmentsAPI as any).getEnrollments({ status: 'draft' });
          if (Array.isArray(drafts) && drafts.length > 0) return { exists: true, draft: drafts[0] };
          return { exists: false };
        } catch (err) {
          return { exists: false };
        }
      })();
    }
    return Promise.resolve({ exists: false });
  },

  saveEnrollmentDraft: (courseIds: string[]) => {
    // Map to new saveDraft signature which expects { enrollment_id, course_codes }
    // If there is no enrollment_id available, call saveDraft with empty enrollment_id and course_codes
    return centralEnrollmentAPI.saveDraft ? centralEnrollmentAPI.saveDraft({ enrollment_id: '', course_codes: courseIds }) : Promise.reject(new Error('saveDraft not available'));
  },

  submitEnrollmentDraft: () => {
    return centralEnrollmentAPI.submitForApproval ? centralEnrollmentAPI.submitForApproval({ enrollment_id: '' }) : Promise.reject(new Error('submitForApproval not available'));
  },

  // Additional server-side enrollment utilities (delegate to enrollmentsAPI where appropriate)
  createEnrollment: (payload: any) => centralEnrollmentsAPI.createEnrollment ? centralEnrollmentsAPI.createEnrollment(payload) : Promise.reject(new Error('createEnrollment not available')),
  getUniversityCourses: async (departmentId?: string) => {
    // Compose departments + department courses into the UniversityDepartment shape expected by UI
    const params = departmentId ? { departmentId } : undefined;
    const departments = await departmentsAPI.getDepartments(params ? { status: 'active' } : undefined);
    // If a departmentId filter is provided, filter locally
    const filtered = departmentId ? departments.filter((d: any) => d.id === departmentId) : departments;

    // For each department, fetch its active degrees and courses via coursesAPI.getDepartmentCourses
    const results: any[] = [];
    for (const dept of filtered) {
      const deptCourses = await coursesAPI.getDepartmentCourses({ departmentId: dept.id });
      // The coursesAPI returns a flat list of courses; group them by degree if degree info exists
      // We'll try to assemble degrees by degree.code if present, else return a single degree container
      const degreesMap: Record<string, any> = {};
      for (const course of deptCourses) {
        const degreeCode = course.degree?.code || 'unknown';
        if (!degreesMap[degreeCode]) {
          degreesMap[degreeCode] = {
            id: course.degree?.id || degreeCode,
            name: course.degree?.name || 'General',
            code: degreeCode,
            duration_years: course.degree?.duration_years || 0,
            courses: [],
          };
        }
        degreesMap[degreeCode].courses.push(course);
      }

      const degrees = Object.values(degreesMap);
      results.push({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        status: dept.status,
        degrees,
      });
    }
    return results;
  },
};

export default enrollmentAPI;
