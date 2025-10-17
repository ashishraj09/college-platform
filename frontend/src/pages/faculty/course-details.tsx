import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Breadcrumbs,
  Link,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  MenuBook as MenuBookIcon,
  Assignment as AssignmentIcon,
  Groups as GroupsIcon,
  Schedule as ScheduleIcon,
  CheckCircle as ApproveIcon,
  Edit as EditIcon,
  Drafts as DraftIcon,
  Send as SendIcon,
  PendingActions as PendingIcon,
  PlayArrow as ActiveIcon,
} from '@mui/icons-material';
import { coursesAPI } from '../../services/api';
import { useSnackbar } from 'notistack';

interface Course {
  id: string;
  name: string;
  code: string; // Base course code (e.g., "76Y67Y767")
  version_code?: string; // Virtual field for display - versioned code (e.g., "76Y67Y767_V2")
  overview: string;
  credits: number;
  semester: number;
  status: string;
  is_elective: boolean;
  max_students: number;
  prerequisites: string[];
  version: number;
  parent_course_id?: string;
  is_latest_version: boolean;
  createdAt: string;
  updatedAt: string;
  approved_at?: string;
  rejection_reason?: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
  degree?: {
    id: string;
    name: string;
    code: string;
  };
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  approver?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  updater?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  study_details?: {
    learning_objectives?: string[];
    course_outcomes?: string[];
    assessment_methods?: string[];
    textbooks?: string[];
    references?: string[];
  };
  faculty_details?: {
    primary_instructor?: string;
    instructor?: string;
    co_instructors?: string[];
    guest_lecturers?: string[];
    lab_instructors?: string[];
  };
}

const CourseDetailsView: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (courseId) {
      loadCourseDetails();
    }
  }, [courseId]);

  const loadCourseDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await coursesAPI.getCourseById(courseId!);
      setCourse(response.course);
    } catch (err: any) {
      console.error('Error loading course details:', err);
      setError('Failed to load course details');
      enqueueSnackbar('Error loading course details', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'submitted':
      case 'pending_approval': return 'info';
      case 'approved': return 'success';
      case 'active': return 'success';
      case 'disabled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <DraftIcon />;
      case 'submitted':
      case 'pending_approval': return <PendingIcon />;
      case 'approved': return <ApproveIcon />;
      case 'active': return <ActiveIcon />;
      default: return <SchoolIcon />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Loading course details...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we fetch course information
        </Typography>
      </Container>
    );
  }

  if (error || !course) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || 'Course not found'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/faculty')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="inherit"
            onClick={() => navigate('/faculty')}
            sx={{ textDecoration: 'none' }}
          >
            Faculty Dashboard
          </Link>
          <Typography color="text.primary">Course Details</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/faculty')} sx={{ p: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1">
              {course.name}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {course.code}
            </Typography>
          </Box>
          <Chip
            icon={getStatusIcon(course.status)}
            label={course.status.replace('_', ' ').toUpperCase()}
            color={getStatusColor(course.status) as any}
            size="medium"
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Main Course Information */}
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MenuBookIcon /> Course Overview
            </Typography>
            <Typography variant="body1" paragraph>
              {course.overview}
            </Typography>
          </Paper>

          {/* Study Details */}
          {course.study_details && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon /> Study Details
              </Typography>
              
              {course.study_details.learning_objectives && course.study_details.learning_objectives.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Learning Objectives</Typography>
                  <List dense>
                    {course.study_details.learning_objectives.map((objective, index) => (
                      <ListItem key={index} sx={{ pl: 0 }}>
                        <ListItemText primary={`• ${objective}`} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {course.study_details.course_outcomes && course.study_details.course_outcomes.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Course Outcomes</Typography>
                  <List dense>
                    {course.study_details.course_outcomes.map((outcome, index) => (
                      <ListItem key={index} sx={{ pl: 0 }}>
                        <ListItemText primary={`• ${outcome}`} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {course.study_details.assessment_methods && course.study_details.assessment_methods.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Assessment Methods</Typography>
                  <List dense>
                    {course.study_details.assessment_methods.map((method, index) => (
                      <ListItem key={index} sx={{ pl: 0 }}>
                        <ListItemText primary={`• ${method}`} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {course.study_details.textbooks && course.study_details.textbooks.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Textbooks</Typography>
                  <List dense>
                    {course.study_details.textbooks.map((book, index) => (
                      <ListItem key={index} sx={{ pl: 0 }}>
                        <ListItemText primary={`• ${book}`} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {course.study_details.references && course.study_details.references.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>References</Typography>
                  <List dense>
                    {course.study_details.references.map((reference, index) => (
                      <ListItem key={index} sx={{ pl: 0 }}>
                        <ListItemText primary={`• ${reference}`} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Paper>
          )}

          {/* Faculty Details */}
          {course.faculty_details && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon /> Faculty Details
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {(course.faculty_details.primary_instructor || course.faculty_details.instructor) && (
                  <Box sx={{ flex: '1 1 250px' }}>
                    <Typography variant="subtitle1" fontWeight="bold">Primary Instructor</Typography>
                    <Typography variant="body2">
                      {course.faculty_details.primary_instructor || course.faculty_details.instructor}
                    </Typography>
                  </Box>
                )}

                {course.faculty_details.co_instructors && course.faculty_details.co_instructors.length > 0 && (
                  <Box sx={{ flex: '1 1 250px' }}>
                    <Typography variant="subtitle1" fontWeight="bold">Co-Instructors</Typography>
                    {course.faculty_details.co_instructors.map((instructor, index) => (
                      <Typography key={index} variant="body2">• {instructor}</Typography>
                    ))}
                  </Box>
                )}

                {course.faculty_details.guest_lecturers && course.faculty_details.guest_lecturers.length > 0 && (
                  <Box sx={{ flex: '1 1 250px' }}>
                    <Typography variant="subtitle1" fontWeight="bold">Guest Lecturers</Typography>
                    {course.faculty_details.guest_lecturers.map((lecturer, index) => (
                      <Typography key={index} variant="body2">• {lecturer}</Typography>
                    ))}
                  </Box>
                )}

                {course.faculty_details.lab_instructors && course.faculty_details.lab_instructors.length > 0 && (
                  <Box sx={{ flex: '1 1 250px' }}>
                    <Typography variant="subtitle1" fontWeight="bold">Lab Instructors</Typography>
                    {course.faculty_details.lab_instructors.map((instructor, index) => (
                      <Typography key={index} variant="body2">• {instructor}</Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </Box>

        {/* Sidebar */}
        <Box sx={{ flex: 1, minWidth: '300px' }}>
          {/* Course Info Card */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Course Information</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Credits</Typography>
              <Typography variant="body1">{course.credits}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Semester</Typography>
              <Typography variant="body1">{course.semester}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Max Students</Typography>
              <Typography variant="body1">{course.max_students}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Type</Typography>
              <Typography variant="body1">
                {course.is_elective ? 'Elective' : 'Core'}
              </Typography>
            </Box>

            {course.prerequisites && course.prerequisites.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Prerequisites</Typography>
                {course.prerequisites.map((prereq, index) => (
                  <Chip key={index} label={prereq} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                ))}
              </Box>
            )}
          </Paper>

          {/* Department & Degree */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Academic Information</Typography>
            <Divider sx={{ mb: 2 }} />
            
            {course.department && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BusinessIcon fontSize="small" /> Department
                </Typography>
                <Typography variant="body1">
                  {course.department.name} ({course.department.code})
                </Typography>
              </Box>
            )}

            {course.degree && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SchoolIcon fontSize="small" /> Degree
                </Typography>
                <Typography variant="body1">
                  {course.degree.name} ({course.degree.code})
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Timeline */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Timeline</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Created</Typography>
              <Typography variant="body2">{formatDate(course.createdAt)}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Last Updated</Typography>
              <Typography variant="body2">{formatDate(course.updatedAt)}</Typography>
            </Box>

            {course.approved_at && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Approved</Typography>
                <Typography variant="body2">{formatDate(course.approved_at)}</Typography>
              </Box>
            )}

            {course.creator && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Created By</Typography>
                <Typography variant="body2">
                  {course.creator.first_name} {course.creator.last_name}
                </Typography>
              </Box>
            )}

            {course.approver && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Approved By</Typography>
                <Typography variant="body2">
                  {course.approver.first_name} {course.approver.last_name}
                </Typography>
              </Box>
            )}

            {course.updater && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Last Modified By</Typography>
                <Typography variant="body2">
                  {course.updater.first_name} {course.updater.last_name}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Rejection Reason */}
          {course.rejection_reason && course.status === 'draft' && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom color="error">Rejection Reason</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2">{course.rejection_reason}</Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default CourseDetailsView;
