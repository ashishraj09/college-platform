import { useState, useEffect } from 'react';
import { coursesAPI, degreesAPI } from '../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';

export interface Course {
  id: string;
  name: string;
  code: string;
  version_code?: string;
  overview: string;
  credits: number;
  semester: number;
  status: string;
  is_elective: boolean;
  rejection_reason?: string;
  version: number;
  parent_course_id?: string;
  is_latest_version: boolean;
  hasNewPendingVersion?: boolean;
  createdAt: string;
  updatedAt: string;
  department?: { name: string; code: string; id: string };
  degree?: { name: string; code: string };
  creator?: { id: string; first_name: string; last_name: string };
  created_by?: string;
  department_id?: string;
}

export interface Degree {
  id: string;
  name: string;
  code: string;
  status: string;
  hasNewPendingVersion?: boolean;
  department?: { name: string; code: string };
  rejection_reason?: string;
  createdAt: string;
  updatedAt: string;
}

export function useFacultyDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('useFacultyDashboard: Loading data for user:', {
        id: user?.id,
        department_id: user?.department?.id,
        is_head_of_department: user?.is_head_of_department
      });
      
      const [coursesData, degreesData] = await Promise.all([
        coursesAPI.getFacultyCourses(user?.department?.id, user?.id),
        degreesAPI.getFacultyDegrees(user?.department?.id),
      ]);
      
      console.log('useFacultyDashboard: Received courses data:', 
        coursesData?.all ? `${coursesData.all.length} courses` : 'No courses found');
      
      setCourses(coursesData?.all || coursesData || []);
      let degrees = [];
      if (degreesData?.all) degrees = degreesData.all;
      else if (Array.isArray(degreesData)) degrees = degreesData;
      else if (degreesData?.data) degrees = Array.isArray(degreesData.data) ? degreesData.data : degreesData.data.all || [];
      setDegrees(degrees);
    } catch (error) {
      enqueueSnackbar('Error loading data. Please try again.', { variant: 'error' });
      setCourses([]);
      setDegrees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Add debug logging for loaded courses
  useEffect(() => {
    if (courses.length > 0) {
      console.log(`useFacultyDashboard: Loaded ${courses.length} courses`);
      // Check if all courses have the same creator
      const creatorIds = new Set(courses.map(c => c.creator?.id || c.created_by));
      console.log('Creator IDs found in courses:', Array.from(creatorIds));
      
      // Log first course as sample
      console.log('Sample course:', {
        name: courses[0]?.name,
        created_by: courses[0]?.created_by,
        creator: courses[0]?.creator?.id,
        user_id: user?.id
      });
    }
  }, [courses, user]);

  return { courses, degrees, loading, loadData, user };
}
