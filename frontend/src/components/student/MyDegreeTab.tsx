import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  Checkbox,
  Paper,
  LinearProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  School as SchoolIcon,
  BookmarkAdd as EnrollIcon,
  Schedule as ScheduleIcon,
  CreditCard as CreditIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  AccountCircle as StudentIcon,
  AdminPanelSettings as HodIcon,
  Business as OfficeIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import enrollmentAPI, { DegreeCourses, CourseWithEnrollmentStatus, enrollmentAPI as api } from '../../services/enrollmentApi';

const MyDegreeTab: React.FC = () => {
  // Helper to check if enrollment window is open
  const isEnrollmentWindowOpen = () => {
    if (!degreeCourses?.enrollment_start_at || !degreeCourses?.enrollment_end_at) return false;
    const now = new Date();
    return (
      new Date(degreeCourses.enrollment_start_at) <= now &&
      now <= new Date(degreeCourses.enrollment_end_at)
    );
  };
  const [degreeCourses, setDegreeCourses] = useState<DegreeCourses | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = Current Semester, 1 = Past Semesters
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [selectedCourseForTimeline, setSelectedCourseForTimeline] = useState<CourseWithEnrollmentStatus | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [courseBeingEdited, setCourseBeingEdited] = useState<CourseWithEnrollmentStatus | null>(null);
  const [hasActiveEnrollment, setHasActiveEnrollment] = useState(false);
  const [activeEnrollments, setActiveEnrollments] = useState<any[]>([]);
  const [enrollmentInitiated, setEnrollmentInitiated] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Helper function to get the current semester for the student from API data
  const getCurrentSemester = (): number => {
    return degreeCourses?.student?.current_semester || 1;
  };

  // Helper function to get required courses for a specific semester
  const getRequiredCoursesForSemester = (semester: number): number => {
    if (!degreeCourses?.degree?.courses_per_semester) {
      return 0; // No validation if courses_per_semester is not defined
    }
    
    return degreeCourses.degree.courses_per_semester[semester.toString()] || 0;
  };

  // Helper function to check if the selected courses meet the requirement
  const isValidCourseSelection = (): boolean => {
    const currentSemester = getCurrentSemester();
    const requiredCoursesCount = getRequiredCoursesForSemester(currentSemester);
    
    if (requiredCoursesCount === 0) {
      return selectedCourses.length > 0; // At least one course if no specific requirement
    }
    
    return selectedCourses.length === requiredCoursesCount;
  };

  const fetchDegreeCourses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await enrollmentAPI.getMyDegreeCourses();
      setDegreeCourses(data);
    } catch (error) {
      console.error('Error fetching degree courses:', error);
      enqueueSnackbar('Failed to fetch courses', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const fetchDraft = useCallback(async () => {
    try {
      const draft = await api.getEnrollmentDraft();
      setCurrentDraft(draft);
      setSelectedCourses(draft.course_ids || []);
    } catch (error) {
      console.error('Error fetching draft:', error);
      // Don't show error for missing draft, it's normal
    }
  }, []);

  const checkActiveEnrollmentStatus = useCallback(async () => {
    try {
      const status = await enrollmentAPI.checkActiveEnrollmentStatus();
      setHasActiveEnrollment(status.hasActiveEnrollment);
      setActiveEnrollments(status.activeEnrollments);
      
      // If there are active enrollments, disable new enrollment initiation
      if (status.hasActiveEnrollment) {
        setEnrollmentInitiated(true);
      }
    } catch (error) {
      console.error('Error checking active enrollment status:', error);
    }
  }, []);

  useEffect(() => {
    fetchDegreeCourses();
    fetchDraft();
    checkActiveEnrollmentStatus();
  }, [fetchDegreeCourses, fetchDraft, checkActiveEnrollmentStatus]);

  const getAvailableCoursesForEnrollment = () => {
    const currentSemester = getCurrentSemester();
    const allCourses = degreeCourses?.courses || [];
    const currentSemesterCourses = allCourses.filter(course => course.semester === currentSemester);
    const available = currentSemesterCourses.filter(course => 
      (!course.isEnrolled || course.enrollmentStatus === 'rejected')
    );
    
    console.log('Debug course availability:');
    console.log('Current semester:', currentSemester);
    console.log('All courses:', allCourses.length);
    console.log('Current semester courses:', currentSemesterCourses.map(c => ({ 
      name: c.name, 
      isEnrolled: c.isEnrolled, 
      status: c.enrollmentStatus 
    })));
    console.log('Available courses:', available.map(c => ({ 
      name: c.name, 
      isEnrolled: c.isEnrolled, 
      status: c.enrollmentStatus 
    })));
    console.log('Selected courses:', selectedCourses);
    
    return available;
  };

  const handleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSaveDraft = async () => {
    try {
      setDraftLoading(true);
      await api.saveEnrollmentDraft(selectedCourses);
      enqueueSnackbar('Draft saved successfully!', { variant: 'success' });
      fetchDraft(); // Refresh draft data
    } catch (error) {
      console.error('Error saving draft:', error);
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to save draft', { variant: 'error' });
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSubmitEnrollment = async () => {
    if (selectedCourses.length === 0) {
      enqueueSnackbar('Please select at least one course', { variant: 'warning' });
      return;
    }

    // Get the required number of courses for the current semester
    const currentSemester = getCurrentSemester();
    const requiredCoursesCount = getRequiredCoursesForSemester(currentSemester);
    
    if (requiredCoursesCount > 0 && selectedCourses.length !== requiredCoursesCount) {
      enqueueSnackbar(
        `You must select exactly ${requiredCoursesCount} course(s) for semester ${currentSemester}. Currently selected: ${selectedCourses.length}`,
        { variant: 'error' }
      );
      return;
    }

    // Open confirmation dialog instead of immediately submitting
    setConfirmDialogOpen(true);
  };

  const handleConfirmSubmission = async () => {
    try {
      setEnrollmentLoading(true);
      setConfirmDialogOpen(false);
      
      // First save the draft
      await api.saveEnrollmentDraft(selectedCourses);
      // Then submit it
      await api.submitEnrollmentDraft();

      enqueueSnackbar('Enrollment submitted to HOD for approval!', { variant: 'success' });
      setSelectedCourses([]);
      setSubmissionMessage(''); // Clear the message
      setEnrollmentInitiated(false); // Reset enrollment initiation state
      
      // Refresh all data
      await Promise.all([
        fetchDegreeCourses(),
        fetchDraft(),
        checkActiveEnrollmentStatus()
      ]);
    } catch (error) {
      console.error('Error submitting enrollment:', error);
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to submit enrollment', { variant: 'error' });
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleCancelSubmission = () => {
    setConfirmDialogOpen(false);
    setSubmissionMessage(''); // Clear the message
  };

  const handleShowTimeline = (course: CourseWithEnrollmentStatus) => {
    setSelectedCourseForTimeline(course);
    setTimelineDialogOpen(true);
  };

  const handleCloseTimeline = () => {
    setTimelineDialogOpen(false);
    setSelectedCourseForTimeline(null);
  };

  const handleEditEnrollment = async (course: CourseWithEnrollmentStatus) => {
    if (course.enrollmentStatus === 'rejected') {
      // Automatically initiate enrollment and add the rejected course to selection
      setEnrollmentInitiated(true);
      
      const updatedSelection = [...selectedCourses];
      if (!updatedSelection.includes(course.id)) {
        updatedSelection.push(course.id);
        setSelectedCourses(updatedSelection);
      }
      
      // Open edit dialog
      setCourseBeingEdited(course);
      setEditDialogOpen(true);
    }
  };

  const handleConfirmEdit = async () => {
    if (!courseBeingEdited || selectedCourses.length === 0) return;
    
    try {
      setDraftLoading(true);
      
      // Save the current selection as draft
      await api.saveEnrollmentDraft(selectedCourses);
      
      // Submit the draft to HOD
      await api.submitEnrollmentDraft();
      
      // Close dialog and refresh data
      setEditDialogOpen(false);
      setCourseBeingEdited(null);
      
      // Clear selection since it's now submitted
      setSelectedCourses([]);
      setEnrollmentInitiated(false); // Reset enrollment initiation state
      
      // Refresh data
      await Promise.all([fetchDegreeCourses(), fetchDraft(), checkActiveEnrollmentStatus()]);
      
      enqueueSnackbar(`Enrollment submitted to HOD for approval! Selected ${selectedCourses.length} course(s).`, { 
        variant: 'success',
        autoHideDuration: 5000
      });
      
    } catch (error) {
      console.error('Error submitting enrollment:', error);
      enqueueSnackbar(`Failed to submit enrollment: ${error instanceof Error ? error.message : 'Unknown error'}`, { variant: 'error' });
    } finally {
      setDraftLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setCourseBeingEdited(null);
  };

  // Organize courses by semester
  const coursesBySemester = degreeCourses?.courses.reduce((acc, course) => {
    if (!acc[course.semester]) {
      acc[course.semester] = [];
    }
    acc[course.semester].push(course);
    return acc;
  }, {} as Record<number, CourseWithEnrollmentStatus[]>) || {};

  const currentSemester = getCurrentSemester();
  
  // Separate current and past semester courses
  const currentSemesterCourses = coursesBySemester[currentSemester] || [];
  const pastSemesterCourses = Object.keys(coursesBySemester)
    .filter(semester => Number(semester) < currentSemester)
    .sort((a, b) => Number(b) - Number(a)) // Sort in descending order (most recent first)
    .reduce((acc, semester) => {
      acc[Number(semester)] = coursesBySemester[Number(semester)];
      return acc;
    }, {} as Record<number, CourseWithEnrollmentStatus[]>);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Loading your degree information...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!degreeCourses) {
    return (
      <Alert severity="error">
        <Typography variant="h6">Unable to load degree information</Typography>
        <Typography>Please ensure your degree is properly assigned to your profile.</Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Degree Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon />
          {degreeCourses.degree.name}
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          {degreeCourses.degree.code} • {degreeCourses.degree.department.name} Department
        </Typography>
        <Typography variant="body2" color="primary" gutterBottom>
          You can enroll in courses from your degree program below
        </Typography>
        <Typography variant="body2">
          Duration: {degreeCourses.degree.duration_years} years
        </Typography>
      </Paper>

      {/* Student Status and Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Alert severity="info" sx={{ flex: 1 }}>
          <Typography variant="body2">
            <strong>Current Semester:</strong> {currentSemester} • 
            <strong>Enrolled Year:</strong> {degreeCourses.student.enrolled_year}
          </Typography>
        </Alert>

        {currentDraft && !currentDraft.is_submitted && selectedCourses.length > 0 && (
          <Alert severity="info" sx={{ flex: 1 }}>
            You have {selectedCourses.length} course(s) in your draft. 
            {currentDraft.is_submitted ? ' (Already submitted)' : ' Ready to save or submit below.'}
          </Alert>
        )}
      </Box>

      {/* Tabs for Current and Past Semesters */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="semester tabs">
          <Tab 
            label={`Current Semester (${currentSemester})`} 
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
          {/* Current Semester Enrollment Section */}
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EnrollIcon />
            Select Courses for Semester {getCurrentSemester()}
          </Typography>
          
          <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 2 }}>
            Academic Year: {enrollmentAPI.getCurrentAcademicYear()} • 
            Semester: {getCurrentSemester()}
          </Typography>

          {/* Active Enrollment Status */}
          {hasActiveEnrollment && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>You have {activeEnrollments.length} active enrollment request(s) pending approval:</strong>
              </Typography>
              {activeEnrollments.map((enrollment, index) => (
                <Typography key={enrollment.id} variant="body2" sx={{ ml: 2 }}>
                  • {enrollment.courseName} ({enrollment.courseCode}) - {enrollment.status}
                </Typography>
              ))}
              <Typography variant="body2" sx={{ mt: 1 }}>
                Please wait for your current request to be processed before initiating a new enrollment.
              </Typography>
            </Alert>
          )}

          {/* Enrollment Initiation Button - gated by enrollment window */}
          {!enrollmentInitiated && !hasActiveEnrollment && isEnrollmentWindowOpen() && (
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
                Enrollment window: {new Date(degreeCourses.enrollment_start_at!).toLocaleString()} to {new Date(degreeCourses.enrollment_end_at!).toLocaleString()}
              </Typography>
            </Box>
          )}
          {/* Show info if window is closed */}
          {!isEnrollmentWindowOpen() && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Enrollment window is currently closed. You can enroll between {degreeCourses.enrollment_start_at ? new Date(degreeCourses.enrollment_start_at).toLocaleString() : 'N/A'} and {degreeCourses.enrollment_end_at ? new Date(degreeCourses.enrollment_end_at).toLocaleString() : 'N/A'}.
              </Typography>
            </Alert>
          )}
          
          {/* Course requirement information and available courses - gated by enrollment window */}
          {enrollmentInitiated && !hasActiveEnrollment && isEnrollmentWindowOpen() && (() => {
            const currentSemester = getCurrentSemester();
            const requiredCount = getRequiredCoursesForSemester(currentSemester);
            const availableCourses = getAvailableCoursesForEnrollment();
            
            if (availableCourses.length === 0) {
              return (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    No courses are available for enrollment in your current semester.
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

          {/* Available Courses List - gated by enrollment window */}
          {enrollmentInitiated && !hasActiveEnrollment && isEnrollmentWindowOpen() && getAvailableCoursesForEnrollment().length > 0 ? (
            <>
              {/* Rejected Courses - Show as Cards */}
              {(() => {
                const rejectedCourses = getAvailableCoursesForEnrollment().filter(course => 
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

              {/* Regular Available Courses - Show as List with Checkboxes */}
              {(() => {
                const availableCourses = getAvailableCoursesForEnrollment().filter(course => 
                  course.enrollmentStatus !== 'rejected'
                );
                if (availableCourses.length > 0) {
                  return (
                    <div id="course-selection-area" data-testid="available-courses">
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EnrollIcon />
                        Available Courses for Enrollment
                      </Typography>
                      <Paper sx={{ mb: 3 }}>
                        <List>
                          {availableCourses.map((course, index) => (
                            <ListItem 
                              key={course.id} 
                              divider={index < availableCourses.length - 1}
                            >
                              <ListItemIcon>
                                <Checkbox
                                  checked={selectedCourses.includes(course.id)}
                                  onChange={() => handleCourseSelection(course.id)}
                                />
                              </ListItemIcon>
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

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Show validation message */}
                {selectedCourses.length > 0 && !isValidCourseSelection() && (
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
                  disabled={selectedCourses.length === 0 || draftLoading}
                >
                  {draftLoading ? 'Saving...' : `Save Draft (${selectedCourses.length} courses)`}
                </Button>
                <Button
                  onClick={handleSubmitEnrollment}
                  variant="contained"
                  disabled={selectedCourses.length === 0 || enrollmentLoading || !isValidCourseSelection()}
                  color="primary"
                >
                  {enrollmentLoading ? 'Submitting...' : `Submit to HOD (${selectedCourses.length} courses)`}
                </Button>
              </Box>
            </>
          ) : null}

          {/* Already Enrolled Courses for Current Semester */}
          {currentSemesterCourses.some(course => course.isEnrolled && course.enrollmentStatus !== 'rejected') && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon />
                Already Enrolled in Semester {getCurrentSemester()}
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }, 
                gap: 2 
              }}>
                {currentSemesterCourses
                  .filter(course => course.isEnrolled && course.enrollmentStatus !== 'rejected')
                  .map((course) => (
                    <CourseCard 
                      key={course.id} 
                      course={course} 
                      isReadonly={true}
                      onShowTimeline={handleShowTimeline}
                      onEditEnrollment={handleEditEnrollment}
                      isLoading={draftLoading}
                    />
                  ))}
              </Box>
            </>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {/* Past Semesters Content */}
          {Object.keys(pastSemesterCourses).length > 0 ? (
            Object.keys(pastSemesterCourses)
              .map(semester => {
                const semesterNumber = Number(semester);
                const semesterCourses = pastSemesterCourses[semesterNumber];

                return (
                  <Box key={semester} sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ScheduleIcon />
                      Semester {semester}
                      <Chip label="Completed" color="success" size="small" />
                    </Typography>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }, 
                      gap: 2,
                      opacity: 0.8 // Slightly faded to indicate past semester
                    }}>
                      {semesterCourses.map((course) => (
                        <CourseCard 
                          key={course.id} 
                          course={course} 
                          isReadonly={true}
                          onShowTimeline={handleShowTimeline}
                          onEditEnrollment={handleEditEnrollment}
                          isLoading={draftLoading}
                        />
                      ))}
                    </Box>
                  </Box>
                );
              })
          ) : (
            <Alert severity="info">
              <Typography>No past semester courses to display.</Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* Confirmation Dialog for Enrollment Submission */}
      <Dialog 
        open={confirmDialogOpen} 
        onClose={handleCancelSubmission}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Enrollment Submission
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You are about to submit enrollment for {selectedCourses.length} course(s) to your Head of Department for approval.
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selected courses will be:
          </Typography>
          
          <Box sx={{ pl: 2, mb: 2 }}>
            {selectedCourses.map(courseId => {
              const course = degreeCourses?.courses.find(c => c.id === courseId);
              return course ? (
                <Typography key={courseId} variant="body2" sx={{ mb: 0.5 }}>
                  • {course.name} ({course.code}) - {course.credits} credits
                </Typography>
              ) : null;
            })}
          </Box>

          <TextField
            label="Message to HOD (Optional)"
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            value={submissionMessage}
            onChange={(e) => setSubmissionMessage(e.target.value)}
            placeholder="Add any additional information or special requests..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={handleCancelSubmission}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSubmission}
            variant="contained"
            disabled={enrollmentLoading}
          >
            {enrollmentLoading ? 'Submitting...' : 'Submit to HOD'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timeline Dialog */}
      <Dialog 
        open={timelineDialogOpen} 
        onClose={handleCloseTimeline}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Enrollment Timeline - {selectedCourseForTimeline?.name}
        </DialogTitle>
        <DialogContent>
          {selectedCourseForTimeline && (
            <ConversationTimeline course={selectedCourseForTimeline} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTimeline}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCancelEdit}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Edit Course Selection for Semester {getCurrentSemester()}
        </DialogTitle>
        <DialogContent>
          {courseBeingEdited && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Previously Rejected: {courseBeingEdited.name}
                </Typography>
                <Typography variant="body2">
                  Reason: {courseBeingEdited.rejectionReason}
                </Typography>
              </Alert>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                Select courses for your enrollment:
              </Typography>
              
              <Paper sx={{ maxHeight: 400, overflow: 'auto', p: 1 }}>
                <List>
                  {(() => {
                    const currentSemester = getCurrentSemester();
                    const allSemesterCourses = degreeCourses?.courses.filter(course => 
                      course.semester === currentSemester
                    ) || [];
                    
                    // Debug logging
                    console.log('Edit Dialog - Current semester:', currentSemester);
                    console.log('Edit Dialog - All courses:', degreeCourses?.courses?.length);
                    console.log('Edit Dialog - Current semester courses:', allSemesterCourses);
                    
                    if (allSemesterCourses.length === 0) {
                      return (
                        <ListItem>
                          <Typography variant="body1" color="textSecondary">
                            No courses available for semester {currentSemester}
                          </Typography>
                        </ListItem>
                      );
                    }
                    
                    return allSemesterCourses.map((course, index) => (
                      <ListItem 
                        key={course.id} 
                        divider={index < allSemesterCourses.length - 1}
                        sx={{ 
                          opacity: course.isEnrolled && course.enrollmentStatus !== 'rejected' ? 0.6 : 1
                        }}
                      >
                        <ListItemIcon>
                          <Checkbox
                            checked={selectedCourses.includes(course.id)}
                            onChange={() => handleCourseSelection(course.id)}
                            disabled={course.isEnrolled && course.enrollmentStatus !== 'rejected'}
                          />
                        </ListItemIcon>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" component="div">
                            {course.name} ({course.code})
                            {course.isEnrolled && course.enrollmentStatus !== 'rejected' && (
                              <Chip 
                                label="Already Enrolled" 
                                color="success" 
                                size="small" 
                                sx={{ ml: 1 }} 
                              />
                            )}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" component="div">
                            {course.credits} credits • Semester {course.semester}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 0.5 }}>
                            {course.overview}
                          </Typography>
                          {course.prerequisites && course.prerequisites.length > 0 && (
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                              Prerequisites: {course.prerequisites.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      </ListItem>
                    ));
                  })()}
                </List>
              </Paper>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Selected courses: {selectedCourses.length} • 
                You can check/uncheck courses above to modify your selection.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmEdit} 
            variant="contained"
            disabled={draftLoading || selectedCourses.length === 0}
          >
            {draftLoading ? 'Saving...' : `Submit ${selectedCourses.length} Course(s) to HOD`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Conversation Timeline Component
const ConversationTimeline: React.FC<{ course: CourseWithEnrollmentStatus }> = ({ course }) => {
  const conversationMessages = course.conversationMessages ? 
    (typeof course.conversationMessages === 'string' && course.conversationMessages.trim() !== '' ? 
      JSON.parse(course.conversationMessages) : []) : [];
  
  const getTimelineData = () => {
    const timeline: Array<{
      timestamp: string;
      actor: 'student' | 'hod' | 'office';
      action: string;
      message?: string;
      icon: React.ReactNode;
      color: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
    }> = [];

    // Initial submission (inferred from enrollment status)
    if (course.enrollmentStatus) {
      timeline.push({
        timestamp: new Date().toISOString(), // Would be actual submission time in real app
        actor: 'student',
        action: 'Submitted enrollment request',
        message: 'Course enrollment submitted to Head of Department for approval',
        icon: <StudentIcon />,
        color: 'primary'
      });
    }

    // Add conversation messages
    conversationMessages.forEach((msg: any) => {
      timeline.push({
        timestamp: msg.timestamp,
        actor: msg.actor,
        action: msg.action || (msg.actor === 'student' ? 'Added message' : 'Responded'),
        message: msg.message,
        icon: msg.actor === 'student' ? <StudentIcon /> : 
              msg.actor === 'hod' ? <HodIcon /> : <OfficeIcon />,
        color: msg.actor === 'student' ? 'primary' : 
               msg.actor === 'hod' ? 'secondary' : 'success'
      });
    });

    // Add status updates with clear messages
    if (course.enrollmentStatus === 'rejected' && course.rejectionReason) {
      timeline.push({
        timestamp: new Date().toISOString(), // Would be actual rejection time
        actor: 'hod',
        action: 'Rejected Enrollment',
        message: course.rejectionReason,
        icon: <HodIcon />,
        color: 'error'
      });
    }

    if (course.enrollmentStatus === 'approved') {
      timeline.push({
        timestamp: course.hodApprovedAt || new Date().toISOString(),
        actor: 'hod',
        action: 'Approved Enrollment',
        message: 'Course enrollment has been approved by the Head of Department',
        icon: <HodIcon />,
        color: 'success'
      });
    }

    if (course.enrollmentStatus === 'pending_hod_approval') {
      timeline.push({
        timestamp: new Date().toISOString(),
        actor: 'hod',
        action: 'Pending HOD Review',
        message: 'Enrollment request is awaiting review by the Head of Department',
        icon: <HodIcon />,
        color: 'warning'
      });
    }

    return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const timelineData = getTimelineData();

  return (
    <Box>
      {timelineData.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            No conversation history available for this course.
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Enrollment Timeline
          </Typography>
          <Timeline>
            {timelineData.map((item, index) => (
              <TimelineItem key={index}>
                <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                  <Typography variant="caption">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </Typography>
                  <br />
                  <Typography variant="caption">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Typography>
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color={item.color}>
                    {item.icon}
                  </TimelineDot>
                  {index < timelineData.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent sx={{ flex: 1 }}>
                  <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', textTransform: 'capitalize', mb: 1 }}>
                      {item.actor === 'student' ? 'Student' : 
                       item.actor === 'hod' ? 'Head of Department' : 'Academic Office'} - {item.action}
                    </Typography>
                    {item.message && (
                      <Typography variant="body2" color="text.secondary">
                        {item.message}
                      </Typography>
                    )}
                  </Paper>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </>
      )}
    </Box>
  );
};

// Course Card Component
const CourseCard: React.FC<{ 
  course: CourseWithEnrollmentStatus; 
  isReadonly?: boolean;
  onShowTimeline?: (course: CourseWithEnrollmentStatus) => void;
  onEditEnrollment?: (course: CourseWithEnrollmentStatus) => void;
  isLoading?: boolean;
}> = ({ course, isReadonly = false, onShowTimeline, onEditEnrollment, isLoading = false }) => {
  const getStatusColor = (status: string | undefined): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'pending_hod_approval': return 'warning';
      case 'pending_office_approval': return 'info';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string | undefined): string => {
    switch (status) {
      case 'pending_hod_approval': return 'Pending HOD Approval';
      case 'pending_office_approval': return 'Pending Office Approval';
      case 'approved': return 'Enrolled';
      case 'rejected': return 'Rejected';
      default: return 'Available';
    }
  };

  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      opacity: isReadonly ? 0.7 : 1,
      backgroundColor: isReadonly ? 'grey.50' : 'background.paper'
    }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          {course.name}
        </Typography>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          {course.code} • Semester {course.semester}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<CreditIcon />}
            label={`${course.credits} Credits`}
            size="small"
            sx={{ mr: 1 }}
          />
          <Chip
            label={getStatusLabel(course.enrollmentStatus)}
            color={getStatusColor(course.enrollmentStatus)}
            size="small"
          />
          {isReadonly && (
            <Chip
              label="View Only"
              size="small"
              variant="outlined"
              color="default"
              sx={{ ml: 1 }}
            />
          )}
        </Box>

        <Typography variant="body2" color="textSecondary">
          {course.overview}
        </Typography>

        {course.prerequisites && course.prerequisites.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Prerequisites: {course.prerequisites.join(', ')}
            </Typography>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="textSecondary">
          by {course.creator.first_name} {course.creator.last_name}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {course.is_elective && (
            <Chip label="Elective" size="small" variant="outlined" />
          )}
          
          {/* Show timeline button if course has enrollment activity */}
          {course.enrollmentStatus && onShowTimeline && (
            <IconButton 
              size="small" 
              onClick={() => onShowTimeline(course)}
              title="View enrollment timeline"
            >
              <HistoryIcon fontSize="small" />
            </IconButton>
          )}
          
          {/* Show edit button for rejected enrollments */}
          {course.enrollmentStatus === 'rejected' && onEditEnrollment && (
            <IconButton 
              size="small" 
              onClick={() => onEditEnrollment(course)}
              title="Add back to selection for resubmission"
              color="primary"
              disabled={isLoading}
              sx={{ 
                bgcolor: isLoading ? 'grey.400' : 'primary.light', 
                color: 'white',
                '&:hover': { bgcolor: isLoading ? 'grey.400' : 'primary.dark' }
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </CardActions>
    </Card>
  );
};

export default MyDegreeTab;
