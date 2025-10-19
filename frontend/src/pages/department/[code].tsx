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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff' }}>
      {/* Navigation Bar */}
      <Box
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
              onClick={() => router.push('/')}
            >
              <Box
                component="img"
                src="/static/college-logo.png"
                alt="College Logo"
                sx={{ 
                  height: 40, 
                  width: 'auto',
                  objectFit: 'contain'
                }}
              />
              <Typography variant="h5" fontWeight={700} color="primary">
                {process.env.NEXT_PUBLIC_APP_NAME || 'College Platform'}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<LoginIcon />}
              onClick={() => router.push('/login')}
              sx={{ fontWeight: 600, px: 3 }}
            >
              Login
            </Button>
          </Box>
        </Container>
      </Box>

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
            {departmentInfo.description.split(/\n+/).map((para, idx) => (
              <Typography
                key={idx}
                variant="body1"
                color="text.secondary"
                sx={{
                  lineHeight: 1.8,
                  fontSize: '1.05rem',
                  mb: 2,
                  textAlign: 'justify',
                  mx: 'auto',
                  whiteSpace: 'pre-line',
                  px: { xs: 0, md: 4 }
                }}
              >
                {para}
              </Typography>
            ))}
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
                      alignItems: 'flex-start', 
                      gap: 2, 
                      mb: 2,
                      minHeight: '80px', // Fixed minimum height
                      maxHeight: '100px', // Maximum height for header
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
                            lineHeight: 1.3,
                            fontSize: '1rem',
                            mb: 1,
                            maxHeight: '3.9em', // Max 3 lines
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
                      mb: 2, 
                      overflow: 'hidden',
                      minHeight: 0 // Allow flex to shrink
                    }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.5,
                        }}
                      >
                        {degree.description || 'Master of Science degree providing comprehensive education in this field.'}
                      </Typography>
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

      {/* Footer */}
      <Box
        sx={{
          bgcolor: '#f8f9fa',
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 6,
          mt: 8,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {/* Brand Section */}
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  component="img"
                  src="/static/college-logo.png"
                  alt="College Logo"
                  sx={{ 
                    height: 32, 
                    width: 'auto',
                    objectFit: 'contain'
                  }}
                />
                <Typography variant="h6" fontWeight={700}>
                  {process.env.NEXT_PUBLIC_APP_NAME || 'College Platform'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Empowering students through world-class education.
              </Typography>
            </Grid>

            {/* Quick Links */}
            <Grid item xs={6} sm={3} md={2}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                  onClick={() => router.push('/')}
                >
                  All Programmes
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                  onClick={() => router.push('/login')}
                >
                  Student Login
                </Typography>
              </Box>
            </Grid>

            {/* Information For */}
            <Grid item xs={6} sm={3} md={2}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                Information For
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Future Students
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current Students
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Staff
                </Typography>
              </Box>
            </Grid>

            {/* About */}
            <Grid item xs={6} sm={3} md={2}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                About
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Our Story
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Leadership
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Careers
                </Typography>
              </Box>
            </Grid>

            {/* Contact */}
            <Grid item xs={6} sm={3} md={3}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
                Contact
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {degrees.length} Active Programmes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Email: info@college.edu
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />
          
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME || 'College Platform'}. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

// Disable the default DashboardLayout for this page
DepartmentPage.getLayout = (page: React.ReactElement) => page;

export default DepartmentPage;

// Ensure department page is not wrapped in DashboardLayout (public page)
// @ts-expect-error: Next.js custom property
DepartmentPage.getLayout = (page: React.ReactNode) => page;
