import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Tabs, 
  Tab, 
  Paper, 
  Checkbox, 
  FormControlLabel, 
  Grid, 
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
import { enrollmentAPI } from '../../services/api';
import { coursesAPI, timelineAPI } from '../../services/api';
import type { CourseWithEnrollmentStatus } from '../../services/api';
import CourseCard from '../common/CourseCard';
import CourseTimelineDialog from '../common/CourseTimelineDialog';
import { formatEnrollmentStatus } from '../../utils/formatters';

// Icons
import SchoolIcon from '@mui/icons-material/School';
import HistoryIcon from '@mui/icons-material/History';
import CheckIcon from '@mui/icons-material/Check';
import InfoIcon from '@mui/icons-material/Info';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import EventIcon from '@mui/icons-material/Event';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import HourglassFullIcon from '@mui/icons-material/HourglassFull';
import EnrollIcon from '@mui/icons-material/LibraryAdd';
import ArticleIcon from '@mui/icons-material/Article';

interface SemesterData {
  [key: string]: {
    courses: CourseWithEnrollmentStatus[];
    creditTotal: number;
  };
}

const MyDegreeTab: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [degreeCourses, setDegreeCourses] = useState<any>({ courses: [], degree: {}, student: {} });
  // Centralized course code map for fast lookup
  const [courseCodeMap, setCourseCodeMap] = useState<Record<string, CourseWithEnrollmentStatus>>({});
  const [currentSemesterCourses, setCurrentSemesterCourses] = useState<CourseWithEnrollmentStatus[]>([]);
  const [pastSemesterCourses, setPastSemesterCourses] = useState<SemesterData>({});
  const [enrollmentInitiated, setEnrollmentInitiated] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [currentDraft, setCurrentDraft] = useState<any>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [hasActiveEnrollment, setHasActiveEnrollment] = useState(false);
  const [activeEnrollments, setActiveEnrollments] = useState<any[]>([]);
  const [hasDraftEnrollment, setHasDraftEnrollment] = useState(false);
  const [draftEnrollment, setDraftEnrollment] = useState<any>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [selectedCourseForTimeline, setSelectedCourseForTimeline] = useState<any>(null);
  const [courseTimelineData, setCourseTimelineData] = useState<any[]>([]);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [courseRequirements, setCourseRequirements] = useState<{ [key: string]: number }>({});

  const getCurrentSemester = useCallback(() => {
    return user?.current_semester || 1;
  }, [user?.current_semester]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const isEnrollmentWindowOpen = () => {
    if (!degreeCourses.enrollment_start_at || !degreeCourses.enrollment_end_at) {
      return false;
    }

    const now = new Date();
    const startDate = new Date(degreeCourses.enrollment_start_at);
    const endDate = new Date(degreeCourses.enrollment_end_at);
    
    return now >= startDate && now <= endDate;
  };

  const handleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(code => code !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  const handleShowTimeline = async (course: any, enrollmentId?: string) => {
    setSelectedCourseForTimeline(course);
    
    try {
      // First try to get timeline for the enrollment if an enrollmentId is provided
      if (enrollmentId) {
        const timelineData = await timelineAPI.getTimeline('enrollment', enrollmentId);
        if (timelineData && timelineData.timeline) {
          setCourseTimelineData(timelineData.timeline);
        } else {
          setCourseTimelineData([]);
        }
      } 
      // If no enrollment ID or the above fails, try to get timeline for the course
      else {
        const timelineData = await timelineAPI.getTimeline('course', course.id);
        if (timelineData && timelineData.timeline) {
          setCourseTimelineData(timelineData.timeline);
        } else {
          setCourseTimelineData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching timeline data:', error);
      setCourseTimelineData([]);
      enqueueSnackbar('Failed to load timeline data', { variant: 'error' });
    } finally {
      setTimelineDialogOpen(true);
    }
  };

  const handleEditEnrollment = async (course: any) => {
    // Add the previously rejected course to the selection
    if (!selectedCourses.includes(course.id)) {
      setSelectedCourses(prev => [...prev, course.id]);
      enqueueSnackbar(`Added ${course.name} to your selection`, { variant: 'success' });
    }
  };

  const handleSaveDraft = async () => {
    if (selectedCourses.length === 0) {
      enqueueSnackbar('Please select at least one course', { variant: 'warning' });
      return;
    }

    setDraftLoading(true);
    try {
      // Use selected course codes directly
      const response = await enrollmentAPI.saveDraft({ enrollment_id: currentDraft?.id || '', course_codes: selectedCourses });
      enqueueSnackbar('Enrollment draft saved successfully', { variant: 'success' });
      // Immediately update selectedCourses and currentDraft from response
      if (response && response.draft) {
        setCurrentDraft(response.draft);
        if (Array.isArray(response.draft.course_codes)) {
          setSelectedCourses(Array.from(new Set(response.draft.course_codes)));
        } else {
          setSelectedCourses([]);
        }
      }
      // Do NOT call fetchDraft here, as it will overwrite the selection with possibly stale data
    } catch (error) {
      console.error('Error saving draft:', error);
      enqueueSnackbar('Failed to save draft', { variant: 'error' });
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSubmitEnrollment = () => {
    if (!isValidCourseSelection()) {
      enqueueSnackbar('Please correct your course selection', { variant: 'warning' });
      return;
    }
    setConfirmationOpen(true);
  };

  const confirmSubmitEnrollment = async () => {
    setDraftLoading(true);
    try {
      // First ensure we have a saved draft
      if (!currentDraft) {
        await handleSaveDraft();
      }
      
  // Then submit it via centralized API
  await enrollmentAPI.submitForApproval({ enrollment_id: currentDraft?.id || '' });
      enqueueSnackbar('Enrollment submitted successfully', { variant: 'success' });
      setConfirmationOpen(false);
      
      // Reset UI and refresh data
      setEnrollmentInitiated(false);
      setSelectedCourses([]);
      checkActiveEnrollmentStatus();
      fetchDraft();
    } catch (error) {
      console.error('Error submitting enrollment:', error);
      enqueueSnackbar('Failed to submit enrollment', { variant: 'error' });
    } finally {
      setDraftLoading(false);
    }
  };

  // Helper function to group courses by semester
  const groupCoursesBySemester = (courses: CourseWithEnrollmentStatus[]) => {
    const currentSemester = getCurrentSemester();
    return courses.reduce((acc: SemesterData, course) => {
      // Skip current semester as we handle it separately
      if (course.semester === currentSemester) return acc;
      
      const semKey = `Semester ${course.semester}`;
      if (!acc[semKey]) {
        acc[semKey] = { courses: [], creditTotal: 0 };
      }
      acc[semKey].courses.push(course);
      acc[semKey].creditTotal += course.credits;
      return acc;
    }, {});
  };

  // Function to get available courses for enrollment
  const getAvailableCoursesForEnrollment = (): CourseWithEnrollmentStatus[] => {
    const currentSemester = getCurrentSemester();
    return degreeCourses.courses.filter((course: CourseWithEnrollmentStatus) => 
      course.semester === currentSemester && 
      !course.isEnrolled &&
      isCourseRegisterable(course)
    );
  };

  // Determine if a specific course is registerable based on degree config and semester-specific enrollment dates
  const isCourseRegisterable = (course: CourseWithEnrollmentStatus): boolean => {
    try {
      // If degree config is missing, fallback to true
  const coursesPerSem = degreeCourses.courses_per_semester || {};
  const semKey = String(course.semester);
  const semConfig = coursesPerSem[semKey];
  if (!semConfig) return false;

  // Use global enrollment window if present
  const start = degreeCourses.enrollment_start_at ? new Date(degreeCourses.enrollment_start_at) : null;
  const end = degreeCourses.enrollment_end_at ? new Date(degreeCourses.enrollment_end_at) : null;
  const now = new Date();

  if (start && now < start) return false;
  if (end && now > end) return false;

  // Additionally ensure student is in the correct semester to register for this course
  const studentSem = getCurrentSemester();
  return course.semester === studentSem;
    } catch (err) {
      console.error('Error checking course registerable status:', err);
      return false;
    }
  };

  // Function to get required number of courses for the semester
  const getRequiredCoursesForSemester = (semester: number): number => {
    const coursesPerSem = degreeCourses.courses_per_semester;
    if (coursesPerSem && coursesPerSem[semester]) {
      return parseInt(coursesPerSem[semester].count, 10);
    }
    return 0;
  };

  // Check if course selection is valid based on degree requirements
  const isValidCourseSelection = (): boolean => {
    const currentSemester = getCurrentSemester();
    const requiredCount = getRequiredCoursesForSemester(currentSemester);
    
    if (requiredCount > 0) {
      return selectedCourses.length === requiredCount;
    }
    
    // If no specific requirement, at least select one course
    return selectedCourses.length > 0;
  };

  // Check if a course can be selected (e.g., prerequisites met)
  const canSelectCourse = (course: CourseWithEnrollmentStatus): boolean => {
    // Here you could implement prerequisite checking logic
    // For now, just check if course is in the current semester
    return course.semester === getCurrentSemester();
  };

  // Check if there's an approved enrollment for the current semester
  const hasApprovedEnrollment = useCallback((): boolean => {
    const currentSemester = getCurrentSemester();
    const hasApproved = activeEnrollments.some(
      enrollment => 
        enrollment.enrollment_status === 'approved' && 
        enrollment.semester === currentSemester
    );
    // ...existing code...
    return hasApproved;
  }, [activeEnrollments, getCurrentSemester]);

  // Fetch degree courses for the current student
  const fetchDegreeCourses = useCallback(async () => {
    try {
      const semester = getCurrentSemester();
      // Prefer new degree-based endpoint when degree code is available
      let response: any = null;
      const degreeCodeCandidate = user?.degree_code || user?.degree?.code || user?.degree?.code?.toUpperCase();
      if (degreeCodeCandidate) {
        try {
          // ...existing code...
          const r = await enrollmentAPI.getEnrollmentsByDegree(degreeCodeCandidate, { semester });
          if (r && r.degree && Array.isArray(r.courses)) {
            // Use enrollment_dates for window and count
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
        } catch (err) {
          console.warn('getEnrollmentsByDegree failed, falling back to my-degree-courses', err);
        }
      } else {
  // ...existing code...
      }

      // Fallback to existing endpoint if response wasn't populated from the new route
      if (!response) {
        response = await enrollmentAPI.getMyDegreeCourses(semester);
      }

      setDegreeCourses(response);

      // Build centralized course code map
      const codeMap: Record<string, CourseWithEnrollmentStatus> = {};
      (response.courses || []).forEach((course: CourseWithEnrollmentStatus) => {
        codeMap[course.code] = course;
      });
      setCourseCodeMap(codeMap);

      // Set current semester courses
      const currentCourses = (response.courses || []).filter(
        (course: CourseWithEnrollmentStatus) => course.semester === semester
      );
      setCurrentSemesterCourses(currentCourses);

      // Group past semester courses
      const pastCourses = groupCoursesBySemester(response.courses || []);
      setPastSemesterCourses(pastCourses);

      // Extract course requirements
      const requirements: { [key: string]: number } = {};
      if (response.courses_per_semester) {
        Object.entries(response.courses_per_semester).forEach(([sem, data]: [string, any]) => {
          requirements[sem] = parseInt(data.count, 10);
        });
      }
      setCourseRequirements(requirements);
    } catch (error) {
      console.error('Error fetching degree courses:', error);
      enqueueSnackbar('Failed to fetch courses', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, getCurrentSemester]);

  const fetchDraft = useCallback(async () => {
    try {
      // Only fetch draft if not already loaded
      if (currentDraft) return;
      const response = await enrollmentAPI.createDraft({ course_codes: [], semester: getCurrentSemester() } as any);
      if (response && response.draft) {
        setCurrentDraft(response.draft);
        // Use course codes directly for selection
        setSelectedCourses(Array.from(new Set(response.draft.course_codes || [])));
      } else {
        setCurrentDraft(null);
        setSelectedCourses([]);
      }
    } catch (error) {
      console.error('Error fetching draft:', error);
    }
  }, [currentDraft, getCurrentSemester]);

  const checkActiveEnrollmentStatus = useCallback(async () => {
    try {
  const response = await enrollmentAPI.checkActiveEnrollmentStatus();

      // Store all enrollments for reference, including approved ones
      setActiveEnrollments(response.activeEnrollments || []);

      // Check if there are any pending (not approved) enrollments
      const pendingEnrollments = (response.activeEnrollments || []).filter(
        (e: any) => e.enrollment_status !== 'approved' && 
             e.enrollment_status !== 'draft' && 
             e.enrollment_status !== 'rejected'
      );

      // Check if there's an approved enrollment for the current semester
      const hasApproved = (response.activeEnrollments || []).some(
        (e: any) => e.enrollment_status === 'approved' && e.semester === getCurrentSemester()
      );
  // ...existing code...
      
      // If there's an active enrollment that needs approval, it takes priority
      if (pendingEnrollments.length > 0) {
        setHasActiveEnrollment(true);
        setHasDraftEnrollment(false);
        setDraftEnrollment(null);
        
        // Reset enrollment initiation and selection when there's an active enrollment
        setEnrollmentInitiated(false);
        setSelectedCourses([]);
      } else if (response.hasDraft && response.draftEnrollment && !hasApproved) {
        // Has draft but no active enrollment and no approved enrollment
        setHasActiveEnrollment(false);
        setHasDraftEnrollment(true);
        setDraftEnrollment(response.draftEnrollment);
        
        // If there's a draft, automatically set the selected courses and initiate enrollment
          // Always use course codes for selection
          if (response.draftEnrollment.course_codes && Array.isArray(response.draftEnrollment.course_codes)) {
            setSelectedCourses(Array.from(new Set(response.draftEnrollment.course_codes)));
          } else if (response.draftEnrollment.course_ids && Array.isArray(response.draftEnrollment.course_ids)) {
            // Map IDs to codes using courseCodeMap
            const codes = response.draftEnrollment.course_ids
              .map((id: string) => {
                // Find course by id in courseCodeMap
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
        // No active enrollment or we have an approved enrollment
        setHasActiveEnrollment(false);
        setHasDraftEnrollment(false);
        setDraftEnrollment(null);
        
        // If there's an approved enrollment, we don't want to initiate a new enrollment
        if (hasApproved) {
          setEnrollmentInitiated(false);
          setSelectedCourses([]);
        }
      }
    } catch (error) {
      console.error('Error checking active enrollment status:', error);
    }
  }, [getCurrentSemester]);

  // Add a flag to track initial loading

  // Initial load: fetch degree courses and enrollment status
  useEffect(() => {
    // Only run once on mount
    let isMounted = true;
    const loadAll = async () => {
      await fetchDegreeCourses();
      await checkActiveEnrollmentStatus();
      // Only fetch draft if there is a draft enrollment and no current draft loaded
      if (isMounted && hasDraftEnrollment && !currentDraft) {
        await fetchDraft();
      }
    };
    loadAll();
    return () => { isMounted = false; };
  // Only run once on mount
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Debug render state
  // ...existing code...

  return (
    <>
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="degree tabs">
          <Tab 
            label="Current Semester" 
            icon={<Chip label={currentSemesterCourses.length} size="small" color="primary" />}
          />
          <Tab 
            label="Past Semesters" 
            icon={<Chip label={Object.keys(pastSemesterCourses).length} size="small" color="success" />}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {hasActiveEnrollment && !hasDraftEnrollment ? (
            <>
              {/* Active Enrollment Status - Only show pending approvals, not approved */}
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color="warning" />
                Pending Enrollment Requests
              </Typography>
              
              <Paper sx={{ mb: 3 }}>
                <List>
                  {activeEnrollments
                    .filter(e => e.enrollment_status !== 'approved')
                    .map((enrollment, index) => (
                      <React.Fragment key={enrollment.id}>
                        <ListItem
                          divider={false}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" component="div" fontWeight="medium">
                              Enrollment ID: {enrollment.id.slice(0, 8)}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" component="div">
                              Status: {formatEnrollmentStatus(enrollment.enrollment_status)}
                            </Typography>
                          </Box>
                        </ListItem>
                        
                        {enrollment.courses && enrollment.courses.length > 0 ? (
                          enrollment.courses.map((course: { id: string, code: string, name: string, credits?: number }, courseIndex: number) => (
                            <ListItem 
                              key={course.id}
                              sx={{ pl: 4 }}
                              divider={courseIndex < enrollment.courses.length - 1 || index < activeEnrollments.filter(e => e.enrollment_status !== 'approved').length - 1}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body1" component="div">
                                  {course.name} ({course.code})
                                </Typography>
                                <Typography variant="body2" color="textSecondary" component="div">
                                  {course.credits || 0} credits • Pending approval
                                </Typography>
                              </Box>
                            </ListItem>
                          ))
                        ) : (
                          <ListItem sx={{ pl: 4 }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                              No course details available
                            </Typography>
                          </ListItem>
                        )}
                      </React.Fragment>
                    ))
                  }
                </List>
              </Paper>
            </>
          ) : hasDraftEnrollment ? (
            <>
              {/* Draft Enrollment Section */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body1" gutterBottom>
                  Draft Enrollment for Semester {getCurrentSemester()}
                </Typography>
                <Typography variant="body2">
                  Your draft courses are checked in the list below. You can modify your selection before submitting.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  When you're ready, click 'Submit Draft Enrollment' to send for approval.
                </Typography>
              </Alert>
              
              {/* Draft enrollment courses are now shown directly in the available courses list with checkboxes selected */}
            </>
          ) : hasApprovedEnrollment() ? (
            // Don't show course selection section if there's an approved enrollment
            <></>
          ) : (
            <>
              {/* Current Semester Enrollment Section */}
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EnrollIcon />
                Select Courses for Semester {getCurrentSemester()}
              </Typography>
              
              <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 2 }}>
                Semester: {getCurrentSemester()}
              </Typography>
              
              {/* Enrollment Initiation Button - gated by enrollment window */}
              {!enrollmentInitiated && isEnrollmentWindowOpen() && (
                <Box sx={{ mb: 3 }}>
                  <Button
                    onClick={() => setEnrollmentInitiated(true)}
                    variant="contained"
                    color="primary"
                    startIcon={<EnrollIcon />}
                    size="large"
                  >
                    Start New Enrollment
                  </Button>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Enrollment window: {degreeCourses.enrollment_start_at 
                      ? new Date(degreeCourses.enrollment_start_at).toLocaleDateString() + ' ' + new Date(degreeCourses.enrollment_start_at).toLocaleTimeString() 
                      : 'N/A'} to {degreeCourses.enrollment_end_at 
                      ? new Date(degreeCourses.enrollment_end_at).toLocaleDateString() + ' ' + new Date(degreeCourses.enrollment_end_at).toLocaleTimeString() 
                      : 'N/A'}
                  </Typography>
                </Box>
              )}
            </>
          )}

          {/* Show info if window is closed */}
          {!isEnrollmentWindowOpen() && !hasActiveEnrollment && !hasApprovedEnrollment() && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                Enrollment Window Closed
              </Typography>
              <Typography variant="body2">
                Enrollment window is currently closed. 
                {degreeCourses?.enrollment_start_at && degreeCourses?.enrollment_end_at ? (
                  <>You can enroll between {new Date(degreeCourses.enrollment_start_at).toLocaleDateString()} and {new Date(degreeCourses.enrollment_end_at).toLocaleDateString()}.</>
                ) : (
                  <>No enrollment period is currently scheduled for your semester.</>
                )}
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
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: hasActiveEnrollment ? 0 : 0 }}>
                          <SchoolIcon />
                          Available Courses for {hasDraftEnrollment ? 'Enrollment' : 'Semester ' + getCurrentSemester()}
                        </Typography>
                        <Paper sx={{ mb: 3 }}>
                          <List>
                            {displayCourses.map((course, index) => (
                              <ListItem 
                                key={course.id} 
                                divider={index < displayCourses.length - 1}
                              >
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
                                    {course.credits} credits • Semester {course.semester}
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
          {((enrollmentInitiated && !hasActiveEnrollment) || hasDraftEnrollment) && isEnrollmentWindowOpen() && !hasApprovedEnrollment() && (
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
                  ? 'Submit Draft Enrollment' 
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
            {activeEnrollments.some(enrollment => enrollment.enrollment_status === 'approved') && (
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<InfoIcon />}
                onClick={() => {
                  // Get the first approved enrollment's first course to show the timeline
                  const approvedEnrollment = activeEnrollments.find(e => e.enrollment_status === 'approved');
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
                View Timeline
              </Button>
            )}
          </Box>

          {/* Check for approved enrollments first */}
          {activeEnrollments.some(enrollment => enrollment.enrollment_status === 'approved') ? (
            <Paper sx={{ mb: 3 }}>
              <List>
                {activeEnrollments
                  .filter(enrollment => enrollment.enrollment_status === 'approved')
                  .flatMap(enrollment => {
                    // If enrollment.courses is missing or incomplete, combine with degreeCourses.courses using course_codes
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
                          {course.credits || 0} credits • Semester {course.semester}
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
                          {course.credits || 0} credits • Semester {course.semester}
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
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                No Enrollment
              </Typography>
              <Typography variant="body2">
                You are not enrolled in any courses for semester {getCurrentSemester()} yet.
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* Past Semesters Tab */}
      {activeTab === 1 && (
        <Box>
          {Object.keys(pastSemesterCourses).length > 0 ? (
            Object.entries(pastSemesterCourses)
              .sort(([semA], [semB]) => {
                // Extract semester numbers and compare
                const numA = parseInt(semA.split(' ')[1], 10);
                const numB = parseInt(semB.split(' ')[1], 10);
                return numB - numA; // Descending order (newer first)
              })
              .map(([semester, data]) => (
                <Box key={semester} sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HistoryIcon />
                      {semester}
                      <Chip 
                        label={`${data.courses.length} courses • ${data.creditTotal} credits`} 
                        size="small" 
                        color="primary" 
                        sx={{ ml: 1 }} 
                      />
                    </Typography>
                    {data.courses.length > 0 && (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<InfoIcon />}
                        onClick={() => {
                          // Check if there's an enrollment for this semester course
                          const semNumber = parseInt(semester.split(' ')[1], 10);
                          const semesterEnrollment = activeEnrollments.find(e => e.semester === semNumber);
                          
                          if (semesterEnrollment) {
                            handleShowTimeline(data.courses[0], semesterEnrollment.id);
                          } else {
                            // Fallback to course timeline if no enrollment is found
                            handleShowTimeline(data.courses[0]);
                          }
                        }}
                      >
                        View Timeline
                      </Button>
                    )}
                  </Box>
                  <Paper sx={{ mb: 3 }}>
                    <List>
                      {data.courses.map((course, index) => (
                        <ListItem 
                          key={course.id}
                          divider={index < data.courses.length - 1}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" component="div">
                              {course.name} ({course.code})
                            </Typography>
                            <Typography variant="body2" color="textSecondary" component="div">
                              {course.credits || 0} credits • Semester {course.semester}
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
              ))
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                No Course History
              </Typography>
              <Typography variant="body2">
                No course history available for past semesters.
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* Course Timeline Dialog */}
      <CourseTimelineDialog 
        open={timelineDialogOpen}
        onClose={() => setTimelineDialogOpen(false)}
        course={selectedCourseForTimeline}
        courseTimeline={courseTimelineData}
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