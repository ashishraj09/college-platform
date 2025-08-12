import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Alert,
  Badge,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  School as SchoolIcon,
  Send as SendIcon,
  CheckCircle as ApproveIcon,
  Publish as PublishIcon,
  Delete as DeleteIcon,
  Drafts as DraftIcon,
  PendingActions as PendingIcon,
  PlayArrow as ActiveIcon,
  Business as DepartmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { coursesAPI, degreesAPI } from '../../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';
import CreateCourseDialog from '../../components/faculty/CreateCourseDialog';
import CreateDegreeDialog from '../../components/faculty/CreateDegreeDialog';
import HODApprovalDashboard from '../../components/hod/HODApprovalDashboard';

interface Course {
  id: string;
  name: string;
  code: string;
  overview: string;
  credits: number;
  semester: number;
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'pending_activation' | 'active' | 'disabled' | 'archived';
  is_elective: boolean;
  createdAt: string;
  updatedAt: string;
  department?: {
    name: string;
    code: string;
  };
  degree?: {
    name: string;
    code: string;
  };
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface Degree {
  id: string;
  name: string;
  code: string;
  description?: string;
  duration_years: number;
  status: string;
  createdAt: string;
  department?: {
    name: string;
    code: string;
  };
}

const FacultyDashboard: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDegreeDialogOpen, setCreateDegreeDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  // Check if user is HOD (Head of Department)
  const isHOD = user?.is_head_of_department === true;

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [coursesData, degreesData] = await Promise.all([
        coursesAPI.getFacultyCourses(user?.department?.id, user?.id),
        degreesAPI.getFacultyDegrees(user?.department?.id),
      ]);
      
      // Handle courses data - the API returns { all: courses, categorized, summary }
      if (coursesData && coursesData.all) {
        setCourses(coursesData.all);
      } else if (Array.isArray(coursesData)) {
        setCourses(coursesData);
      } else {
        setCourses([]);
      }
      
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
      console.error('Error loading dashboard data:', error);
      enqueueSnackbar('Error loading data. Please try again.', { variant: 'error' });
      // Set empty arrays on error to prevent further crashes
      setCourses([]);
      setDegrees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'submitted':
      case 'pending_approval':
        return 'info';
      case 'approved':
        return 'success';
      case 'pending_activation':
        return 'secondary';
      case 'active':
        return 'success';
      case 'disabled':
        return 'error';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <DraftIcon />;
      case 'submitted':
      case 'pending_approval':
        return <PendingIcon />;
      case 'approved':
        return <ApproveIcon />;
      case 'active':
        return <ActiveIcon />;
      default:
        return <SchoolIcon />;
    }
  };

  const getAvailableActions = (course: Course) => {
    const actions = [];

    // Basic actions based on status (for course creator)
    switch (course.status) {
      case 'draft':
        actions.push(
          { action: 'edit', label: 'Edit Course', icon: <EditIcon /> },
          { action: 'submit', label: 'Submit for Approval', icon: <SendIcon /> },
          { action: 'delete', label: 'Delete Course', icon: <DeleteIcon /> }
        );
        break;
      case 'submitted':
      case 'pending_approval':
        actions.push(
          { action: 'view', label: 'View Course', icon: <VisibilityIcon /> }
        );
        // Add HOD actions for pending approval courses
        if (isHOD && course.status === 'pending_approval') {
          actions.push(
            { action: 'approve', label: 'Approve Course', icon: <ApproveIcon /> }
          );
        }
        break;
      case 'approved':
        actions.push(
          { action: 'edit', label: 'Edit Course', icon: <EditIcon /> },
          { action: 'publish', label: 'Publish Course', icon: <PublishIcon /> },
          { action: 'view', label: 'View Course', icon: <VisibilityIcon /> }
        );
        break;
      case 'active':
        actions.push(
          { action: 'edit', label: 'Edit Course', icon: <EditIcon /> },
          { action: 'view', label: 'View Course', icon: <VisibilityIcon /> }
        );
        break;
      default:
        actions.push(
          { action: 'view', label: 'View Course', icon: <VisibilityIcon /> }
        );
    }

    return actions;
  };

  const handleCourseAction = async (action: string, course: Course) => {
    try {
      switch (action) {
        case 'edit':
          setCourseToEdit(course);
          setEditDialogOpen(true);
          break;
        case 'view':
          navigate(`/faculty/course/${course.id}`);
          break;
        case 'submit':
          await coursesAPI.submitCourse(course.id, user?.id, user?.department?.id);
          enqueueSnackbar('Course submitted for approval successfully!', { variant: 'success' });
          loadData();
          break;
        case 'approve':
          if (window.confirm('Are you sure you want to approve this course?')) {
            await coursesAPI.approveCourse(course.id);
            enqueueSnackbar('Course approved successfully!', { variant: 'success' });
            loadData();
          }
          break;
        case 'publish':
          await coursesAPI.publishCourse(course.id, user?.id, user?.department?.id);
          enqueueSnackbar('Course published successfully!', { variant: 'success' });
          loadData();
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this course?')) {
            await coursesAPI.deleteCourse(course.id, user?.id, user?.department?.id);
            enqueueSnackbar('Course deleted successfully!', { variant: 'success' });
            loadData();
          }
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action} on course:`, error);
      enqueueSnackbar(`Error ${action}ing course. Please try again.`, { variant: 'error' });
    }
  };

  const getStatusCounts = () => {
    const counts = {
      draft: 0,
      pending_approval: 0,
      approved: 0,
      active: 0
    };

    courses.forEach(course => {
      if (counts.hasOwnProperty(course.status)) {
        counts[course.status as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const getCoursesByStatus = (status: string) => {
    return courses.filter(course => course.status === status);
  };

  const statusCounts = getStatusCounts();

  const tabsConfig = [
    { 
      key: 'draft', 
      label: 'Draft', 
      icon: <DraftIcon />, 
      color: 'default',
      courses: getCoursesByStatus('draft')
    },
    { 
      key: 'pending_approval', 
      label: 'Pending Approval', 
      icon: <PendingIcon />, 
      color: 'info',
      courses: getCoursesByStatus('pending_approval').concat(getCoursesByStatus('submitted'))
    },
    { 
      key: 'approved', 
      label: 'Approved', 
      icon: <ApproveIcon />, 
      color: 'success',
      courses: getCoursesByStatus('approved')
    },
    { 
      key: 'active', 
      label: 'Active', 
      icon: <ActiveIcon />, 
      color: 'success',
      courses: getCoursesByStatus('active')
    }
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const renderCourseCard = (course: Course) => {
    const actions = getAvailableActions(course);
    
    return (
      <Card key={course.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', mb: 2 }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" component="h2">
              {course.name}
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {course.code} • {course.credits} Credits • Semester {course.semester}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 2 }} noWrap>
            {course.overview}
          </Typography>

          {course.department && (
            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
              <DepartmentIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
              {course.department.name}
            </Typography>
          )}

          {course.degree && (
            <Typography variant="caption" display="block" sx={{ mb: 2 }}>
              <SchoolIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
              {course.degree.name}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={getStatusIcon(course.status)}
              label={course.status.replace('_', ' ').toUpperCase()}
              color={getStatusColor(course.status) as any}
              size="small"
            />
            {course.is_elective && (
              <Chip label="Elective" variant="outlined" size="small" />
            )}
          </Box>
        </CardContent>

        <CardActions sx={{ pt: 0 }}>
          {actions.map((action, index) => (
            <Button
              key={index}
              size="small"
              startIcon={action.icon}
              onClick={() => handleCourseAction(action.action, course)}
            >
              {action.label}
            </Button>
          ))}
        </CardActions>
      </Card>
    );
  };

  // Filter courses to show actionable statuses
  const actionableCourses = courses.filter(course => 
    ['draft', 'approved', 'pending_approval', 'active', 'submitted'].includes(course.status)
  );

  const totalCourses = actionableCourses.length;

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Faculty Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your courses and degrees
        </Typography>
      </Box>

      {/* Status Overview Cards */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon /> Course Status Overview
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { key: 'draft', label: 'Draft', icon: <DraftIcon />, color: 'default' },
            { key: 'pending_approval', label: 'Pending Approval', icon: <PendingIcon />, color: 'info' },
            { key: 'approved', label: 'Approved', icon: <ApproveIcon />, color: 'success' },
            { key: 'active', label: 'Active', icon: <ActiveIcon />, color: 'success' }
          ].map(({ key, label, icon, color }) => (
            <Card key={key} sx={{ textAlign: 'center', minWidth: 180, p: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <Badge badgeContent={key === 'pending_approval' ? 
                    (statusCounts.pending_approval || 0) + getCoursesByStatus('submitted').length : 
                    statusCounts[key as keyof typeof statusCounts]} color={color as any}>
                    {React.cloneElement(icon, { sx: { fontSize: 40, color: `${color}.main` } })}
                  </Badge>
                </Box>
                <Typography variant="h4" component="div">
                  {key === 'pending_approval' ? 
                    (statusCounts.pending_approval || 0) + getCoursesByStatus('submitted').length : 
                    statusCounts[key as keyof typeof statusCounts]}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>

      {/* Course Management Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon /> My Courses ({totalCourses})
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isHOD && (
              <Button
                variant="outlined"
                startIcon={<SchoolIcon />}
                onClick={() => setCreateDegreeDialogOpen(true)}
              >
                Create Degree
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create New Course
            </Button>
          </Box>
        </Box>
        
        {totalCourses === 0 ? (
          <Alert severity="info">
            No courses found. Create your first course to get started!
          </Alert>
        ) : (
          <>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange} 
              variant="fullWidth"
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
              {tabsConfig.map((tab, index) => (
                <Tab
                  key={tab.key}
                  icon={tab.icon}
                  iconPosition="start"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {tab.label}
                      <Badge 
                        badgeContent={tab.courses.length} 
                        color={tab.color as any}
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  sx={{
                    minHeight: 48,
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    fontWeight: currentTab === index ? 600 : 400,
                  }}
                />
              ))}
            </Tabs>

            {tabsConfig.map((tab, index) => (
              <Box 
                key={tab.key}
                role="tabpanel"
                hidden={currentTab !== index}
                sx={{ mt: 2 }}
              >
                {currentTab === index && (
                  <>
                    {tab.courses.length === 0 ? (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        No courses in {tab.label.toLowerCase()} status.
                      </Alert>
                    ) : (
                      <>
                        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="h6" color="text.secondary">
                            {tab.courses.length} course{tab.courses.length !== 1 ? 's' : ''} in {tab.label.toLowerCase()} status
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3 }}>
                          {tab.courses.map(renderCourseCard)}
                        </Box>
                      </>
                    )}
                  </>
                )}
              </Box>
            ))}
          </>
        )}
      </Paper>

      {/* HOD Approval Dashboard - only show for HODs */}
      {isHOD && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ApproveIcon /> HOD Approvals
          </Typography>
          <HODApprovalDashboard />
        </Paper>
      )}

      {/* Course Details Dialog */}
      <Dialog
        open={Boolean(selectedCourse)}
        onClose={() => setSelectedCourse(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedCourse && (
          <>
            <DialogTitle>
              {selectedCourse.name} ({selectedCourse.code})
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedCourse.overview}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Credits: {selectedCourse.credits} | Semester: {selectedCourse.semester}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedCourse(null)}>Close</Button>
              <Button variant="contained" onClick={() => {
                navigate(`/faculty/course/${selectedCourse.id}`);
                setSelectedCourse(null);
              }}>
                View Details
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Create Course Dialog */}
      <CreateCourseDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => {
          loadData();
          setCreateDialogOpen(false);
        }}
        mode="create"
      />

      {/* Edit Course Dialog */}
      <CreateCourseDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setCourseToEdit(null);
        }}
        onSuccess={() => {
          loadData();
          setEditDialogOpen(false);
          setCourseToEdit(null);
        }}
        course={courseToEdit}
        mode="edit"
      />

      {/* Create Degree Dialog - HOD only */}
      {isHOD && (
        <CreateDegreeDialog
          open={createDegreeDialogOpen}
          onClose={() => setCreateDegreeDialogOpen(false)}
          onSuccess={() => {
            loadData();
            setCreateDegreeDialogOpen(false);
            enqueueSnackbar('Degree created successfully!', { variant: 'success' });
          }}
        />
      )}
    </Container>
  );
};

export default FacultyDashboard;