import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Paper,
  // Removed unused imports
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  // Removed unused SchoolIcon
  AccessTime as DurationIcon,
  Star as CreditsIcon,
  Work as CareerIcon,
  Assignment as RequirementIcon,
  VerifiedUser as AccreditationIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  AttachMoney as FeesIcon,
  MenuBook as CourseIcon,
  ExpandMore as ExpandMoreIcon,
  // Removed unused icon
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { degreesAPI, coursesAPI } from '../../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';

interface DegreeDetails {
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

interface Course {
  id: string;
  name: string;
  code: string;
  overview: string;
  credits: number;
  semester: number;
  status: string;
  is_elective: boolean;
  degree?: {
    id?: string;
    name: string;
    code: string;
  };
}

const DegreeDetailsPage: React.FC = () => {
  const { degreeId } = useParams<{ degreeId: string }>();
  // Removed unused navigate
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [degree, setDegree] = useState<DegreeDetails | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (degreeId) {
      loadDegreeDetails();
      loadDegreeCourses();
    }
  }, [degreeId]);

  const loadDegreeDetails = async () => {
    try {
      setLoading(true);
      // This would need to be implemented in the API
      const degreeData = await degreesAPI.getDegreeById(degreeId!);
      setDegree(degreeData);
    } catch (error) {
      console.error('Error loading degree details:', error);
      enqueueSnackbar('Error loading degree details', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadDegreeCourses = async () => {
    try {
      const coursesData = await coursesAPI.getFacultyCourses(user?.department?.id, user?.id);
      let allCourses = [];
      if (coursesData && coursesData.all) {
        allCourses = coursesData.all;
      } else if (Array.isArray(coursesData)) {
        allCourses = coursesData;
      }
      
      // Filter courses for this specific degree
      const degreeCourses = allCourses.filter((course: Course) => 
        course.degree?.code === degree?.code
      );
      setCourses(degreeCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading || !degree) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading degree details...</Typography>
      </Box>
    );
  }

  const tabLabels = ['Overview', 'Courses', 'Admission', 'Fees & Study Options'];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Back Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          // onClick to /faculty/degrees removed
          sx={{ mb: 2 }}
        >
          Back to Degrees
        </Button>
        
        <Paper sx={{ p: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
            {degree.name}
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
            {degree.degree_type} • {degree.code} • {degree.department?.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              icon={<DurationIcon />}
              label={`${degree.duration_years} Years`} 
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
            {degree.total_credits && (
              <Chip 
                icon={<CreditsIcon />}
                label={`${degree.total_credits} Credits`} 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            )}
            {degree.study_mode && (
              <Chip 
                icon={<ScheduleIcon />}
                label={degree.study_mode} 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            )}
            {degree.location && (
              <Chip 
                icon={<LocationIcon />}
                label={degree.location} 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            )}
          </Box>
        </Paper>
      </Box>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {tabLabels.map((label, index) => (
            <Tab key={index} label={label} />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          {/* Program Overview */}
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                Program Overview
              </Typography>
              <Typography variant="body1" paragraph>
                {degree.description || 'No description available for this degree program.'}
              </Typography>
            </CardContent>
          </Card>

          {/* Learning Outcomes */}
          {degree.learning_outcomes && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  What you'll learn
                </Typography>
                <Typography variant="body1">
                  {degree.learning_outcomes}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Specializations */}
          {degree.specializations && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Specializations Available
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  {degree.specializations.split(',').map((spec, index) => (
                    <Chip key={index} label={spec.trim()} variant="outlined" color="primary" />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Career Prospects */}
          {degree.career_prospects && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CareerIcon />
                  Career Opportunities
                </Typography>
                <Typography variant="body1">
                  {degree.career_prospects}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Assessment Methods */}
          {degree.assessment_methods && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Assessment Methods
                </Typography>
                <Typography variant="body1">
                  {degree.assessment_methods}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Accreditation */}
          {degree.accreditation && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccreditationIcon />
                  Accreditation
                </Typography>
                <Typography variant="body1">
                  {degree.accreditation}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CourseIcon />
              Course Structure
            </Typography>
            {courses.length === 0 ? (
              <Alert severity="info">
                No courses have been defined for this degree program yet.
              </Alert>
            ) : (
              <Box sx={{ mt: 2 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].slice(0, degree.duration_years * 2).map(semester => {
                  const semesterCourses = courses.filter(course => course.semester === semester);
                  return (
                    <Accordion key={semester}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">
                          Semester {semester} ({semesterCourses.length} courses)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {semesterCourses.length === 0 ? (
                          <Typography color="textSecondary">No courses defined for this semester</Typography>
                        ) : (
                          <Box sx={{ display: 'grid', gap: 2 }}>
                            {semesterCourses.map(course => (
                              <Paper key={course.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                      {course.code}: {course.name}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                      {course.credits} credits • {course.is_elective ? 'Elective' : 'Core'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                      {course.overview}
                                    </Typography>
                                  </Box>
                                  <Chip 
                                    label={course.status} 
                                    color={course.status === 'active' ? 'success' : 'default'}
                                    size="small"
                                  />
                                </Box>
                              </Paper>
                            ))}
                          </Box>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RequirementIcon />
                Admission Requirements
              </Typography>
              <Typography variant="body1" paragraph>
                {degree.admission_requirements || 'Admission requirements will be updated soon.'}
              </Typography>
            </CardContent>
          </Card>

          {degree.entry_requirements && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Entry Requirements
                </Typography>
                <Typography variant="body1">
                  {degree.entry_requirements}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {activeTab === 3 && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FeesIcon />
                Fees & Study Options
              </Typography>
              {degree.fees ? (
                <Typography variant="body1" paragraph>
                  {degree.fees}
                </Typography>
              ) : (
                <Alert severity="info">
                  Fee information will be updated soon. Please contact the admissions office for current fee structure.
                </Alert>
              )}
            </CardContent>
          </Card>

          {degree.study_mode && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Study Options
                </Typography>
                <Typography variant="body1">
                  Study Mode: {degree.study_mode}
                </Typography>
                {degree.location && (
                  <Typography variant="body1">
                    Location: {degree.location}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DegreeDetailsPage;
