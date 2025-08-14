// API Method Usage Guidelines
// This file documents the different approaches available for course data fetching

export interface CourseApiMethods {
  /**
   * Standard course retrieval - returns course with resolved faculty names
   * Use for: Display purposes, course details view, read-only scenarios
   * Returns: Course with faculty UUIDs resolved to human-readable names
   */
  getCourseById: (id: string) => Promise<any>;

  /**
   * Course data for editing (Query Parameter Approach)
   * Use for: Form editing, when you need UUIDs for dropdowns/selects
   * Returns: Course with faculty UUIDs intact (not resolved to names)
   * Endpoint: GET /courses/:id?resolve_names=false
   */
  getCourseForEdit: (id: string) => Promise<any>;

  /**
   * Course data for editing (Dedicated Endpoint Approach)
   * Use for: Form editing, when you prefer RESTful endpoint design
   * Returns: Course with faculty UUIDs intact (not resolved to names)  
   * Endpoint: GET /courses/:id/edit
   */
  getCourseForEditDedicated: (id: string) => Promise<any>;
}

/**
 * Usage Examples:
 * 
 * // For displaying course information
 * const course = await coursesAPI.getCourseById('123');
 * console.log(course.faculty_details.primary_instructor); // "John Smith"
 * 
 * // For editing with query parameter approach
 * const editableCourse = await coursesAPI.getCourseForEdit('123');
 * console.log(editableCourse.faculty_details.primary_instructor); // "uuid-string"
 * 
 * // For editing with dedicated endpoint approach
 * const editableCourse = await coursesAPI.getCourseForEditDedicated('123');
 * console.log(editableCourse.faculty_details.primary_instructor); // "uuid-string"
 */

export enum ApiApproach {
  QUERY_PARAMETER = 'query_parameter',
  DEDICATED_ENDPOINT = 'dedicated_endpoint'
}

export const API_PATTERNS = {
  QUERY_PARAMETER: {
    description: 'Uses query parameters to modify behavior of existing endpoint',
    pros: [
      'Fewer endpoints to maintain',
      'Single endpoint handles multiple use cases',
      'Flexible parameter-based configuration'
    ],
    cons: [
      'Less discoverable in API documentation',
      'Parameters may not be obvious to new developers'
    ],
    example: '/courses/:id?resolve_names=false'
  },
  DEDICATED_ENDPOINT: {
    description: 'Uses separate endpoints for different data representations',
    pros: [
      'Clear, semantic URL structure',
      'Self-documenting API design',
      'Follows REST conventions'
    ],
    cons: [
      'More endpoints to maintain',
      'Potential code duplication'
    ],
    example: '/courses/:id/edit'
  }
} as const;
