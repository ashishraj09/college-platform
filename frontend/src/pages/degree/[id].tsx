import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Chip,
  Grid,
  Paper,
  CircularProgress,
  Button,
  Divider,
  Card,
  CardContent,
  alpha,
  useTheme,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import {
  School as SchoolIcon,
  AccessTime as DurationIcon,
  Business as DepartmentIcon,
  MenuBook as CourseIcon,
  Star as StarIcon,
  ArrowBack as BackIcon,
  CheckCircle as ActiveIcon,
  Pending as PendingIcon,
  Draft as DraftIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { degreesAPI } from '../../services/api';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

interface Degree {
  id: string;
  name: string;
  code: string;
  description?: string;
  duration_years: number;
  status?: string;
  department?: { name: string; code: string };
  courses?: Course[];
  total_credits?: number;
  created_at?: string;
  created_by?: string;
  activated_at?: string;
  activated_by?: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  description?: string;
}

const DegreeDetailPage: React.FC = () => {
  const [degree, setDegree] = useState<Degree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const { id } = router.query;

  // Determine if this is a public view (code) or authenticated view (UUID)
  const isUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  useEffect(() => {
    if (!id) return;

    const fetchDegree = async () => {
      try {
        setLoading(true);
        setError(null);

        const idOrCode = Array.isArray(id) ? id[0] : id;

        let data;
        if (isUUID(idOrCode)) {
          // Authenticated view - fetch by ID (requires auth)
          data = await degreesAPI.getDegreeById(idOrCode);
        } else {
          // Public view - fetch by code (no auth required)
          data = await degreesAPI.getPublicDegreeByCode(idOrCode);
        }

        if (data.error) {
          setError(data.error);
        } else {
          setDegree(data.degree || data);
        }
      } catch (err: any) {
        console.error('Error fetching degree:', err);
        setError(err.message || 'Failed to load degree');
      } finally {
        setLoading(false);
      }
    };

    fetchDegree();
  }, [id]);

  const handleCourseClick = (courseCode: string) => {
    router.push(`/course/${courseCode}`);
  };

  const handleBackClick = () => {
    if (user) {
      router.push('/');
    } else {
      router.push('/homepage');
    }
  };

  // Get status icon and color
  const getStatusInfo = (status?: string) => {
    switch (status) {
      case 'active':
        return { icon: <ActiveIcon />, color: 'success', label: 'Active' };
      case 'pending_approval':
        return { icon: <PendingIcon />, color: 'warning', label: 'Pending Approval' };
      case 'draft':
        return { icon: <DraftIcon />, color: 'default', label: 'Draft' };
      case 'archived':
        return { icon: <ArchiveIcon />, color: 'error', label: 'Archived' };
      default:
        return { icon: <DraftIcon />, color: 'default', label: status || 'Unknown' };
    }
  };

  const statusInfo = getStatusInfo(degree?.status);

  // Group courses by semester
  const groupCoursesBySemester = (courses?: Course[]) => {
    if (!courses) return {};
    return courses.reduce((acc, course) => {
      const sem = course.semester || 0;
      if (!acc[sem]) acc[sem] = [];
      acc[sem].push(course);
      return acc;
    }, {} as Record<number, Course[]>);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="80vh"
        >
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading degree details...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error || !degree) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <SchoolIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            {error || 'Degree not found'}
          </Typography>
          <Button variant="contained" onClick={handleBackClick} sx={{ mt: 2 }}>
            Go Back
          </Button>
        </Box>
      </Container>
    );
  }

  const coursesBySemester = groupCoursesBySemester(degree.courses);
  const totalCourses = degree.courses?.length || 0;
  const totalCredits = degree.total_credits || 0;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(
          theme.palette.secondary.light,
          0.05
        )} 100%)`,
        pb: 8,
      }}
    >
      <Container maxWidth="lg" sx={{ pt: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link href="/" passHref legacyBehavior>
            <MuiLink color="inherit" sx={{ cursor: 'pointer' }}>
              Home
            </MuiLink>
          </Link>
          <Typography color="text.primary">{degree.name}</Typography>
        </Breadcrumbs>

        {/* Back Button */}
        <Button startIcon={<BackIcon />} onClick={handleBackClick} sx={{ mb: 3 }}>
          Back to Programmes
        </Button>

        {/* Main Content Card */}
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 3 }}>
              <Box
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRadius: 2,
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SchoolIcon sx={{ fontSize: 48, color: 'primary.main' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h3" fontWeight={700} color="primary">
                    {degree.name}
                  </Typography>
                  <Chip label={degree.code} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                  {degree.status && (
                    <Chip
                      icon={statusInfo.icon}
                      label={statusInfo.label}
                      color={statusInfo.color as any}
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Box>
                {degree.description && (
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 2, lineHeight: 1.7 }}>
                    {degree.description}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Quick Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  <DurationIcon sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>
                    {degree.duration_years} Years
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Programme Duration
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.secondary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                  }}
                >
                  <CourseIcon sx={{ fontSize: 36, color: 'secondary.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>
                    {totalCourses}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Courses
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.success.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                  }}
                >
                  <StarIcon sx={{ fontSize: 36, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>
                    {totalCredits}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Credits
                  </Typography>
                </Paper>
              </Grid>
              {degree.department && (
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: alpha(theme.palette.info.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                    }}
                  >
                    <DepartmentIcon sx={{ fontSize: 36, color: 'info.main', mb: 1 }} />
                    <Typography variant="body2" fontWeight={600}>
                      {degree.department.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Department
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>

            {/* Metadata (for authenticated users viewing by ID) */}
            {user && isUUID(Array.isArray(id) ? id[0] : id || '') && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Programme Metadata
                  </Typography>
                  <Grid container spacing={2}>
                    {degree.created_at && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Created: {new Date(degree.created_at).toLocaleDateString()}
                        </Typography>
                      </Grid>
                    )}
                    {degree.activated_at && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Activated: {new Date(degree.activated_at).toLocaleDateString()}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </>
            )}

            <Divider sx={{ my: 4 }} />

            {/* Course Curriculum */}
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
                Course Curriculum
              </Typography>

              {Object.keys(coursesBySemester).length === 0 ? (
                <Typography variant="body1" color="text.secondary">
                  No courses available for this programme yet.
                </Typography>
              ) : (
                Object.keys(coursesBySemester)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((semester) => (
                    <Box key={semester} sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Chip
                          label={`Semester ${semester}`}
                          color="primary"
                          sx={{ fontWeight: 600, fontSize: '1rem' }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          ({coursesBySemester[Number(semester)].length} courses,{' '}
                          {coursesBySemester[Number(semester)].reduce((sum, c) => sum + (c.credits || 0), 0)}{' '}
                          credits)
                        </Typography>
                      </Box>
                      <Grid container spacing={2}>
                        {coursesBySemester[Number(semester)].map((course) => (
                          <Grid item xs={12} sm={6} md={4} key={course.id}>
                            <Card
                              sx={{
                                height: '100%',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  boxShadow: 4,
                                  transform: 'translateY(-4px)',
                                },
                              }}
                              onClick={() => handleCourseClick(course.code)}
                            >
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Chip label={course.code} size="small" variant="outlined" color="primary" />
                                  <Chip label={`${course.credits} Credits`} size="small" color="success" />
                                </Box>
                                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                  {course.name}
                                </Typography>
                                {course.description && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      mt: 1,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {course.description}
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  ))
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

// Disable the default DashboardLayout for this page (allow public access)
DegreeDetailPage.getLayout = (page: React.ReactElement) => page;

export default DegreeDetailPage;
