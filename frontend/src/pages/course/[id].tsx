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
  alpha,
  useTheme,
  Breadcrumbs,
  Link as MuiLink,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
// (Using standard Grid import from @mui/material)
import {
  MenuBook as CourseIcon,
  Star as StarIcon,
  Business as DepartmentIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon,
  ArrowBack as BackIcon,
  CheckCircle as ActiveIcon,
  Pending as PendingIcon,
  Drafts as DraftIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import { Login as LoginIcon, AccountCircle, ExitToApp } from '@mui/icons-material';
import Link from 'next/link';
import { coursesAPI } from '../../services/api';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import DOMPurify from 'dompurify';
import PublicShell from '../../components/PublicShell';

// Log imported icons to help diagnose undefined-import runtime errors
if (typeof window !== 'undefined') {
  // Only run in browser
  // eslint-disable-next-line no-console
  console.debug('CourseDetailPage icons:', {
    CourseIcon,
    StarIcon,
    DepartmentIcon,
    SchoolIcon,
    BackIcon,
    ActiveIcon,
    PendingIcon,
    DraftIcon,
    ArchiveIcon,
  });
}

// Safe icon renderer: returns element or undefined if component is undefined
const renderIcon = (Comp: any, props?: any) => {
  if (!Comp) return undefined;
  try {
    return <Comp {...props} />;
  } catch (e) {
    // swallow render errors and return undefined so callers can handle absence
    return undefined;
  }
};

// HTML rendering helpers
const sanitizeHtml = (html: string) => {
  if (!html) return '';
  try {
    if (typeof window === 'undefined') {
      // Server fallback: remove tags
      return (html || '').replace(/<[^>]*>?/gm, '');
    }
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  } catch (e) {
    return (html || '').replace(/<[^>]*>?/gm, '');
  }
};

const renderHtmlContent = (content: any) => {
  if (content === null || content === undefined) return null;
  // Arrays: render as list
  if (Array.isArray(content)) {
    return (
      <Box component="ul" sx={{ pl: 3, mb: 2 }}>
        {content.map((item: any, i: number) => (
          <li key={i}>
            {typeof item === 'string' ? (
              // render HTML string
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(item) }} />
            ) : (
              String(item)
            )}
          </li>
        ))}
      </Box>
    );
  }

  if (typeof content === 'string') {
    // Render as sanitized HTML on client, fallback to stripped HTML on server
    return <Box dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />;
  }

  // Objects - pretty print keys
  if (typeof content === 'object') {
    return (
      <Box>
        {Object.entries(content).map(([k, v]) => (
          <Box key={k} sx={{ mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {k.replace(/_/g, ' ').toUpperCase()}
            </Typography>
            {renderHtmlContent(v)}
          </Box>
        ))}
      </Box>
    );
  }

  // fallback
  return <Typography variant="body1">{String(content)}</Typography>;
};

const adminOnlyKeys = new Set([
  'created_by','updated_by','approved_by','submitted_at','approved_at','parent_course_id','version','is_latest_version'
]);

// PublicShell provides shared header/footer for public pages

// Grid compatibility alias: MUI Grid typings in this project are strict; use an any-typed alias
const GridCompat: any = Grid;

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
  prerequisites?: any;
  learning_objectives?: string;
  course_outcomes?: string;
  assessment_methods?: string;
  textbooks?: string;
  references?: string;
  max_students?: number;
  created_at?: string;
  created_by?: string;
  activated_at?: string;
  activated_by?: string;
  updated_by?: string;
  approved_by?: string;
  submitted_at?: string;
  approved_at?: string;
  updated_at?: string;
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
          // Authenticated preview view - call the dedicated preview endpoint which returns meta fields
          data = await coursesAPI.getPreviewCourseById(idOrCode);
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
        return { icon: renderIcon(ActiveIcon), color: 'success', label: 'Active' };
      case 'approved':
        return { icon: renderIcon(ActiveIcon), color: 'success', label: 'Approved' };
      case 'pending_approval':
        return { icon: renderIcon(PendingIcon), color: 'warning', label: 'Pending Approval' };
      case 'draft':
        return { icon: renderIcon(DraftIcon), color: 'default', label: 'Draft' };
      case 'archived':
        return { icon: renderIcon(ArchiveIcon), color: 'default', label: 'Archived' };
      default:
        return { icon: renderIcon(DraftIcon), color: 'default', label: status ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown' };
    }
  };

  const statusInfo = getStatusInfo(course?.status);

  // Status icon mapping (used in the meta box)
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return renderIcon(ActiveIcon, { sx: { color: 'success.main', mr: 1 } });
      case 'approved':
        return renderIcon(ActiveIcon, { sx: { color: 'success.main', mr: 1 } });
      case 'pending_approval':
        return renderIcon(PendingIcon, { sx: { color: 'warning.main', mr: 1 } });
      case 'draft':
        return renderIcon(DraftIcon, { sx: { color: 'grey.500', mr: 1 } });
      case 'archived':
        return renderIcon(ArchiveIcon, { sx: { color: 'grey.500', mr: 1 } });
      default:
        return renderIcon(DraftIcon, { sx: { color: 'grey.500', mr: 1 } });
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
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
      <Container maxWidth="xl" sx={{ py: 8, textAlign: 'center', px: { xs: 1, md: 2 } }}>
        <Box sx={{ py: 8, textAlign: 'center' }}>
          {renderIcon(CourseIcon, { sx: { fontSize: 80, color: 'text.secondary', mb: 2 } })}
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

  const coursesBySemester = course.study_details?.semesters ? course.study_details.semesters : {};

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column">
      {/* Hero Banner */}
      <Box
        sx={{
          color: 'white',
          py: 8,
          backgroundImage: 'url(/static/students-homepage.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 2, px: { xs: 1, md: 2 } }}>
          <Typography
            variant="h2"
            fontWeight={700}
            gutterBottom
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              textShadow: '2px 2px 4px rgba(0,0,0,0.6)'
            }}
          >
            {course.name}
          </Typography>
          {/* code/status chips removed from hero (meta box handles status in preview) */}
          {/* Render description as sanitized HTML so tags (e.g. <p>) are respected like the degree page */}
          {/* Hero shows only the title to match degree layout; description will appear in the card below the image */}
        </Container>

        {/* Meta box - visually integrated within hero, matching degree page style */}
        {user && isUUID(Array.isArray(id) ? id[0] : id || '') && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              right: { xs: 24, md: 56 },
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,0.92)',
              color: 'text.primary',
              borderRadius: 4,
              boxShadow: 6,
              p: 3,
              minWidth: 320,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              backdropFilter: 'blur(3px)',
            }}
          >
            {course.status && (
              <Chip
                icon={getStatusIcon(course.status || '')}
                label={getStatusInfo(course.status).label}
                color={course.status === 'active' || course.status === 'approved' ? 'success' : course.status === 'pending_approval' ? 'warning' : 'default'}
                sx={{ mb: 2, fontWeight: 700, fontSize: '1.1rem', px: 2, height: 40, borderRadius: 8, letterSpacing: 0.2, textTransform: 'none' }}
              />
            )}
            {course.created_by && course.created_at && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.3 }}>
                  Created by: {course.created_by} on {new Date(course.created_at).toLocaleDateString()}
                </Typography>
              </Box>
            )}
            {course.updated_by && course.updated_at && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.3 }}>
                  Last modified by: {course.updated_by} on {new Date(course.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
            )}
            {['approved', 'active', 'archived'].includes(course.status || '') && course.approved_by && course.approved_at && (
              <Box>
                <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.3 }}>Approved by: {course.approved_by}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.3 }}>Approved: {new Date(course.approved_at).toLocaleDateString()}</Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

  <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 8 } }}>
        {/* Main content (no outer card) */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ p: 4 }}>
            {/* Centered content area: remove left icon and center info like degree page */}
            <Box sx={{ maxWidth: 920, mx: 'auto', textAlign: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {renderIcon(CourseIcon, { sx: { color: 'primary.main', fontSize: 20 } })}
                  <Box>
                    <Typography variant="body2" color="text.secondary">Code</Typography>
                    <Typography variant="h6" fontWeight={700}>{course.code}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {renderIcon(StarIcon, { sx: { color: 'primary.main', fontSize: 20 } })}
                  <Box>
                    <Typography variant="body2" color="text.secondary">Credits</Typography>
                    <Typography variant="h6" fontWeight={700}>{course.credits}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {renderIcon(ScheduleIcon, { sx: { color: 'primary.main', fontSize: 20 } })}
                  <Box>
                    <Typography variant="body2" color="text.secondary">Semester</Typography>
                    <Typography variant="h6" fontWeight={700}>{course.semester}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {renderIcon(DepartmentIcon, { sx: { color: 'primary.main', fontSize: 20 } })}
                  <Box>
                    <Typography variant="body2" color="text.secondary">Department Code</Typography>
                    <Typography variant="h6" fontWeight={700}>{course.department?.code || (course as any).department_code || ''}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>


              <Box sx={{ mb: 4 }}>
                {renderHtmlContent(course.description)}
              </Box>

            {course.study_details && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Study Details
                  </Typography>
                  <Box sx={{ pt: 1 }}>{renderHtmlContent(course.study_details)}</Box>
                </Box>
              </>
            )}

            {/* Requirements / Prerequisites */}
            {course.prerequisites && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Requirements
                  </Typography>
                  <Box sx={{ pl: { xs: 0, md: 0 }, pt: 1 }}>
                    <Box sx={{ mb: 1 }}>{renderHtmlContent(course.prerequisites)}</Box>
                  </Box>
                </Box>
              </>
            )}

            {/* Learning objectives */}
            {course.learning_objectives && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Learning Objectives
                  </Typography>
                  <Box sx={{ pt: 1 }}>{renderHtmlContent(course.learning_objectives)}</Box>
                </Box>
              </>
            )}

            {/* Course outcomes */}
            {course.course_outcomes && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Outcomes
                  </Typography>
                  <Box sx={{ pt: 1 }}>{renderHtmlContent(course.course_outcomes)}</Box>
                </Box>
              </>
            )}

            {/* Assessment methods */}
            {course.assessment_methods && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Assessment Methods
                  </Typography>
                  <Box sx={{ pt: 1 }}>{renderHtmlContent(course.assessment_methods)}</Box>
                </Box>
              </>
            )}

            {/* Textbooks & references */}
            {course.textbooks && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Textbooks
                  </Typography>
                  <Box sx={{ pt: 1 }}>{renderHtmlContent(course.textbooks)}</Box>
                </Box>
              </>
            )}

            {course.references && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    References
                  </Typography>
                  <Box sx={{ pt: 1 }}>{renderHtmlContent(course.references)}</Box>
                </Box>
              </>
            )}

            {course.faculty_details && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Faculty Details
                  </Typography>
                  <Box sx={{ pt: 1 }}>{renderHtmlContent(course.faculty_details)}</Box>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

// Use the app's default layout so the global header/footer and site chrome are applied.
// (Removed the custom getLayout override that prevented the global layout from rendering.)

// Disable the default DashboardLayout for this page but wrap with PublicShell
// @ts-expect-error: Next.js custom property
CourseDetailPage.getLayout = (page: React.ReactNode) => <PublicShell>{page}</PublicShell>;

export default CourseDetailPage;
