// Shared service types for enrollment and course-related entities

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

export interface UniversityDepartment {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
  degrees: Array<{
    id: string;
    name: string;
    code: string;
  description?: string;
    duration_years: number;
    courses_per_semester?: {
      [key: string]: {
        count: string;
        enrollment_start: string;
        enrollment_end: string;
      };
    };
    department: {
      id: string;
      name: string;
      code: string;
    };
    courses: Array<Partial<CourseWithEnrollmentStatus>>;
  }>;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_status: 'pending_approval' | 'pending_office_approval' | 'approved' | 'rejected' | 'withdrawn';
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
}

export interface EnrollmentData {
  id: string;
  student_id: string;
  enrollment_status: string;
  semester: number;
  submitted_at: string;
  course_ids: string[];
  courses: Array<{ id: string; name: string; code: string }>;
}

export interface EnrollmentResponse {
  enrollments: EnrollmentData[];
  currentSemester: number;
}
