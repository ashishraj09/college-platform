import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Collapse,
  IconButton,
  Chip,
  Alert,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  School as SchoolIcon,
  MenuBook as CourseIcon,
  Visibility as ViewIcon,
  AccessTime as DurationIcon,
  Star as CreditsIcon,
  Work as CareerIcon,
  Assignment as RequirementIcon,
  VerifiedUser as AccreditationIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { degreesAPI, coursesAPI } from '../../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';

interface Course {
  id: string;
  name: string;
  code: string;
  overview: string;
  credits: number;
  semester: number;
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'pending_activation' | 'active' | 'disabled' | 'archived';
  is_elective: boolean;
  degree?: {
    id?: string;
    name: string;
    code: string;
  };
}

interface Degree {
  id: string;
  name: string;
  code: string;
  description?: string;
  duration_years: number;
  status: string;
  degree_type?: string;
  total_credits?: number;
  specializations?: string;
  career_prospects?: string;
  admission_requirements?: string;
  accreditation?: string;
  study_mode?: string;
  fees?: string;
  location?: string;
  entry_requirements?: string;
  learning_outcomes?: string;
  assessment_methods?: string;
  department?: {
    name: string;
    code: string;
  };
}

const DegreesPage: React.FC = () => {
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDegree, setExpandedDegree] = useState<string | null>(null);
  const [degreeCourses, setDegreeCourses] = useState<{ [key: string]: Course[] }>({});
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  useEffect(() => {
    loadDegrees();
  }, []);

  const loadDegrees = async () => {
    try {
      setLoading(true);
      const degreesData = await degreesAPI.getFacultyDegrees(user?.department?.id);
      
      // Handle degrees data - check multiple possible structures
      let degrees = [];
      if (degreesData?.all) {
        degrees = degreesData.all;
      } else if (Array.isArray(degreesData)) {
        degrees = degreesData;
      } else if (degreesData?.data) {
        degrees = Array.isArray(degreesData.data) ? degreesData.data : degreesData.data.all || [];
      }
      setDegrees(degrees);
    } catch (error) {
      console.error('Error loading degrees:', error);
      enqueueSnackbar('Error loading degrees. Please try again.', { variant: 'error' });
      setDegrees([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCoursesForDegree = async (degreeId: string, degreeCode: string) => {
    try {
      // Check if courses for this degree are already loaded
      if (degreeCourses[degreeId]) {
        return;
      }

      const coursesData = await coursesAPI.getFacultyCourses(user?.department?.id, user?.id);
      
      // Handle courses data - the API returns { all: courses, categorized, summary }
      let allCourses = [];
      if (coursesData && coursesData.all) {
        allCourses = coursesData.all;
      } else if (Array.isArray(coursesData)) {
        allCourses = coursesData;
      }

      // Filter courses for this specific degree
      const filteredCourses = allCourses.filter((course: Course) => 
        course.degree?.code === degreeCode || course.degree?.id === degreeId
      );

      setDegreeCourses(prev => ({
        ...prev,
        [degreeId]: filteredCourses
      }));
    } catch (error) {
      console.error('Error loading courses for degree:', error);
      enqueueSnackbar('Error loading courses. Please try again.', { variant: 'error' });
    }
  };

  const handleDegreeExpand = async (degreeId: string, degreeCode: string) => {
    if (expandedDegree === degreeId) {
      setExpandedDegree(null);
    } else {
      setExpandedDegree(degreeId);
      await loadCoursesForDegree(degreeId, degreeCode);
    }
  };

  const handleViewCourse = (courseId: string) => {
    navigate(`/faculty/courses/${courseId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'submitted':
      case 'pending_approval':
        return 'warning';
      case 'approved':
        return 'info';
      case 'active':
        return 'success';
      case 'disabled':
      case 'archived':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading degrees...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon /> Degrees & Courses
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          Explore degrees in your department and view associated courses
        </Typography>
      </Paper>

      {degrees.length === 0 ? (
        <Alert severity="info">
          No degrees found in your department.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 3 }}>
          {degrees.map((degree) => (
            <Box key={degree.id}>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  {/* Header Section */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolIcon color="primary" />
                        {degree.name}
                      </Typography>
                      <Typography variant="h6" color="textSecondary" gutterBottom>
                        {degree.degree_type || 'Degree'} • {degree.code}
                      </Typography>
                    </Box>
                    <Chip 
                      label={degree.status} 
                      color={getStatusColor(degree.status) as any}
                      size="medium"
                    />
                  </Box>

                  {/* Quick Info Grid */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: 2, 
                    mb: 3,
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 1
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DurationIcon color="action" />
                      <Box>
                        <Typography variant="caption" color="textSecondary">Duration</Typography>
                        <Typography variant="body2" fontWeight={500}>{degree.duration_years} Years</Typography>
                      </Box>
                    </Box>
                    
                    {degree.total_credits && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CreditsIcon color="action" />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Total Credits</Typography>
                          <Typography variant="body2" fontWeight={500}>{degree.total_credits} Credits</Typography>
                        </Box>
                      </Box>
                    )}
                    
                    {degree.department && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolIcon color="action" />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Department</Typography>
                          <Typography variant="body2" fontWeight={500}>{degree.department.name}</Typography>
                        </Box>
                      </Box>
                    )}
                    
                    {degree.accreditation && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccreditationIcon color="action" />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Accreditation</Typography>
                          <Typography variant="body2" fontWeight={500}>{degree.accreditation}</Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>

                  {/* Description */}
                  {degree.description && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {degree.description}
                      </Typography>
                    </Box>
                  )}

                  {/* Specializations */}
                  {degree.specializations && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="primary">
                        Available Specializations:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {degree.specializations.split(',').map((spec, index) => (
                          <Chip key={index} label={spec.trim()} variant="outlined" size="small" />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Career Prospects */}
                  {degree.career_prospects && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CareerIcon fontSize="small" />
                        Career Prospects:
                      </Typography>
                      <Typography variant="body2" sx={{ pl: 3 }}>
                        {degree.career_prospects}
                      </Typography>
                    </Box>
                  )}

                  {/* Admission Requirements */}
                  {degree.admission_requirements && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RequirementIcon fontSize="small" />
                        Admission Requirements:
                      </Typography>
                      <Typography variant="body2" sx={{ pl: 3 }}>
                        {degree.admission_requirements}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions>
                  <Button
                    onClick={() => handleDegreeExpand(degree.id, degree.code)}
                    startIcon={expandedDegree === degree.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    size="small"
                  >
                    {expandedDegree === degree.id ? 'Hide' : 'Show'} Courses
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate(`/faculty/degrees/${degree.id}`)}
                    size="small"
                  >
                    View Details
                  </Button>
                </CardActions>

                <Collapse in={expandedDegree === degree.id} timeout="auto" unmountOnExit>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CourseIcon /> Courses in {degree.name}
                    </Typography>
                    
                    {degreeCourses[degree.id] && degreeCourses[degree.id].length === 0 ? (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        No courses found for this degree.
                      </Alert>
                    ) : (
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2, mt: 1 }}>
                        {degreeCourses[degree.id]?.map((course) => (
                          <Box key={course.id}>
                            <Card variant="outlined">
                              <CardContent sx={{ pb: 1 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                  {course.name}
                                </Typography>
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                  {course.code} • {course.credits} credits • Semester {course.semester}
                                </Typography>
                                {course.overview && (
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      mb: 1
                                    }}
                                  >
                                    {course.overview}
                                  </Typography>
                                )}
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  <Chip 
                                    label={course.status} 
                                    color={getStatusColor(course.status) as any}
                                    size="small"
                                  />
                                  {course.is_elective && (
                                    <Chip 
                                      label="Elective" 
                                      color="secondary"
                                      size="small"
                                    />
                                  )}
                                </Box>
                              </CardContent>
                              <CardActions sx={{ pt: 0 }}>
                                <Button
                                  size="small"
                                  startIcon={<ViewIcon />}
                                  onClick={() => handleViewCourse(course.id)}
                                >
                                  View Details
                                </Button>
                              </CardActions>
                            </Card>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Collapse>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default DegreesPage;
