import { useState, useEffect } from 'react';
import { coursesAPI, degreesAPI, messageAPI } from '../services/api';
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
  createdAt: string;
  updatedAt: string;
  department?: { name: string; code: string };
  degree?: { name: string; code: string };
  creator?: { id: string; first_name: string; last_name: string };
}

export interface Degree {
  id: string;
  name: string;
  code: string;
  status: string;
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
      const [coursesData, degreesData] = await Promise.all([
        coursesAPI.getFacultyCourses(user?.department?.id, user?.id),
        degreesAPI.getFacultyDegrees(user?.department?.id),
      ]);
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

  return { courses, degrees, loading, loadData, user };
}
