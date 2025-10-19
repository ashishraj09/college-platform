import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Grid,
  Button,
  alpha,
  useTheme,
  CircularProgress,
  Paper,
  IconButton,
  Divider,
} from '@mui/material';
import {
  School as SchoolIcon,
  Search as SearchIcon,
  Business as DepartmentIcon,
  MenuBook as CourseIcon,
  Star as StarIcon,
  Login as LoginIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { degreesAPI } from '../services/api';
import { useRouter } from 'next/router';

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
}

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
}

const Homepage: React.FC = () => {
  console.log('Homepage component rendering');
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [filteredDegrees, setFilteredDegrees] = useState<Degree[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ degrees: Degree[]; courses: Course[] }>({ degrees: [], courses: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    console.log('Homepage: Fetching degrees...');

    const fetchDegrees = async () => {
      try {
        setLoading(true);
        const data = await degreesAPI.getPublicDegrees();
        const degreesArray = data?.degrees || [];
        setDegrees(degreesArray);
        setFilteredDegrees(degreesArray);
      } catch (error) {
        console.error('Error fetching degrees:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDegrees();
  }, []);

  // Filter degrees based on search query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setFilteredDegrees(degrees);
      setSearchResults({ degrees: [], courses: [] });
      setShowSearchResults(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    
    // Filter degrees
    const filteredDegreeList = degrees.filter((degree) => {
      return (
        degree.name.toLowerCase().includes(query) ||
        degree.code.toLowerCase().includes(query) ||
        degree.description?.toLowerCase().includes(query) ||
        degree.department?.name.toLowerCase().includes(query)
      );
    });
    
    // Extract and filter all courses from all degrees
    const allCourses: Course[] = [];
    degrees.forEach((degree) => {
      if (degree.courses) {
        degree.courses.forEach((course) => {
          // Avoid duplicates
          if (!allCourses.find((c) => c.code === course.code)) {
            allCourses.push(course);
          }
        });
      }
    });
    
    const filteredCourses = allCourses.filter((course) => {
      return (
        course.name.toLowerCase().includes(query) ||
        course.code.toLowerCase().includes(query)
      );
    });
    
    setFilteredDegrees(filteredDegreeList);
    setSearchResults({ 
      degrees: filteredDegreeList, // Show all matching degrees
      courses: filteredCourses // Show all matching courses
    });
    setShowSearchResults(true);
  }, [searchQuery, degrees]);

  const handleDegreeClick = (code: string) => {
    router.push(`/degree/${code}`);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Loading programmes...
        </Typography>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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

      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          color: 'white',
          py: { xs: 8, md: 12 },
          overflow: 'visible',
          backgroundImage: 'url(/static/students-homepage.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
            <Typography
              variant="h2"
              fontWeight={700}
              gutterBottom
              sx={{ fontSize: { xs: '2rem', md: '3rem' }, lineHeight: 1.2, mb: 2 }}
            >
              Shape Your Future
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.95, mb: 4, fontWeight: 400, fontSize: { xs: '1rem', md: '1.25rem' } }}>
              Discover world-class degree programmes designed for the next generation of leaders
            </Typography>

            {/* Search Box with Dropdown */}
            <Box className="search-container" sx={{ position: 'relative', maxWidth: 1000, mx: 'auto', mb: 4, zIndex: 10 }}>
              <Paper
                elevation={0}
                sx={{
                  overflow: 'visible',
                  borderRadius: 3,
                  bgcolor: 'white',
                  position: 'relative',
                  zIndex: 10,
                }}
              >
                <TextField
                  fullWidth
                  placeholder="Start searching for a course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowSearchResults(true)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSearchQuery('');
                            setShowSearchResults(false);
                          }}
                        >
                          <Box sx={{ fontSize: 20, fontWeight: 'bold', color: 'text.secondary' }}>×</Box>
                        </IconButton>
                      </InputAdornment>
                    ),
                    disableUnderline: true,
                  }}
                  variant="standard"
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: '1.1rem',
                      padding: '18px 24px',
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: 'text.secondary',
                      opacity: 0.7,
                    },
                  }}
                />
              </Paper>

              {/* Search Results Dropdown */}
              {showSearchResults && searchQuery.length >= 3 && (
                <Paper
                  elevation={8}
                  sx={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    maxHeight: '60vh',
                    overflowY: 'auto',
                    borderRadius: 2,
                    bgcolor: 'white',
                    zIndex: 9999,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      bgcolor: '#f1f1f1',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      bgcolor: '#888',
                      borderRadius: '4px',
                      '&:hover': {
                        bgcolor: '#555',
                      },
                    },
                  }}
                >
                  {searchResults.degrees.length > 0 && (
                    <Box>
                      {searchResults.degrees.map((degree, index) => (
                        <Box key={degree.id}>
                          <Box
                            onClick={() => {
                              router.push(`/degree/${degree.code}`);
                              setShowSearchResults(false);
                            }}
                            sx={{
                              px: 4,
                              py: 2.5,
                              cursor: 'pointer',
                              borderBottom: index < searchResults.degrees.length - 1 ? '1px solid #e0e0e0' : 'none',
                              '&:hover': {
                                bgcolor: '#f9f9f9',
                              },
                              transition: 'background-color 0.2s',
                            }}
                          >
                            <Typography 
                              variant="body1" 
                              fontWeight={400} 
                              color="text.primary" 
                              sx={{ 
                                textAlign: 'left',
                                mb: 0.5,
                                fontSize: '1rem',
                              }}
                            >
                              {degree.name}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                textAlign: 'left',
                                fontSize: '0.875rem',
                              }}
                            >
                              {degree.code} • {degree.department?.name}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {searchResults.courses.length > 0 && (
                    <Box>
                      {searchResults.courses.map((course, index) => (
                        <Box key={course.id}>
                          <Box
                            onClick={() => {
                              router.push(`/course/${course.code}`);
                              setShowSearchResults(false);
                            }}
                            sx={{
                              px: 4,
                              py: 2.5,
                              cursor: 'pointer',
                              borderBottom: index < searchResults.courses.length - 1 ? '1px solid #e0e0e0' : 'none',
                              '&:hover': {
                                bgcolor: '#f9f9f9',
                              },
                              transition: 'background-color 0.2s',
                            }}
                          >
                            <Typography 
                              variant="body1" 
                              fontWeight={400} 
                              color="text.primary" 
                              sx={{ 
                                textAlign: 'left',
                                mb: 0.5,
                                fontSize: '1rem',
                              }}
                            >
                              {course.name}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                textAlign: 'left',
                                fontSize: '0.875rem',
                              }}
                            >
                              {course.code} • {course.credits} credits • Semester {course.semester}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* No Results Message */}
                  {searchResults.degrees.length === 0 && searchResults.courses.length === 0 && (
                    <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        No results found
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Try searching with different keywords
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Explore Area of Study Section */}
      <Box sx={{ bgcolor: '#f8f9fa', py: 10 }}>
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'white',
              borderRadius: 3,
              p: { xs: 4, md: 6 },
            }}
          >
            <Typography 
              variant="h3" 
              fontWeight={700} 
              gutterBottom 
              sx={{ 
                mb: 6, 
                color: '#333',
                fontSize: { xs: '2rem', md: '2.5rem' },
              }}
            >
              Explore an area of study
            </Typography>
            
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)', 
                md: 'repeat(4, 1fr)' 
              },
              gap: 4,
            }}>
              {Array.from(new Set(degrees.map((d) => d.department?.code).filter(Boolean))).map((deptCode) => {
                const dept = degrees.find((d) => d.department?.code === deptCode)?.department;
                const degreeCount = degrees.filter((d) => d.department?.code === deptCode).length;
                
                return (
                  <Box key={deptCode}>
                    <Button
                      fullWidth
                      variant="text"
                      endIcon={<ArrowIcon />}
                      onClick={() => router.push(`/department/${deptCode}`)}
                      sx={{
                        py: 3,
                        px: 0,
                        justifyContent: 'space-between',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1.05rem',
                        color: '#333',
                        borderBottom: '1px solid #e0e0e0',
                        borderRadius: 0,
                        '&:hover': {
                          bgcolor: 'transparent',
                          color: 'primary.main',
                          '& .MuiSvgIcon-root': {
                            transform: 'translateX(4px)',
                          },
                        },
                        '& .MuiSvgIcon-root': {
                          transition: 'transform 0.2s',
                        },
                      }}
                    >
                      <Box component="span" sx={{ textAlign: 'left' }}>
                        {dept?.name || deptCode}
                      </Box>
                    </Button>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* Why Choose Us Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" fontWeight={700} align="center" gutterBottom sx={{ mb: 6 }}>
          Why Choose {process.env.NEXT_PUBLIC_APP_NAME || 'College Platform'}
        </Typography>
        
        <Grid container spacing={6} justifyContent="center" alignItems="stretch" sx={{ maxWidth: 1100, mx: 'auto' }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid',
                  borderColor: 'divider',
                  borderRadius: '50%',
                }}
              >
                <StarIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Top Quality Education
              </Typography>
              <Typography variant="body2" color="text.secondary">
                World-class teaching and cutting-edge research across all disciplines
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box sx={{ textAlign: 'center', px: 2 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid',
                  borderColor: 'divider',
                  borderRadius: '50%',
                }}
              >
                <SchoolIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Industry Connections
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Strong partnerships with leading companies and organizations
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid',
                  borderColor: 'divider',
                  borderRadius: '50%',
                }}
              >
                <DepartmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Modern Facilities
              </Typography>
              <Typography variant="body2" color="text.secondary">
                State-of-the-art campuses with advanced learning environments
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid',
                  borderColor: 'divider',
                  borderRadius: '50%',
                }}
              >
                <CourseIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Diverse Programmes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {degrees.length}+ degree programmes across multiple disciplines
              </Typography>
            </Box>
          </Grid>
        </Grid>
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
                  onClick={() => setSearchQuery('')}
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
Homepage.getLayout = (page: React.ReactElement) => page;

export default Homepage;
