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
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import {
  School as SchoolIcon,
  AccessTime as DurationIcon,
  Business as DepartmentIcon,
  MenuBook as CourseIcon,
  Star as StarIcon,
  ArrowBack as BackIcon,
  CheckCircle as ActiveIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Drafts as DraftIcon,
  Archive as ArchiveIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Login as LoginIcon,
  AccountCircle,
  ExitToApp,
} from '@mui/icons-material';
import Link from 'next/link';
import { degreesAPI } from '../../services/api';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import PublicShell from '../../components/PublicShell';

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
  updated_at?: string;
  updated_by?: string;
  approved_by?: string;
  approved_at?: string;
  career_prospects?: string;
  learning_outcomes?: string;
  specializations?: string;
    accreditation?: string;
    entry_requirements?: string;
    fees?: string;
    application_process?: string;
    application_deadlines?: string;
    contact_information?: string;
    prerequisites?: string;
    study_details?: string;
    admission_requirements?: string;
    assessment_methods?: string;
    faculty_details?: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  description?: string;
}

// PublicShell provides a shared header/footer for public pages

const DegreeDetailPage: React.FC = () => {
  const [degree, setDegree] = useState<Degree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSemester, setExpandedSemester] = useState<string | false>(false);
  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
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
          // Authenticated preview view - fetch by ID (department-limited)
          data = await degreesAPI.getPreviewDegreeById(idOrCode);
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
  }, [id, user]);

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

  const handleAccordionChange = (semester: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSemester(isExpanded ? semester : false);
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

  // Status icon mapping
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />;
    case 'pending_approval':
      return <PendingIcon sx={{ color: 'warning.main', mr: 1 }} />;
    case 'draft':
      return <DraftIcon sx={{ color: 'info.main', mr: 1 }} />;
    case 'archived':
      return <ArchiveIcon sx={{ color: 'error.main', mr: 1 }} />;
    default:
      return <DraftIcon sx={{ color: 'grey.500', mr: 1 }} />;
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
            Loading degree details...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error || !degree) {
    return (
      <Container maxWidth="xl" sx={{ py: 8, textAlign: 'center', px: { xs: 1, md: 2 } }}>
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
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                textShadow: '2px 2px 4px rgba(0,0,0,0.7)'
              }}
            >
              {degree.name}
            </Typography>
          </Container>

          {/* Add meta details box absolutely positioned top right of hero image */}
          {user && isUUID(Array.isArray(id) ? id[0] : id || '') && (
            <Box sx={{
              position: 'absolute',
              top: { xs: 16, md: 32 },
              right: { xs: 16, md: 48 },
              bgcolor: 'rgba(255,255,255,0.7)', // More translucent
              color: 'text.primary',
              borderRadius: 3,
              boxShadow: 4,
              p: 3,
              minWidth: 260,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              backdropFilter: 'blur(2px)', // subtle blur for glass effect
            }}>
              {/* Status badge with icon */}
              {degree.status && (
                <Chip
                  icon={getStatusIcon(degree.status)}
                  label={degree.status}
                  color={degree.status === 'active' ? 'success' : degree.status === 'pending_approval' ? 'warning' : degree.status === 'draft' ? 'info' : 'error'}
                  sx={{ mb: 2, fontWeight: 700, fontSize: '1rem', px: 2 }}
                />
              )}
              {/* Created by/at */}
              {degree.created_by && degree.created_at && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={500}>Created by: {degree.created_by}</Typography>
                  <Typography variant="body2" color="text.secondary">Created: {new Date(degree.created_at).toLocaleDateString()}</Typography>
                </Box>
              )}
              {/* Updated by/at */}
              {degree.updated_by && degree.updated_at && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight={500}>Last modified by: {degree.updated_by}</Typography>
                  <Typography variant="body2" color="text.secondary">Last modified: {new Date(degree.updated_at).toLocaleDateString()}</Typography>
                </Box>
              )}
              {/* Approved by/at (only for approved, active, archived) */}
              {['approved', 'active', 'archived'].includes(degree.status || '') && degree.approved_by && degree.approved_at && (
                <Box>
                  <Typography variant="body2" fontWeight={500}>Approved by: {degree.approved_by}</Typography>
                  <Typography variant="body2" color="text.secondary">Approved: {new Date(degree.approved_at).toLocaleDateString()}</Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Description Section - padded like department page */}
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {degree.description && (
            <Box sx={{ mb: 4, maxWidth: 1200, mx: 'auto', textAlign: 'left', px: { xs: 2, md: 0 } }}>
              <Typography variant="body1" sx={{ fontSize: '1.25rem', lineHeight: 1.7 }}>
                <span dangerouslySetInnerHTML={{ __html: degree.description }} />
              </Typography>
            </Box>
          )}
        </Container>

  {/* Overview Section */}
  <Container maxWidth="xl" sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', px: { xs: 1, md: 8 } }}>

          {/* Tabs and Main Content - Centered */}
          <Box sx={{ mb: 4 }}>
            {/* Tabs area: match description width (maxWidth 1200) and visually separate from content */}
            <Box sx={{ maxWidth: 1200, width: '100%', mx: 'auto', mb: 2, px: { xs: 2, md: 0 } }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', bg: 'transparent' }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="fullWidth"
                  aria-label="degree detail tabs"
                  sx={{
                    // make tab buttons occupy the full width of the description area
                    minHeight: 48,
                  }}
                >
                  <Tab label="Courses" sx={{ minWidth: 0 }} />
                  <Tab label="Outcomes & Specializations" sx={{ minWidth: 0 }} />
                  <Tab label="Requirements & Accreditation" sx={{ minWidth: 0 }} />
                  <Tab label="Admission" sx={{ minWidth: 0 }} />
                  <Tab label="Fees" sx={{ minWidth: 0 }} />
                  <Tab label="Contact" sx={{ minWidth: 0 }} />
                </Tabs>
              </Box>
            </Box>
            {/* Tab Panels - keep mounted to avoid remounting/fetch issues; panels can be wider than the tab header */}
            <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%', px: { xs: 2, md: 0 } }}>
              <Box role="tabpanel" aria-hidden={activeTab !== 0} sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
                {/* Meta Row: Duration, Code, Department - Centered */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {/* Duration */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DurationIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                    <Typography variant="body2" fontWeight={500} color="text.secondary">
                      {degree.duration_years} Years
                    </Typography>
                  </Box>
                  {/* Code */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                    <Typography variant="body2" fontWeight={500} color="text.secondary">
                      Code: {degree.code}
                    </Typography>
                  </Box>
                  {/* Department */}
                  {degree.department && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DepartmentIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                      <Typography variant="body2" fontWeight={500} color="text.secondary">
                        {degree.department.name}
                      </Typography>
                    </Box>
                  )}
                </Box>
                {/* Courses & Structure Tab */}
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>Courses & Structure</Typography>
                {(!degree.courses || degree.courses.length === 0) ? (
                  <Typography variant="body1" color="text.secondary">No courses available for this programme yet.</Typography>
                ) : (
                  Object.entries(groupCoursesBySemester(degree.courses)).sort((a, b) => Number(a[0]) - Number(b[0])).map(([semester, courses]) => (
                    <Accordion
                      key={semester}
                      expanded={expandedSemester === semester}
                      onChange={handleAccordionChange(semester)}
                      sx={{ mb: 3, bgcolor: '#f5f5f5', borderRadius: 2, boxShadow: 0 }}
                    >
                      <AccordionSummary
                        expandIcon={expandedSemester === semester ? <RemoveIcon /> : <AddIcon />}
                        sx={{ bgcolor: '#e0e0e0', px: 3, py: 2, borderRadius: 2 }}
                      >
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'text.primary' }}>
                          Semester {semester}
                          <span style={{ fontWeight: 400, color: '#666', marginLeft: 12 }}>
                            ({courses.length} courses, {courses.reduce((sum, c) => sum + (c.credits || 0), 0)} credits)
                          </span>
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        {courses.map((course, idx) => (
                          <Box key={course.id} sx={{ px: 3, py: 2, borderBottom: idx !== courses.length - 1 ? '1px solid #e0e0e0' : 'none', bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <MuiLink
                              component={Link}
                              href={`/course/${course.code}`}
                              underline="hover"
                              sx={{ fontWeight: 600, fontSize: '1.1rem', color: 'primary.dark', flex: 1, cursor: 'pointer' }}
                            >
                              {course.name} ({course.code})
                            </MuiLink>
                            <Chip label={`${course.credits} Credits`} size="small" color="success" sx={{ fontWeight: 500 }} />
                          </Box>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
              </Box>

              <Box role="tabpanel" aria-hidden={activeTab !== 1} sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>Specializations</Typography>
                {degree.specializations ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.specializations }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No specializations specified.</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h5" fontWeight={600} gutterBottom>Learning Outcomes</Typography>
                {degree.learning_outcomes ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.learning_outcomes }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No learning outcomes specified.</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h5" fontWeight={600} gutterBottom>Career Prospects</Typography>
                {degree.career_prospects ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.career_prospects }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No career prospects specified.</Typography>
                )}
              </Box>

              <Box role="tabpanel" aria-hidden={activeTab !== 2} sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>Prerequisites</Typography>
                {degree.prerequisites ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.prerequisites }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No prerequisites specified.</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h5" fontWeight={600} gutterBottom>Study Details</Typography>
                {degree.study_details ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.study_details }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No study details specified.</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h5" fontWeight={600} gutterBottom>Assessment Methods</Typography>
                {degree.assessment_methods ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.assessment_methods }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No assessment methods specified.</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h5" fontWeight={600} gutterBottom>Accreditation</Typography>
                {degree.accreditation ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.accreditation }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No accreditation info specified.</Typography>
                )}
              </Box>

              <Box role="tabpanel" aria-hidden={activeTab !== 3} sx={{ display: activeTab === 3 ? 'block' : 'none' }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>Entry Requirements</Typography>
                {degree.entry_requirements ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.entry_requirements }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No entry requirements specified.</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h5" fontWeight={600} gutterBottom>Admission Requirements</Typography>
                {degree.admission_requirements ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.admission_requirements }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No admission requirements specified.</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h5" fontWeight={600} gutterBottom>Application Process</Typography>
                {degree.application_process ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.application_process }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No application process specified.</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h5" fontWeight={600} gutterBottom>Application Deadlines</Typography>
                {degree.application_deadlines ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.application_deadlines }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No application deadlines specified.</Typography>
                )}
              </Box>

              <Box role="tabpanel" aria-hidden={activeTab !== 4} sx={{ display: activeTab === 4 ? 'block' : 'none' }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>Fee & Scholarship Information</Typography>
                {degree.fees ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.fees }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No fee information specified.</Typography>
                )}
              </Box>

              <Box role="tabpanel" aria-hidden={activeTab !== 5} sx={{ display: activeTab === 5 ? 'block' : 'none' }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>Faculty Details</Typography>
                {degree.faculty_details ? (
                  typeof degree.faculty_details === 'string' ? (
                    <div dangerouslySetInnerHTML={{ __html: degree.faculty_details }} />
                  ) : (
                    <Typography variant="body1" color="text.secondary">{JSON.stringify(degree.faculty_details)}</Typography>
                  )
                ) : (
                  <Typography variant="body1" color="text.secondary">No faculty details specified.</Typography>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="h5" fontWeight={600} gutterBottom>Contact Information</Typography>
                {degree.contact_information ? (
                  <div dangerouslySetInnerHTML={{ __html: degree.contact_information }} />
                ) : (
                  <Typography variant="body1" color="text.secondary">No contact information specified.</Typography>
                )}
              </Box>
            </Box>
          </Box>
              </Container>

      {/* Footer provided by PublicShell */}
    </Box>
  );
};

// Disable the default DashboardLayout for this page but wrap with PublicShell
// @ts-expect-error: Next.js custom property
DegreeDetailPage.getLayout = (page: React.ReactNode) => <PublicShell>{page}</PublicShell>;

export default DegreeDetailPage;
