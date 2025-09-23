import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Paper,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Business as DepartmentIcon,
  CreditCard as CreditIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { enrollmentAPI, departmentsAPI, coursesAPI } from '../../services/api';
import type { UniversityDepartment } from '../../services/api';

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
}

const UniversityCoursesTab: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [universityCourses, setUniversityCourses] = useState<UniversityDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [expandedDegrees, setExpandedDegrees] = useState<Set<string>>(new Set());
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchDepartments();
    fetchUniversityCourses(); // Load all courses initially
  }, []);

  useEffect(() => {
    fetchUniversityCourses();
  }, [selectedDepartmentId]);

  const fetchDepartments = async () => {
    try {
      const data = await departmentsAPI.getDepartments({ status: 'active' });
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      enqueueSnackbar('Failed to fetch departments', { variant: 'error' });
    }
  };

  const fetchUniversityCourses = async () => {
    try {
      setCoursesLoading(true);
      const params = selectedDepartmentId ? { status: 'active' } : undefined;
      const departments = await departmentsAPI.getDepartments(params ? { status: 'active' } : undefined);
      const filtered = selectedDepartmentId ? departments.filter((d: any) => d.id === selectedDepartmentId) : departments;

      const results: any[] = [];
      for (const dept of filtered) {
        const deptCourses = await coursesAPI.getDepartmentCourses({ departmentId: dept.id });
        const degreesMap: Record<string, any> = {};
        for (const course of deptCourses) {
          const degreeCode = course.degree?.code || 'unknown';
          if (!degreesMap[degreeCode]) {
            degreesMap[degreeCode] = {
              id: course.degree?.id || degreeCode,
              name: course.degree?.name || 'General',
              code: degreeCode,
              duration_years: course.degree?.duration_years || 0,
              courses: [],
            };
          }
          degreesMap[degreeCode].courses.push(course);
        }
        results.push({
          id: dept.id,
          name: dept.name,
          code: dept.code,
          description: dept.description,
          status: dept.status,
          degrees: Object.values(degreesMap),
        });
      }

      setUniversityCourses(results);
    } catch (error) {
      console.error('Error fetching university courses:', error);
      enqueueSnackbar('Failed to fetch courses', { variant: 'error' });
    } finally {
      setCoursesLoading(false);
      setLoading(false);
    }
  };

  const handleDepartmentChange = (event: SelectChangeEvent<string>) => {
    setSelectedDepartmentId(event.target.value);
  };

  const toggleDegreeExpansion = (degreeId: string) => {
    setExpandedDegrees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(degreeId)) {
        newSet.delete(degreeId);
      } else {
        newSet.add(degreeId);
      }
      return newSet;
    });
  };

  // Group courses by semester for each degree
  const groupCoursesBySemester = (courses: any[]) => {
    return courses.reduce((acc, course) => {
      if (!acc[course.semester]) {
        acc[course.semester] = [];
      }
      acc[course.semester].push(course);
      return acc;
    }, {} as Record<number, any[]>);
  };

  const getTotalCredits = (courses: any[]) => {
    return courses.reduce((total, course) => total + (course.credits || 0), 0);
  };

  const getCoursesCount = (courses: any[]) => {
    const required = courses.filter(c => !c.is_elective).length;
    const elective = courses.filter(c => c.is_elective).length;
    return { required, elective, total: courses.length };
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Loading university courses...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SchoolIcon />
        Browse University Courses
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Explore courses from all departments and degrees across the university (View Only)
      </Typography>

      {/* Department Filter */}
      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 250 }}>
          <InputLabel>Filter by Department</InputLabel>
          <Select
            value={selectedDepartmentId}
            onChange={handleDepartmentChange}
            label="Filter by Department"
          >
            <MenuItem value="">
              <em>All Departments</em>
            </MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {coursesLoading ? (
        <Box>
          <Typography variant="body1" gutterBottom>Loading courses...</Typography>
          <LinearProgress />
        </Box>
      ) : universityCourses.length === 0 ? (
        <Alert severity="info">
          <Typography>No departments or courses found.</Typography>
        </Alert>
      ) : (
        <Box>
          {universityCourses.map((department) => (
            <Paper key={department.id} sx={{ mb: 3 }}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DepartmentIcon />
                  {department.name} ({department.code})
                </Typography>
                {department.description && (
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {department.description}
                  </Typography>
                )}

                {department.degrees.length === 0 ? (
                  <Alert severity="info">
                    <Typography>No active degrees found in this department.</Typography>
                  </Alert>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    {department.degrees.map((degree) => {
                      const coursesBySemester = groupCoursesBySemester(degree.courses);
                      const coursesCount = getCoursesCount(degree.courses);
                      const totalCredits = getTotalCredits(degree.courses);
                      const isExpanded = expandedDegrees.has(degree.id);

                      return (
                        <Accordion 
                          key={degree.id} 
                          expanded={isExpanded}
                          onChange={() => toggleDegreeExpansion(degree.id)}
                          sx={{ mb: 2 }}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ width: '100%', pr: 1 }}>
                              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SchoolIcon />
                                {degree.name} ({degree.code})
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                <Chip 
                                  size="small" 
                                  label={`${degree.duration_years} years`}
                                  variant="outlined"
                                />
                                <Chip 
                                  size="small" 
                                  label={`${coursesCount.total} courses`}
                                  color="primary"
                                />
                                <Chip 
                                  size="small" 
                                  label={`${totalCredits} credits`}
                                  color="secondary"
                                />
                                {coursesCount.elective > 0 && (
                                  <Chip 
                                    size="small" 
                                    label={`${coursesCount.elective} electives`}
                                    color="info"
                                  />
                                )}
                              </Box>
                              {degree.description && (
                                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                  {degree.description}
                                </Typography>
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            {degree.courses.length === 0 ? (
                              <Alert severity="info">
                                <Typography>No active courses found in this degree program.</Typography>
                              </Alert>
                            ) : (
                              <Box>
                                {Object.keys(coursesBySemester)
                                  .sort((a, b) => Number(a) - Number(b))
                                  .map(semester => (
                                    <Box key={semester} sx={{ mb: 3 }}>
                                      <Typography 
                                        variant="subtitle1" 
                                        gutterBottom 
                                        sx={{ 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: 1,
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        <ScheduleIcon />
                                        Semester {semester}
                                        <Chip 
                                          size="small" 
                                          label={`${coursesBySemester[Number(semester)].length} courses`}
                                          variant="outlined"
                                        />
                                      </Typography>
                                      <Box sx={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }, 
                                        gap: 2,
                                        mt: 2
                                      }}>
                                        {coursesBySemester[Number(semester)].map((course: any) => (
                                          <Card key={course.id} sx={{ height: '100%' }}>
                                            <CardContent>
                                              <Typography variant="subtitle1" gutterBottom>
                                                {course.name}
                                              </Typography>
                                              <Typography variant="body2" color="textSecondary" gutterBottom>
                                                {course.code}
                                              </Typography>
                                              
                                              <Box sx={{ mb: 2 }}>
                                                <Chip
                                                  icon={<CreditIcon />}
                                                  label={`${course.credits} Credits`}
                                                  size="small"
                                                  sx={{ mr: 1 }}
                                                />
                                                {course.is_elective && (
                                                  <Chip
                                                    label="Elective"
                                                    size="small"
                                                    color="info"
                                                    variant="outlined"
                                                  />
                                                )}
                                              </Box>

                                              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                                {course.overview.length > 100 
                                                  ? `${course.overview.substring(0, 100)}...`
                                                  : course.overview
                                                }
                                              </Typography>

                                              {course.prerequisites && course.prerequisites.length > 0 && (
                                                <Typography variant="caption" color="textSecondary">
                                                  Prerequisites: {course.prerequisites.join(', ')}
                                                </Typography>
                                              )}
                                            </CardContent>

                                            <CardActions sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                              <Typography variant="caption" color="textSecondary">
                                                by {course.creator.first_name} {course.creator.last_name}
                                              </Typography>
                                              
                                              <Box>
                                                <Tooltip title="View Course Details">
                                                  <IconButton size="small">
                                                    <ViewIcon />
                                                  </IconButton>
                                                </Tooltip>
                                              </Box>
                                            </CardActions>
                                          </Card>
                                        ))}
                                      </Box>
                                    </Box>
                                  ))}
                              </Box>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Box>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default UniversityCoursesTab;
