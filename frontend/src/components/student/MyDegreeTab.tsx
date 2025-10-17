import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Paper,
  Checkbox,
  Chip,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  IconButton
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';
import { enrollmentAPI, timelineAPI } from '../../services/api';
import type { CourseWithEnrollmentStatus } from '../../services/api';
import CourseCard from '../common/CourseCard';
import TimelineDialog from '../common/TimelineDialog';
import SchoolIcon from '@mui/icons-material/School';
import HistoryIcon from '@mui/icons-material/History';
import CheckIcon from '@mui/icons-material/Check';
import InfoIcon from '@mui/icons-material/Info';
import Timeline from '@mui/icons-material/Timeline';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import EnrollIcon from '@mui/icons-material/LibraryAdd';

// Data structure for grouping courses by semester
interface SemesterData {
  [key: string]: {
    courses: CourseWithEnrollmentStatus[];
    creditTotal: number;
  };
}

// Main student degree/enrollment tab component
  const MyDegreeTab: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const hasLoadedData = useRef(false); // Prevent duplicate API calls
  // UI and data state
  const [activeTab, setActiveTab] = useState(0); // Tab selection
  const [loading, setLoading] = useState(true); // Loading spinner
  const [degreeCourses, setDegreeCourses] = useState<any>({ courses: [], degree: {}, student: {} }); // Degree/course data
  const [courseCodeMap, setCourseCodeMap] = useState<Record<string, CourseWithEnrollmentStatus>>({}); // Fast lookup for course codes
  const [currentSemesterCourses, setCurrentSemesterCourses] = useState<CourseWithEnrollmentStatus[]>([]); // Courses for current semester
  const [enrollmentInitiated, setEnrollmentInitiated] = useState(false); // Enrollment workflow started
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]); // Selected course codes
  const [currentDraft, setCurrentDraft] = useState<any>(null); // Current draft enrollment
  const [draftLoading, setDraftLoading] = useState(false); // Draft save/submit loading
  const [hasActiveEnrollment, setHasActiveEnrollment] = useState(false); // Pending enrollment exists
  const [activeEnrollments, setActiveEnrollments] = useState<any[]>([]); // All active enrollments
  const [hasDraftEnrollment, setHasDraftEnrollment] = useState(false); // Draft enrollment exists
  const [draftEnrollment, setDraftEnrollment] = useState<any>(null); // Draft enrollment object
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false); // Timeline dialog open
  const [selectedCourseForTimeline, setSelectedCourseForTimeline] = useState<any>(null); // Timeline dialog course
  const [courseTimelineData, setCourseTimelineData] = useState<any[]>([]); // Timeline events
  const [confirmationOpen, setConfirmationOpen] = useState(false); // Enrollment confirmation dialog
  const [courseRequirements, setCourseRequirements] = useState<{ [key: string]: number }>({}); // Courses required per semester

  // Get current semester for the logged-in user
  const getCurrentSemester = useCallback(() => {
    return user?.current_semester || 1;
  }, [user?.current_semester]);

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Check if enrollment window is currently open
  const isEnrollmentWindowOpen = () => {
    if (!degreeCourses.enrollment_start_at || !degreeCourses.enrollment_end_at) {
      return false;
    }
    const now = new Date();
    const startDate = new Date(degreeCourses.enrollment_start_at);
    const endDate = new Date(degreeCourses.enrollment_end_at);
    return now >= startDate && now <= endDate;
  };

  // Toggle course selection for enrollment
  const handleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(code => code !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  // Show timeline dialog for a course/enrollment
  const handleShowTimeline = async (course: any, enrollmentId?: string) => {
    setSelectedCourseForTimeline(course);
    try {
      let timelineData;
      if (enrollmentId) {
        timelineData = await timelineAPI.getTimeline('enrollment', enrollmentId);
      }
      let events = [];
      if (timelineData) {
        if (timelineData.timeline) {
          // Unified format
          events = timelineData.timeline;
        } else {
          // Legacy format: audit/messages arrays
          const audit = timelineData.audit || [];
          const messages = timelineData.messages || [];
          events = [
            ...audit.map((e: any) => ({ ...e, type: 'audit' })),
            ...messages.map((e: any) => ({ ...e, type: 'message' }))
          ];
        }
      }
      setCourseTimelineData(events);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      setCourseTimelineData([]);
      enqueueSnackbar('Failed to load timeline data', { variant: 'error' });
    } finally {
      setTimelineDialogOpen(true);
    }
  };

  // Add a previously rejected course back to selection
  const handleEditEnrollment = async (course: any) => {
    if (!selectedCourses.includes(course.id)) {
      setSelectedCourses(prev => [...prev, course.id]);
      enqueueSnackbar(`Added ${course.name} to your selection`, { variant: 'success' });
    }
  };

  // Save enrollment draft
  const handleSaveDraft = async () => {
    if (selectedCourses.length === 0) {
      enqueueSnackbar('Please select at least one course', { variant: 'warning' });
      return;
    }
    setDraftLoading(true);
    
    const response = await enrollmentAPI.saveDraft({ enrollment_id: currentDraft?.id || '', course_codes: selectedCourses });
    if (response.error) {
      enqueueSnackbar(response.error, { variant: 'error' });
      setDraftLoading(false);
      return;
    }
    
    enqueueSnackbar('Enrollment draft saved successfully', { variant: 'success' });
    if (response && response.draft) {
      setCurrentDraft(response.draft);
      setDraftEnrollment(response.draft);
      setHasDraftEnrollment(true);
      if (Array.isArray(response.draft.course_codes)) {
        setSelectedCourses(Array.from(new Set(response.draft.course_codes)));
      } else {
        setSelectedCourses([]);
      }
    }
    setDraftLoading(false);
  };

  // Open confirmation dialog for enrollment submission
  const handleSubmitEnrollment = () => {
    if (!isValidCourseSelection()) {
      enqueueSnackbar('Please correct your course selection', { variant: 'warning' });
      return;
    }
    setConfirmationOpen(true);
  };

  // Confirm and submit enrollment for approval
  const confirmSubmitEnrollment = async () => {
    setDraftLoading(true);
    
    // Always save the draft first to ensure latest course selection is persisted
    const saveResponse = await enrollmentAPI.saveDraft({ 
      enrollment_id: currentDraft?.id || '', 
      course_codes: selectedCourses 
    });
    
    if (saveResponse.error) {
      enqueueSnackbar(saveResponse.error, { variant: 'error' });
      setDraftLoading(false);
      return;
    }
    
    // Update the current draft with the saved response
    if (saveResponse && saveResponse.draft) {
      setCurrentDraft(saveResponse.draft);
    }
    
    // Now submit for approval
    const draftId = saveResponse?.draft?.id || currentDraft?.id;
    if (!draftId) {
      enqueueSnackbar('No draft ID available for submission', { variant: 'error' });
      setDraftLoading(false);
      return;
    }
    
    const submitResult = await enrollmentAPI.submitForApproval({ enrollment_id: draftId });
    if (submitResult.error) {
      enqueueSnackbar(submitResult.error, { variant: 'error' });
      setDraftLoading(false);
      return;
    }
    
    enqueueSnackbar('Enrollment submitted successfully', { variant: 'success' });
    setConfirmationOpen(false);
    setEnrollmentInitiated(false);
    setSelectedCourses([]);
    setCurrentDraft(null);
    
    // Reload enrollment data to show the pending status
    const enrollmentsData = await enrollmentAPI.getAllEnrollments();
    if (Array.isArray(enrollmentsData)) {
      setActiveEnrollments(enrollmentsData);
      
      const semester = getCurrentSemester();
      const pendingEnrollments = enrollmentsData.filter((e: any) => 
        e.semester === semester && 
        e.enrollment_status !== 'approved' && 
        e.enrollment_status !== 'draft' && 
        e.enrollment_status !== 'rejected'
      );
      
      if (pendingEnrollments.length > 0) {
        setHasActiveEnrollment(true);
        setHasDraftEnrollment(false);
        setDraftEnrollment(null);
      }
    }
    setDraftLoading(false);
  };

  // Group courses by semester (for past semesters tab)
  const groupCoursesBySemester = (courses: CourseWithEnrollmentStatus[]) => {
    const currentSemester = getCurrentSemester();
    return courses.reduce((acc: SemesterData, course) => {
      if (course.semester === currentSemester) return acc;
      const semKey = `Semester ${course.semester}`;
      if (!acc[semKey]) acc[semKey] = { courses: [], creditTotal: 0 };
      acc[semKey].courses.push(course);
      acc[semKey].creditTotal += course.credits;
      return acc;
    }, {});
  };

  // Get available courses for current semester enrollment
  const getAvailableCoursesForEnrollment = (): CourseWithEnrollmentStatus[] => {
    const currentSemester = getCurrentSemester();
    if (!Array.isArray(degreeCourses.courses)) return [];
    return degreeCourses.courses.filter((course: CourseWithEnrollmentStatus) =>
      course.semester === currentSemester &&
      !course.isEnrolled &&
      isCourseRegisterable(course, hasDraftEnrollment)
    );
  };

// Check if course is registerable for current semester
const isCourseRegisterable = (course: CourseWithEnrollmentStatus, ignoreDateCheck: boolean = false): boolean => {
  try {
    const coursesPerSem = degreeCourses.courses_per_semester || {};
    const semKey = String(course.semester);
    const semConfig = coursesPerSem[semKey];
    if (!semConfig) return false;
    
    // If we have a draft enrollment, ignore the date check to show the courses
    if (!ignoreDateCheck) {
      const start = degreeCourses.enrollment_start_at ? new Date(degreeCourses.enrollment_start_at) : null;
      const end = degreeCourses.enrollment_end_at ? new Date(degreeCourses.enrollment_end_at) : null;
      const now = new Date();
      if (start && now < start) return false;
      if (end && now > end) return false;
    }
    
    return course.semester === getCurrentSemester();
  } catch {
    return false;
  }
};

  // Get required number of courses for a semester
  const getRequiredCoursesForSemester = (semester: number): number => {
    const coursesPerSem = degreeCourses.courses_per_semester;
    if (coursesPerSem && coursesPerSem[semester]) {
      return parseInt(coursesPerSem[semester].count, 10);
    }
    return 0;
  };

  // Validate course selection for enrollment
  const isValidCourseSelection = (): boolean => {
    const currentSemester = getCurrentSemester();
    const requiredCount = getRequiredCoursesForSemester(currentSemester);
    if (requiredCount > 0) {
      return selectedCourses.length === requiredCount;
    }
    return selectedCourses.length > 0;
  };

  // Check if course can be selected (prerequisites placeholder)
  const canSelectCourse = (course: CourseWithEnrollmentStatus): boolean => {
    return course.semester === getCurrentSemester();
  };

  // Check if user has approved enrollment for current semester
  const hasApprovedEnrollment = useCallback((): boolean => {
    const currentSemester = getCurrentSemester();
    return activeEnrollments.some(
      enrollment =>
        enrollment.enrollment_status === 'approved' &&
        enrollment.semester === currentSemester
    );
  }, [activeEnrollments, getCurrentSemester]);

  // Fetch degree courses for current student
  const fetchDegreeCourses = useCallback(async () => {
    try {
      const semester = getCurrentSemester();
      let response: any = null;
      const degreeCodeCandidate = user?.degree_code || user?.degree?.code || user?.degree?.code?.toUpperCase();
      if (degreeCodeCandidate) {
        try {
          const r = await enrollmentAPI.getEnrollmentsByDegree(degreeCodeCandidate, { semester });
          if (r && 'degree' in r && r.degree && Array.isArray(r.courses)) {
            response = {
              degree: r.degree,
              courses: r.courses,
              enrollment_start_at: r.enrollment_dates?.enrollment_start,
              enrollment_end_at: r.enrollment_dates?.enrollment_end,
              courses_per_semester: {
                [semester]: { count: r.enrollment_dates?.count }
              }
            };
          }
        } catch {}
      }
      if (!response) {
        response = await enrollmentAPI.getMyDegreeCourses(semester);
      }
      setDegreeCourses(response);
      const codeMap: Record<string, CourseWithEnrollmentStatus> = {};
      (response.courses || []).forEach((course: CourseWithEnrollmentStatus) => {
        codeMap[course.code] = course;
      });
      setCourseCodeMap(codeMap);
      const currentCourses = (response.courses || []).filter(
        (course: CourseWithEnrollmentStatus) => course.semester === semester
      );
      setCurrentSemesterCourses(currentCourses);
      const requirements: { [key: string]: number } = {};
      if (response.courses_per_semester) {
        Object.entries(response.courses_per_semester).forEach(([sem, data]: [string, any]) => {
          requirements[sem] = parseInt(data.count, 10);
        });
      }
      setCourseRequirements(requirements);
    } catch {
      enqueueSnackbar('Failed to fetch courses', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, getCurrentSemester]);

  // Fetch draft enrollment
  const fetchDraft = useCallback(async () => {
    if (currentDraft) return;
    const response = await enrollmentAPI.createDraft({ course_codes: [], semester: getCurrentSemester() } as any);
    if (response.error) {
      // Silently fail - draft creation errors are not critical
      setCurrentDraft(null);
      setSelectedCourses([]);
      return;
    }
    if (response && response.draft) {
      setCurrentDraft(response.draft);
      setSelectedCourses(Array.from(new Set(response.draft.course_codes || [])));
    } else {
      setCurrentDraft(null);
      setSelectedCourses([]);
    }
  }, [currentDraft, getCurrentSemester]);

  // Check active enrollment status and update UI state
  const checkActiveEnrollmentStatus = useCallback(async () => {
    const response = await enrollmentAPI.checkActiveEnrollmentStatus();
    if (response.error) {
      // Silently fail - enrollment status check errors are handled gracefully
      return;
    }
    
    setActiveEnrollments(response.activeEnrollments || []);
    const pendingEnrollments = (response.activeEnrollments || []).filter(
      (e: any) => e.enrollment_status !== 'approved' &&
        e.enrollment_status !== 'draft' &&
        e.enrollment_status !== 'rejected'
    );
    const hasApproved = (response.activeEnrollments || []).some(
      (e: any) => e.enrollment_status === 'approved' && e.semester === getCurrentSemester()
    );
    if (pendingEnrollments.length > 0) {
      setHasActiveEnrollment(true);
      setHasDraftEnrollment(false);
      setDraftEnrollment(null);
      setEnrollmentInitiated(false);
      setSelectedCourses([]);
    } else if (response.hasDraft && response.draftEnrollment && !hasApproved) {
      setHasActiveEnrollment(false);
      setHasDraftEnrollment(true);
      setDraftEnrollment(response.draftEnrollment);
      if (response.draftEnrollment.course_codes && Array.isArray(response.draftEnrollment.course_codes)) {
        setSelectedCourses(Array.from(new Set(response.draftEnrollment.course_codes)));
      } else if (response.draftEnrollment.course_ids && Array.isArray(response.draftEnrollment.course_ids)) {
        const codes = response.draftEnrollment.course_ids
          .map((id: string) => {
            const found = Object.values(courseCodeMap).find(c => c.id === id);
            return found ? found.code : null;
          })
          .filter((code: string | null) => !!code);
        setSelectedCourses(Array.from(new Set(codes)));
      } else {
        setSelectedCourses([]);
      }
      setEnrollmentInitiated(true);
      setCurrentDraft(response.draftEnrollment);
    } else {
      setHasActiveEnrollment(false);
      setHasDraftEnrollment(false);
      setDraftEnrollment(null);
      if (hasApproved) {
        setEnrollmentInitiated(false);
        setSelectedCourses([]);
      }
    }
  }, [getCurrentSemester]);

// Initial load: fetch degree courses and enrollment status
useEffect(() => {
  // Prevent duplicate loads - but only if we've already loaded data successfully
  if (hasLoadedData.current) {
    console.log('🛑 Skipping load - data already loaded');
    return;
  }
  
  // Don't attempt to load if we don't have user data yet
  if (!user) {
    console.log('⏳ Waiting for user data...');
    return;
  }
  
  let isMounted = true;
  const loadAll = async () => {
    console.log('🚀 Loading enrollment data...');
    setLoading(true);
    try {
      const semester = getCurrentSemester();
      const degreeCodeCandidate = user?.degree_code || user?.degree?.code;
      
      console.log('📡 Calling APIs - Degree:', degreeCodeCandidate, 'Semester:', semester);
      
      // Call both APIs in parallel
      const [enrollmentsData, degreeData] = await Promise.all([
        enrollmentAPI.getAllEnrollments(),
        degreeCodeCandidate 
          ? enrollmentAPI.getEnrollmentsByDegree(degreeCodeCandidate, { semester })
          : enrollmentAPI.getMyDegreeCourses(semester)
      ]);
      
      console.log('✅ API responses received:', { enrollmentsData, degreeData });
      
      // Process degree/courses data
        if (degreeData && (degreeData as any).degree && Array.isArray((degreeData as any).courses)) {
          const processedData = {
            degree: (degreeData as any).degree,
            courses: (degreeData as any).courses,
            enrollment_start_at: (degreeData as any).enrollment_dates?.enrollment_start,
            enrollment_end_at: (degreeData as any).enrollment_dates?.enrollment_end,
            courses_per_semester: {
              [semester]: { count: (degreeData as any).enrollment_dates?.count }
            }
          };
          setDegreeCourses(processedData);
          
          // Build course code map
          const codeMap: Record<string, CourseWithEnrollmentStatus> = {};
          (degreeData as any).courses.forEach((course: CourseWithEnrollmentStatus) => {
            codeMap[course.code] = course;
          });
          setCourseCodeMap(codeMap);
          
          // Set current semester courses
          const currentCourses = (degreeData as any).courses.filter(
            (course: CourseWithEnrollmentStatus) => course.semester === semester
          );
          setCurrentSemesterCourses(currentCourses);
          
          // Set course requirements
          const requirements: { [key: string]: number } = {};
          if ((degreeData as any).enrollment_dates?.count) {
            requirements[semester] = parseInt((degreeData as any).enrollment_dates.count, 10);
          }
          setCourseRequirements(requirements);
        }
        
        // Process enrollment data
        if (Array.isArray(enrollmentsData)) {
          setActiveEnrollments(enrollmentsData);
          
          // Find draft enrollment for current semester
          const draftEnrollment = enrollmentsData.find((e: any) => e.enrollment_status === 'draft' && e.semester === semester);
          
          // Find pending enrollments (submitted but not approved/rejected)
          const pendingEnrollments = enrollmentsData.filter((e: any) => 
            e.semester === semester && 
            e.enrollment_status !== 'approved' && 
            e.enrollment_status !== 'draft' && 
            e.enrollment_status !== 'rejected'
          );
          
          // Find approved enrollment for current semester
          const approvedEnrollment = enrollmentsData.find((e: any) => 
            e.enrollment_status === 'approved' && e.semester === semester
          );
          
          if (pendingEnrollments.length > 0) {
            // Pending enrollment exists - can't modify
            setHasActiveEnrollment(true);
            setHasDraftEnrollment(false);
            setDraftEnrollment(null);
            setEnrollmentInitiated(false);
            setSelectedCourses([]);
          } else if (draftEnrollment && !approvedEnrollment) {
            // Draft exists and no approved enrollment - show it
            setHasDraftEnrollment(true);
            setEnrollmentInitiated(true);
            setCurrentDraft(draftEnrollment);
            setDraftEnrollment(draftEnrollment);
            setHasActiveEnrollment(false);
            
            // Pre-select courses from draft
            if (Array.isArray(draftEnrollment.course_codes)) {
              setSelectedCourses(Array.from(new Set(draftEnrollment.course_codes)));
            }
          } else {
            // No draft, no pending, or has approved
            setHasActiveEnrollment(false);
            setHasDraftEnrollment(false);
            setDraftEnrollment(null);
            if (approvedEnrollment) {
              setEnrollmentInitiated(false);
              setSelectedCourses([]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading enrollment data:', error);
        enqueueSnackbar('Failed to load enrollment data', { variant: 'error' });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadAll();
    return () => { isMounted = false; };
  }, [user, getCurrentSemester, enqueueSnackbar]);

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, minHeight: '300px' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
          Loading your degree information...
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          Please wait while we fetch your course enrollments
        </Typography>
      </Box>
    );
  }

  // ...existing code...

  // Main render
  return (
    <>
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="degree tabs">
          <Tab label="Current Semester" />
          <Tab label="Past Semesters" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {hasActiveEnrollment && !hasDraftEnrollment ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="warning" />
                  Pending Enrollment Requests
                </Typography>
                {activeEnrollments.filter(e => e.enrollment_status !== 'approved').length > 0 && (
                  <Button 
                    variant="text"
                    color="primary"
                    startIcon={<Timeline />}
                    sx={{ textTransform: 'none', fontWeight: 500, fontSize: 16, minWidth: 0, px: 1, mr: { sm: 2, xs: 0 }, textDecoration: 'underline' }}
                    onClick={() => {
                      const pendingEnrollment = activeEnrollments.find(e => e.enrollment_status !== 'approved');
                      if (pendingEnrollment) {
                        const courses = Array.isArray(pendingEnrollment.courses) && pendingEnrollment.courses.length > 0
                          ? pendingEnrollment.courses
                          : (pendingEnrollment.course_codes || []).map((code: string) => degreeCourses.courses?.find((c: any) => c.code === code)).filter(Boolean);
                        if (courses.length > 0) {
                          handleShowTimeline(courses[0], pendingEnrollment.id);
                        }
                      }
                    }}
                  >
                    Timeline
                  </Button>
                )}
              </Box>
              <Paper sx={{ mb: 3 }}>
                <List>
                  {activeEnrollments
                    .filter(e => e.enrollment_status !== 'approved')
                    .map((enrollment) => (
                      <React.Fragment key={enrollment.id}>
                        <ListItem divider={false}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" component="div" fontWeight="medium">
                              Enrollment ID: {enrollment.id.slice(0, 8)}
                            </Typography>
                            {/* Show submitted courses for this enrollment, aligned with Status */}
                            {Array.isArray(enrollment.courses) && enrollment.courses.length > 0 && (
                              <Box sx={{ mt: 1, mb: 2 }}>
                                <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                                  Submitted Courses:
                                </Typography>
                                <List dense>
                                  {enrollment.courses.map((course: any) => (
                                    <ListItem key={course.id}>
                                      <ListItemIcon>
                                        <CheckIcon color="primary" />
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={`${course.name} (${course.code})`}
                                        secondary={`${course.credits || 0} credits`}
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            )}
                          </Box>
                        </ListItem>
                      </React.Fragment>
                    ))}
                </List>
              </Paper>
            </>
          ) : null}
          {!isEnrollmentWindowOpen() && !hasActiveEnrollment && !hasApprovedEnrollment() && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                Enrollment Window Closed
              </Typography>
              <Typography variant="body2">
                Enrollment window is currently closed.{' '}
                {degreeCourses?.enrollment_start_at && degreeCourses?.enrollment_end_at
                  ? `You can enroll between ${new Date(degreeCourses.enrollment_start_at).toLocaleDateString()} and ${new Date(degreeCourses.enrollment_end_at).toLocaleDateString()}.`
                  : 'No enrollment period is currently scheduled for your semester.'}
              </Typography>
            </Alert>
          )}
          
          {/* Course requirement information and available courses - gated by enrollment window */}
          {enrollmentInitiated && !hasActiveEnrollment && !hasApprovedEnrollment() && isEnrollmentWindowOpen() && (() => {
            const currentSemester = getCurrentSemester();
            const requiredCount = getRequiredCoursesForSemester(currentSemester);
            const availableCourses = getAvailableCoursesForEnrollment();
            
            if (availableCourses.length === 0) {
              return (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    No courses are available for enrollment in your current semester.
                    {degreeCourses?.courses?.length === 0 ? (
                      <> There are no courses created for your degree program yet.</>
                    ) : (
                      <> You may have already enrolled in all available courses for this semester.</>
                    )}
                  </Typography>
                </Alert>
              );
            }
            
            if (requiredCount > 0) {
              return (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Semester {currentSemester} Requirements:</strong> You must select exactly {requiredCount} course(s).
                    Currently selected: {selectedCourses.length}
                  </Typography>
                </Alert>
              );
            }
            
            return (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Select the courses you want to enroll in for this semester. Currently selected: {selectedCourses.length}
                </Typography>
              </Alert>
            );
          })()}

          {/* Available Courses List */}
          {(() => {
            // Don't show available courses if there's an approved enrollment
            if (hasApprovedEnrollment()) {
              return null;
            }
            
            // Get all available courses
            const availableCourses = getAvailableCoursesForEnrollment();
            
            if (availableCourses.length === 0) {
              return (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    No courses are available for your current semester.
                    {degreeCourses?.courses?.length === 0 ? (
                      <> There are no courses created for your degree program yet.</>
                    ) : (
                      <> You may have already completed all available courses for this semester.</>
                    )}
                  </Typography>
                </Alert>
              );
            }
            
            // Determine if we should show selection checkboxes and if they should be editable
            const showCheckboxes = (enrollmentInitiated || hasDraftEnrollment) && isEnrollmentWindowOpen();
            const canEditSelection = showCheckboxes && !hasActiveEnrollment;
            
            // Don't even show enrollment controls if there's an active enrollment
            if (hasActiveEnrollment) {
              return (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    You cannot modify your course selection while you have an active enrollment pending approval.
                  </Typography>
                </Alert>
              );
            }
            
            return (
              <>
                {/* Only show rejected courses section when in enrollment mode */}
                {showCheckboxes && (() => {
                  const rejectedCourses = availableCourses.filter(course => 
                    course.enrollmentStatus === 'rejected'
                  );
                  if (rejectedCourses.length > 0) {
                    return (
                      <>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                          <EditIcon />
                          Previously Rejected Courses - Click Edit to Add Back to Selection
                        </Typography>
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }, 
                          gap: 2,
                          mb: 3
                        }}>
                          {rejectedCourses.map((course) => (
                            <CourseCard 
                              key={course.id} 
                              course={course} 
                              onShowTimeline={handleShowTimeline}
                              onEditEnrollment={handleEditEnrollment}
                              isLoading={draftLoading}
                            />
                          ))}
                        </Box>
                      </>
                    );
                  }
                  return null;
                })()}

                {/* Regular Available Courses - Show as List */}
                {(() => {
                  // Don't show available courses if there's an approved enrollment
                  if (hasApprovedEnrollment()) {
                    return null;
                  }
                  
                  // Filter out rejected courses if showing checkboxes
                  const displayCourses = showCheckboxes 
                    ? availableCourses.filter(course => course.enrollmentStatus !== 'rejected')
                    : availableCourses;
                    
                  if (displayCourses.length > 0) {
                    return (
                      <div id="course-selection-area" data-testid="available-courses">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: hasActiveEnrollment ? 0 : 0 }}>
                            <SchoolIcon />
                            Available Courses for {hasDraftEnrollment ? 'Enrollment' : 'Semester ' + getCurrentSemester()}
                          </Typography>
                          {hasDraftEnrollment && draftEnrollment && (
                            <Button 
                              variant="text"
                              color="primary"
                              startIcon={<Timeline />}
                              sx={{ textTransform: 'none', fontWeight: 500, fontSize: 16, minWidth: 0, px: 1, mr: { sm: 2, xs: 0 }, textDecoration: 'underline' }}
                              onClick={() => {
                                const courses = Array.isArray(draftEnrollment.courses) && draftEnrollment.courses.length > 0
                                  ? draftEnrollment.courses
                                  : (draftEnrollment.course_codes || []).map((code: string) => degreeCourses.courses?.find((c: any) => c.code === code)).filter(Boolean);
                                if (courses.length > 0) {
                                  handleShowTimeline(courses[0], draftEnrollment.id);
                                } else if (displayCourses.length > 0) {
                                  handleShowTimeline(displayCourses[0], draftEnrollment.id);
                                }
                              }}
                            >
                              Timeline
                            </Button>
                          )}
                        </Box>
                        <Paper sx={{ mb: 3 }}>
                          <List>
                            {displayCourses.map((course, index) => (
                              <ListItem key={course.id} divider={index < displayCourses.length - 1}>
                                {showCheckboxes && (
                                  <ListItemIcon>
                                    <Checkbox
                                      checked={selectedCourses.includes(course.code)}
                                      onChange={() => canEditSelection && handleCourseSelection(course.code)}
                                      disabled={!canEditSelection}
                                    />
                                  </ListItemIcon>
                                )}
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body1" component="div">
                                    {course.name} ({course.code})
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary" component="div">
                                    {course.credits} credits
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 1 }}>
                                    {course.overview}
                                  </Typography>
                                </Box>
                              </ListItem>
                            ))}
                          </List>
                        </Paper>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
            );
          })()}

          {/* Enrollment Action Buttons - shown for drafts and new enrollments */}
                    {/* Course Selection Actions */}
              {(
                !(enrollmentInitiated || hasDraftEnrollment)
                && isEnrollmentWindowOpen()
                && !hasApprovedEnrollment()
                && !activeEnrollments.some(e => (e.enrollment_status === 'draft' || e.enrollment_status === 'approved') && e.semester === getCurrentSemester())
              ) && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<EnrollIcon />}
                    onClick={() => setEnrollmentInitiated(true)}
                    disabled={hasActiveEnrollment}
                  >
                    Enroll in Courses
                  </Button>
                </Box>
              )}

              {(
                (enrollmentInitiated || hasDraftEnrollment)
                && isEnrollmentWindowOpen()
                && !activeEnrollments.some(e => e.enrollment_status === 'approved' && e.semester === getCurrentSemester())
              ) && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Show validation message */}
                  {selectedCourses.length > 0 && !isValidCourseSelection() && !hasActiveEnrollment && (
                    <Alert severity="warning" sx={{ flex: 1, mb: 1 }}>
                      {(() => {
                        const currentSemester = getCurrentSemester();
                        const requiredCount = getRequiredCoursesForSemester(currentSemester);
                    
                        if (requiredCount > 0) {
                          return `Semester ${currentSemester} requires exactly ${requiredCount} course(s). Selected: ${selectedCourses.length}`;
                        }
                        return 'Please select at least one course';
                      })()}
                    </Alert>
                  )}
              
                  <Button
                    onClick={handleSaveDraft}
                    variant="outlined"
                    disabled={selectedCourses.length === 0 || draftLoading || hasActiveEnrollment}
                  >
                    {draftLoading ? 'Saving...' : `Save Draft (${selectedCourses.length} courses)`}
                  </Button>
                  <Button
                    onClick={handleSubmitEnrollment}
                    variant="contained"
                    color="primary"
                    disabled={!isValidCourseSelection() || draftLoading || hasActiveEnrollment}
                  >
                    {draftLoading ? 'Submitting...' : hasDraftEnrollment 
                      ? 'Submit Enrollment' 
                      : 'Submit Enrollment for Approval'
                    }
                  </Button>
                  {!hasDraftEnrollment && (
                    <Button
                      onClick={() => setEnrollmentInitiated(false)}
                      color="inherit"
                      disabled={draftLoading || hasActiveEnrollment}
                    >
                      Cancel
                    </Button>
                  )}
                </Box>
              )}

          {/* Divider */}
          <Divider sx={{ my: 4 }} />

          {/* Current Semester Enrolled Courses */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon />
              Enrolled Courses for Semester {getCurrentSemester()}
            </Typography>
            {activeEnrollments.some(enrollment => enrollment.enrollment_status === 'approved' && enrollment.semester === getCurrentSemester()) && (
              <Button 
                variant="text"
                color="primary"
                startIcon={<Timeline />}
                sx={{ textTransform: 'none', fontWeight: 500, fontSize: 16, minWidth: 0, px: 1, mr: { sm: 2, xs: 0 }, textDecoration: 'underline' }}
                onClick={() => {
                  // Get the first approved enrollment's first course to show the timeline
                  const approvedEnrollment = activeEnrollments.find(e => e.enrollment_status === 'approved' && e.semester === getCurrentSemester());
                  let courseToShow = null;
                  if (approvedEnrollment) {
                    // If enrollment.courses is missing or incomplete, combine with degreeCourses.courses
                    let courses = Array.isArray(approvedEnrollment.courses) && approvedEnrollment.courses.length > 0
                      ? approvedEnrollment.courses
                      : (approvedEnrollment.course_codes || []).map((code: string) => degreeCourses.courses.find((c: any) => c.code === code)).filter(Boolean);
                    if (courses.length > 0) {
                      courseToShow = courses[0];
                      handleShowTimeline(courseToShow, approvedEnrollment.id);
                    }
                  }
                }}
              >
                Timeline
              </Button>
            )}
          </Box>

          {/* Check for approved enrollments for current semester only */}
          {activeEnrollments.some(enrollment => enrollment.enrollment_status === 'approved' && enrollment.semester === getCurrentSemester()) ? (
            <Paper sx={{ mb: 3 }}>
              <List>
                {activeEnrollments
                  .filter(enrollment => enrollment.enrollment_status === 'approved' && enrollment.semester === getCurrentSemester())
                  .flatMap(enrollment => {
                    if (Array.isArray(enrollment.courses) && enrollment.courses.length > 0) {
                      return enrollment.courses;
                    }
                    if (Array.isArray(enrollment.course_codes) && enrollment.course_codes.length > 0) {
                      return enrollment.course_codes
                        .map((code: string) => degreeCourses.courses.find((c: any) => c.code === code))
                        .filter(Boolean);
                    }
                    return [];
                  })
                  .map((course, index, arr) => (
                    <ListItem 
                      key={course.id}
                      divider={index < arr.length - 1}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" component="div">
                          {course.name} ({course.code})
                        </Typography>
                        <Typography variant="body2" color="textSecondary" component="div">
                          {course.credits || 0} credits
                        </Typography>
                        {course.overview && (
                          <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 1 }}>
                            {course.overview}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ ml: 2 }}>
                        <IconButton edge="end" aria-label="view details" onClick={() => handleShowTimeline(course)}>
                          <InfoIcon />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))
                }
              </List>
            </Paper>
          ) : currentSemesterCourses.filter(course => course.isEnrolled).length > 0 ? (
            <Paper sx={{ mb: 3 }}>
              <List>
                {currentSemesterCourses
                  .filter(course => course.isEnrolled)
                  .map((course, index) => (
                    <ListItem 
                      key={course.id}
                      divider={index < currentSemesterCourses.filter(c => c.isEnrolled).length - 1}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" component="div">
                          {course.name} ({course.code})
                        </Typography>
                        <Typography variant="body2" color="textSecondary" component="div">
                          {course.credits || 0} credits
                        </Typography>
                        <Typography variant="body2" color="textSecondary" component="div">
                          Status: active
                        </Typography>
                        {course.overview && (
                          <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 1 }}>
                            {course.overview}
                          </Typography>
                        )}
                      </Box>
                    </ListItem>
                  ))
                }
              </List>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <Alert severity="info" sx={{ mb: 3, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                <Typography variant="body1" gutterBottom align="center" sx={{ width: '100%' }}>
                  No Enrollment
                </Typography>
                <Typography variant="body2" align="center" sx={{ width: '100%' }}>
                  You are not enrolled in any courses for semester {getCurrentSemester()} yet.
                </Typography>
              </Alert>
            </Box>
          )}
        </Box>
      )}

      {/* Past Semesters Tab */}
      {activeTab === 1 && (
        <Box>
          {activeEnrollments.filter(e => e.enrollment_status === 'approved' && e.semester !== getCurrentSemester()).length > 0 ? (
            activeEnrollments
              .filter(e => e.enrollment_status === 'approved' && e.semester !== getCurrentSemester())
              .sort((a, b) => b.semester - a.semester)
              .map((enrollment) => {
                const enrolledCourses = enrollment.courses || [];
                return (
                  <Box key={enrollment.id} sx={{ mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon />
                        Semester {enrollment.semester}
                        <Chip label={enrolledCourses.length} size="small" color="success" sx={{ ml: 2 }} />
                      </Typography>
                      <Button 
                        variant="text"
                        color="primary"
                        startIcon={<Timeline />}
                        sx={{ textTransform: 'none', fontWeight: 500, fontSize: 16, minWidth: 0, px: 1, mr: { sm: 2, xs: 0 }, textDecoration: 'underline' }}
                        onClick={() => handleShowTimeline(enrolledCourses[0], enrollment.id)}
                        disabled={enrolledCourses.length === 0}
                      >
                        Timeline
                      </Button>
                    </Box>
                    <Paper sx={{ mb: 3 }}>
                      <List>
                        {enrolledCourses.map((course: any, index: number) => (
                          <ListItem key={course.id} divider={index < enrolledCourses.length - 1}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1" component="div">
                                {course.name} ({course.code})
                              </Typography>
                              <Typography variant="body2" color="textSecondary" component="div">
                                {course.credits || 0} credits
                              </Typography>
                              {course.overview && (
                                <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 1 }}>
                                  {course.overview}
                                </Typography>
                              )}
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Box>
                );
              })
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <Alert severity="info" sx={{ mb: 3, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                <Typography variant="body1" gutterBottom align="center" sx={{ width: '100%' }}>
                  No past enrollments found.
                </Typography>
                <Typography variant="body2" align="center" sx={{ width: '100%' }}>
                  You have not enrolled in any courses for past semesters yet.
                </Typography>
              </Alert>
            </Box>
          )}
        </Box>
      )}

      {/* Course Timeline Dialog */}
      <TimelineDialog 
        open={timelineDialogOpen}
        onClose={() => setTimelineDialogOpen(false)}
        events={courseTimelineData}
        entityName={(() => {
          if (selectedCourseForTimeline && selectedCourseForTimeline.enrollment_id) {
            return `Timeline for Enrollment #${selectedCourseForTimeline.enrollment_id}`;
          }
          return 'Timeline for Enrollment';
        })()}
      />

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
      >
        <DialogTitle>Confirm Enrollment Submission</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to submit your enrollment request for approval. Once submitted, you cannot modify your course selection until it is approved or rejected.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Selected Courses ({selectedCourses.length}):</Typography>
            <List dense>
              {selectedCourses.map(courseCode => {
                const course = courseCodeMap[courseCode];
                return course ? (
                  <ListItem key={courseCode}>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${course.name} (${course.code})`}
                      secondary={`${course.credits} credits`}
                    />
                  </ListItem>
                ) : null;
              })}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmationOpen(false)} disabled={draftLoading}>
            Cancel
          </Button>
          <Button 
            onClick={confirmSubmitEnrollment} 
            color="primary" 
            variant="contained"
            disabled={draftLoading}
          >
            {draftLoading ? 'Submitting...' : 'Confirm Submission'}
          </Button>
        </DialogActions>
      </Dialog>
  </>
  );
};

export default MyDegreeTab;