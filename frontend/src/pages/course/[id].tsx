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
  MenuBook as CourseIcon,
  Star as StarIcon,
  Business as DepartmentIcon,
  School as SchoolIcon,
  ArrowBack as BackIcon,
  CheckCircle as ActiveIcon,
  Pending as PendingIcon,
  Draft as DraftIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { coursesAPI } from '../../services/api';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

interface Course {
  id: string;
  name: string;
  code: string;
  description?: string;
  overview?: string;
  credits: number;
  semester: number;
  status?: string;
  department?: { name: string; code: string };
  degree?: { name: string; code: string };
  study_details?: any;
  faculty_details?: any;
  created_at?: string;
  created_by?: string;
  activated_at?: string;
  activated_by?: string;
}

const CourseDetailPage: React.FC = () => {
  const [course, setCourse] = useState<Course | null>(null);
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

    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError(null);

        const idOrCode = Array.isArray(id) ? id[0] : id;

        let data;
        if (isUUID(idOrCode)) {
          // Authenticated view - fetch by ID (requires auth)
          data = await coursesAPI.getCourseById(idOrCode);
        } else {
          // Public view - fetch by code (no auth required)
          data = await coursesAPI.getPublicCourseByCode(idOrCode);
        }

        if (data.error) {
          setError(data.error);
        } else {
          setCourse(data.course || data);
        }
      } catch (err: any) {
        console.error('Error fetching course:', err);
        setError(err.message || 'Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

  const handleBackClick = () => {
    if (course?.degree?.code) {
      router.push(`/degree/${course.degree.code}`);
    } else if (user) {
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

  const statusInfo = getStatusInfo(course?.status);

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
            Loading course details...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error || !course) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <CourseIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            {error || 'Course not found'}
          </Typography>
          <Button variant="contained" onClick={handleBackClick} sx={{ mt: 2 }}>
            Go Back
          </Button>
        </Box>
      </Container>
    );
  }

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
          <Link href={user ? '/' : '/homepage'} passHref legacyBehavior>
            <MuiLink color="inherit" sx={{ cursor: 'pointer' }}>
              Home
            </MuiLink>
          </Link>
          {course.degree && (
            <Link href={`/degree/${course.degree.code}`} passHref legacyBehavior>
              <MuiLink color="inherit" sx={{ cursor: 'pointer' }}>
                {course.degree.name}
              </MuiLink>
            </Link>
          )}
          <Typography color="text.primary">{course.name}</Typography>
        </Breadcrumbs>

        {/* Back Button */}
        <Button startIcon={<BackIcon />} onClick={handleBackClick} sx={{ mb: 3 }}>
          Back{course.degree ? ` to ${course.degree.name}` : ''}
        </Button>

        {/* Main Content Card */}
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 3 }}>
              <Box
                sx={{
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  borderRadius: 2,
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CourseIcon sx={{ fontSize: 48, color: 'secondary.main' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h3" fontWeight={700} color="secondary">
                    {course.name}
                  </Typography>
                  <Chip label={course.code} color="secondary" variant="outlined" sx={{ fontWeight: 600 }} />
                  {course.status && (
                    <Chip
                      icon={statusInfo.icon}
                      label={statusInfo.label}
                      color={statusInfo.color as any}
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Box>
                {course.description && (
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 2, lineHeight: 1.7 }}>
                    {course.description}
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
                    bgcolor: alpha(theme.palette.success.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                  }}
                >
                  <StarIcon sx={{ fontSize: 36, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>
                    {course.credits}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Credits
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  <CourseIcon sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>
                    Semester {course.semester}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Semester
                  </Typography>
                </Paper>
              </Grid>
              {course.department && (
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
                      {course.department.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Department
                    </Typography>
                  </Paper>
                </Grid>
              )}
              {course.degree && (
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: alpha(theme.palette.secondary.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                    }}
                  >
                    <SchoolIcon sx={{ fontSize: 36, color: 'secondary.main', mb: 1 }} />
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {course.degree.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Degree Programme
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
                    Course Metadata
                  </Typography>
                  <Grid container spacing={2}>
                    {course.created_at && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Created: {new Date(course.created_at).toLocaleDateString()}
                        </Typography>
                      </Grid>
                    )}
                    {course.activated_at && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Activated: {new Date(course.activated_at).toLocaleDateString()}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </>
            )}

            <Divider sx={{ my: 4 }} />

            {/* Course Overview */}
            {course.overview && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Course Overview
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                  {course.overview}
                </Typography>
              </Box>
            )}

            {/* Study Details */}
            {course.study_details && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Study Details
                </Typography>
                <Paper sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                  {typeof course.study_details === 'object' ? (
                    <Grid container spacing={2}>
                      {Object.entries(course.study_details).map(([key, value]) => (
                        <Grid item xs={12} sm={6} key={key}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            {key.replace(/_/g, ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="body1">{String(value)}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body1">{JSON.stringify(course.study_details)}</Typography>
                  )}
                </Paper>
              </Box>
            )}

            {/* Faculty Details */}
            {course.faculty_details && (
              <Box>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Faculty Information
                </Typography>
                <Paper sx={{ p: 3, bgcolor: alpha(theme.palette.secondary.main, 0.02) }}>
                  {typeof course.faculty_details === 'object' ? (
                    <Grid container spacing={2}>
                      {Object.entries(course.faculty_details).map(([key, value]) => (
                        <Grid item xs={12} sm={6} key={key}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            {key.replace(/_/g, ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="body1">{String(value)}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography variant="body1">{JSON.stringify(course.faculty_details)}</Typography>
                  )}
                </Paper>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

// Disable the default DashboardLayout for this page (allow public access)
CourseDetailPage.getLayout = (page: React.ReactElement) => page;

export default CourseDetailPage;
