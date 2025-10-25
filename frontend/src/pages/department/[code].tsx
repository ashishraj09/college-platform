import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Button,
  Divider,
  Paper,
} from '@mui/material';
import PublicShell from '../../components/PublicShell';
import {
  School as SchoolIcon,
  MenuBook as CourseIcon,
  ArrowBack as BackIcon,
  AccessTime as DurationIcon,
  Star as StarIcon,
  Login as LoginIcon,
  Business as DepartmentIcon,
} from '@mui/icons-material';
import { degreesAPI, departmentsAPI } from '../../services/api';
import { useRouter } from 'next/router';

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
}

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
}

interface Degree {
  id: string;
  name: string;
  code: string;
  description?: string;
  duration_years: number;
  department?: Department;
  courses?: Course[];
  total_credits?: number;
}

const DepartmentPage: React.FC = () => {
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentInfo, setDepartmentInfo] = useState<Department | null>(null);
  const [sanitizedDescription, setSanitizedDescription] = useState<string | null>(null);
  const [purifier, setPurifier] = useState<any | null>(null);
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    if (!code) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch department details by code using public endpoint
        const deptResponse = await departmentsAPI.getPublicDepartmentByCode(String(code));
        console.log('Department Response:', deptResponse); // Debug log
        if (deptResponse && !deptResponse.error) {
          setDepartmentInfo(deptResponse.department || deptResponse);
        }
        
        // Fetch degrees
        const data = await degreesAPI.getPublicDegrees();
        const allDegrees = data?.degrees || [];
        
        // Filter degrees by department code
        const filteredDegrees = allDegrees.filter(
          (d: Degree) => d.department?.code?.toLowerCase() === String(code).toLowerCase()
        );
        
        setDegrees(filteredDegrees);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [code]);

  // Dynamically import DOMPurify on client and sanitize department description
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let mounted = true;
    (async () => {
      try {
        const mod = await import('dompurify');
        const DOMPurify = mod.default || mod;
        if (!mounted) return;
        setPurifier(() => DOMPurify);
        if (departmentInfo?.description) {
          setSanitizedDescription(DOMPurify.sanitize(departmentInfo.description));
        } else {
          setSanitizedDescription(null);
        }
      } catch (err) {
        console.warn('Failed to load DOMPurify, falling back to raw HTML rendering', err);
        if (departmentInfo?.description) setSanitizedDescription(departmentInfo.description);
      }
    })();
    return () => { mounted = false; };
  }, [departmentInfo?.description]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff' }}>
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
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          
          <Typography 
            variant="h2" 
            fontWeight={700} 
            gutterBottom 
            sx={{ 
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              textShadow: '2px 2px 4px rgba(0,0,0,0.7)'
            }}
          >
            {departmentInfo?.name || 'Department'}
          </Typography>
        </Container>
      </Box>

      {/* Department Description and Programmes Count */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
          {departmentInfo?.description && (
            <Box sx={{ mb: 3, maxWidth: { xs: '100%', md: '1200px' }, px: { xs: 2, md: 0 }, mx: 'auto', textAlign: 'center' }}>
              {/* Render sanitized HTML description. DOMPurify is imported dynamically to avoid SSR issues. */}
              <div
                dangerouslySetInnerHTML={{ __html: sanitizedDescription ?? '' }}
                style={{
                  margin: '0 auto',
                  textAlign: 'justify',
                  lineHeight: 1.8,
                  fontSize: '1.05rem',
                  color: 'rgba(0,0,0,0.7)',
                  maxWidth: '1200px',
                  paddingLeft: 0,
                  paddingRight: 0,
                }}
              />
            </Box>
          )}
        <Typography variant="h5" fontWeight={600} color="text.secondary">
          {degrees.length} programme{degrees.length !== 1 ? 's' : ''} available
        </Typography>
      </Container>

      {/* Degrees List */}
      <Container maxWidth="lg" sx={{ pb: 8 }}>
        {degrees.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <DepartmentIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
            <Typography variant="h5" color="text.secondary">
              No programmes found in this department
            </Typography>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3,
            gridAutoRows: '1fr', // Make all rows equal height
          }}>
            {degrees.map((degree) => (
              <Paper
                key={degree.id}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                  <Box sx={{ 
                    p: 3, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden' // Prevent content overflow
                  }}>
                    {/* Header with Icon and Title - Fixed Section */}
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 0.5,
                        minHeight: '56px', // Reduced minimum height to tighten header
                        maxHeight: '80px', // Maximum height for header
                        flexShrink: 0 // Don't shrink
                      }}>
                      <SchoolIcon sx={{ fontSize: 32, color: 'primary.main', flexShrink: 0 }} />
                      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        {/* Title with controlled height */}
                        <Typography 
                          variant="h6" 
                          fontWeight={600} 
                          color="primary.main"
                          sx={{ 
                            cursor: 'pointer',
                            lineHeight: 1.2,
                            fontSize: '1rem',
                            mb: 0,
                            maxHeight: '3.6em', // Slightly reduced max height
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            textOverflow: 'ellipsis',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                          onClick={() => router.push(`/degree/${degree.code}`)}
                        >
                          {degree.name}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          fontWeight={500}
                          sx={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {degree.code} • {degree.department?.name}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Description - Flexible middle section */}
                    <Box sx={{ 
                      flex: 1, 
                      mb: 0.5, 
                      overflow: 'hidden',
                      minHeight: 0 // Allow flex to shrink
                    }}>
                      <Box
                        component="div"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.5,
                          color: 'text.secondary'
                        }}
                        dangerouslySetInnerHTML={{ __html: purifier ? purifier.sanitize(degree.description || '') : (degree.description || '') }}
                      />
                    </Box>

                    {/* Stats at bottom - Fixed Section */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 2, 
                      pt: 2,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      flexShrink: 0, // Don't shrink
                      minHeight: '50px', // Fixed height for stats
                      maxHeight: '50px',
                      overflow: 'hidden'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DurationIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={600} fontSize="0.875rem">
                          {degree.duration_years} Years
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CourseIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={600} fontSize="0.875rem">
                          {degree.courses?.length || 0} Courses
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StarIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={600} fontSize="0.875rem">
                          {degree.total_credits || 0} Credits
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
            ))}
          </Box>
        )}
      </Container>

      {/* Footer provided by PublicShell */}
    </Box>
  );
};

// Disable the default DashboardLayout for this page but wrap with PublicShell
// @ts-expect-error: Next.js custom property
DepartmentPage.getLayout = (page: React.ReactNode) => <PublicShell>{page}</PublicShell>;

export default DepartmentPage;
