import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  FormGroup, 
  FormControlLabel, 
  Checkbox, 
  CircularProgress, 
  Alert, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider
} from '@mui/material';
import { enrollmentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  department: {
    id: string;
    code: string;
    name: string;
  };
  degree: {
    id: string;
    code: string;
    name: string;
  };
}

const CourseEnrollmentForm: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Get current semester
  const semester = user?.current_semester || 1;

  useEffect(() => {
    fetchAvailableCourses();
    checkExistingDraft();
  }, []);

  const fetchAvailableCourses = async () => {
    try {
      setLoading(true);
      // This endpoint needs to be implemented on the backend
      const response = await fetch(`/api/courses/available?semester=${semester}`);
      const data = await response.json();
      setCourses(data);
    } catch (err: any) {
      setError('Failed to fetch available courses');
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingDraft = async () => {
    try {
      // Fetch current draft enrollment if exists
      const enrollments = await enrollmentAPI.getAllEnrollments({ 
        status: 'draft',
        semester
      });
      
      if (enrollments && enrollments.length > 0) {
        const draft = enrollments[0];
        setDraftId(draft.id);
        
        // Set selected courses from the existing draft
        if (draft.course && draft.course.length > 0) {
          setSelectedCourses(draft.course.map((c: any) => c.code));
        }
      }
    } catch (err) {
      console.error('Error checking for existing draft:', err);
    }
  };

  const handleCourseSelection = (courseCode: string) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseCode)) {
        return prev.filter(code => code !== courseCode);
      } else {
        return [...prev, courseCode];
      }
    });
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (draftId) {
        // Update existing draft
        await enrollmentAPI.saveDraft({
          enrollment_id: draftId,
          course_codes: selectedCourses
        });
      } else {
        // Create new draft
        const result = await enrollmentAPI.createDraft({
          course_codes: selectedCourses,
          semester
        });
        setDraftId(result.enrollment.id);
      }
      
      setSuccess('Course selection saved as draft');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save course selection');
      console.error('Error saving draft:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    if (selectedCourses.length === 0) {
      setError('Please select at least one course');
      return;
    }
    setConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // First save the current selection
      if (draftId) {
        await enrollmentAPI.saveDraft({
          enrollment_id: draftId,
          course_codes: selectedCourses
        });
      } else {
        const result = await enrollmentAPI.createDraft({
          course_codes: selectedCourses,
          semester
        });
        setDraftId(result.enrollment.id);
      }
      
      // Then submit it for approval
      if (draftId) {
        await enrollmentAPI.submitForApproval({ enrollment_id: draftId });
        setSuccess('Enrollment submitted for approval');
        // Reset form after submission
        setSelectedCourses([]);
        setDraftId(null);
      }
      
      setConfirmDialog(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit enrollment');
      console.error('Error submitting enrollment:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Course Selection for Semester {semester}
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Available Courses
          </Typography>
          
          {courses.length === 0 ? (
            <Alert severity="info">No courses available for this semester</Alert>
          ) : (
            <>
              <Grid container spacing={2}>
                {courses.map((course) => (
                  <Grid size={{ xs: 12, md: 6 }} key={course.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={selectedCourses.includes(course.code)}
                              onChange={() => handleCourseSelection(course.code)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="subtitle1">
                                {course.code}: {course.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Credits: {course.credits} | Department: {course.department.code}
                              </Typography>
                            </Box>
                          }
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Typography>
                  {selectedCourses.length} course(s) selected
                </Typography>
                <Box>
                  <Button 
                    variant="outlined" 
                    onClick={handleSaveDraft} 
                    disabled={saving || selectedCourses.length === 0}
                    sx={{ mr: 2 }}
                  >
                    {saving ? <CircularProgress size={24} /> : 'Save as Draft'}
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSubmit}
                    disabled={saving || selectedCourses.length === 0}
                  >
                    Submit for Approval
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit your course selection for approval? 
            Once submitted, you won't be able to make changes unless it's rejected.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Selected Courses:</Typography>
            <ul>
              {selectedCourses.map(code => {
                const course = courses.find(c => c.code === code);
                return <li key={code}>{code}: {course?.name}</li>;
              })}
            </ul>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button 
            onClick={confirmSubmit} 
            variant="contained" 
            color="primary"
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseEnrollmentForm;