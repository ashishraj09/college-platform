import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tab,
  Tabs,
  Alert,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Close as CloseIcon,
  MoreHoriz as MoreHorizIcon,
  Timeline as TimelineIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import TimelineDialog, { TimelineEvent } from '../../components/common/TimelineDialog';
import { timelineAPI } from '../../services/api';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { coursesAPI, degreesAPI } from '../../services/api';

interface ApprovalItem {
  id: string;
  type: 'course' | 'degree';
  name: string;
  code: string;
  description: string;
  faculty: {
    first_name: string;
    last_name: string;
    email: string;
  };
  department: {
    name: string;
    code: string;
  };
  created_at: string;
  status: string;
}

const FacultyApprovalPage: React.FC = () => {
  // Timeline dialog state
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineEntityName, setTimelineEntityName] = useState('');

  // Timeline button handler
  const handleShowTimeline = async (item: any, type: 'course' | 'degree') => {
    setTimelineDialogOpen(true);
    setTimelineEntityName(item.name || '');
    try {
      const events = await timelineAPI.getTimeline(type, item.id);
      setTimelineEvents(events);
    } catch (e) {
      setTimelineEvents([]);
    }
  };
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [pendingCourses, setPendingCourses] = useState<any[]>([]);
  const [pendingDegrees, setPendingDegrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  // Get userId from localStorage or profile
  const [userId, setUserId] = useState<string | null>(null);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Not specified';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Not specified';
    }
  };

  const loadPendingItems = React.useCallback(async () => {
    try {
      setLoading(true);
      const [coursesResponse, degreesResponse] = await Promise.all([
        coursesAPI.getCourses({ status: 'pending_approval' }),
        degreesAPI.getDegrees({ status: 'pending_approval' })
      ]);
      // Transform courses to match ApprovalItem interface
      const transformedCourses = coursesResponse.map((course: any) => ({
        ...course,
        type: 'course' as const,
        description: course.overview,
        faculty: course.creator ? {
          first_name: course.creator.first_name,
          last_name: course.creator.last_name,
          email: course.creator.email
        } : null
      }));
      // Transform degrees to match ApprovalItem interface  
      const transformedDegrees = degreesResponse.map((degree: any) => ({
        ...degree,
        type: 'degree' as const,
        faculty: degree.creator ? {
          first_name: degree.creator.first_name,
          last_name: degree.creator.last_name,
          email: degree.creator.email
        } : null
      }));
      setPendingCourses(transformedCourses);
      setPendingDegrees(transformedDegrees);
    } catch (error) {
      console.error('Error loading pending items:', error);
      enqueueSnackbar('Failed to load pending approvals', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadPendingItems();
  }, [loadPendingItems]);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      import('../../services/api').then(({ authAPI }) => {
        authAPI.getProfile().then(profile => {
          const uid = profile?.id || profile?.user?.id;
          if (uid) {
            localStorage.setItem('userId', uid);
            setUserId(uid);
          }
        });
      });
    }
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleItemClick = (item: any, type: 'course' | 'degree') => {
    setSelectedItem({
      ...item,
      type,
    });
  };

  const handleCloseDialog = () => {
    setSelectedItem(null);
    setActionMessage('');
  };

  const handleApprove = async () => {
    if (!selectedItem) return;

    const trimmedMessage = actionMessage.trim();
    setActionLoading(true);
    try {
      if (selectedItem.type === 'course') {
        await coursesAPI.approveCourse(selectedItem.id, { reason: trimmedMessage });
      } else {
        await degreesAPI.approveDegree(selectedItem.id, { reason: trimmedMessage });
      }
      enqueueSnackbar(`${selectedItem.type === 'course' ? 'Course' : 'Degree'} approved successfully!`, { 
        variant: 'success' 
      });
      handleCloseDialog();
      loadPendingItems();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to approve item';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    const trimmedReason = actionMessage.trim();
    // Validation
    if (!trimmedReason) {
      enqueueSnackbar('Please provide a rejection reason to help faculty understand what needs improvement', { variant: 'error' });
      return;
    }
    if (trimmedReason.length < 10) {
      enqueueSnackbar('Rejection reason must be at least 10 characters to provide meaningful feedback', { variant: 'error' });
      return;
    }
    if (trimmedReason.length > 500) {
      enqueueSnackbar('Rejection reason cannot exceed 500 characters', { variant: 'error' });
      return;
    }
    setActionLoading(true);
    try {
      if (selectedItem.type === 'course') {
        await coursesAPI.rejectCourse(selectedItem.id, trimmedReason);
      } else {
        await degreesAPI.rejectDegree(selectedItem.id, { reason: trimmedReason, userId: userId || undefined });
      }
      enqueueSnackbar(`${selectedItem.type === 'course' ? 'Course' : 'Degree'} rejected with feedback sent to faculty`, { 
        variant: 'success' 
      });
      handleCloseDialog();
      loadPendingItems();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to reject item';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const renderApprovalCard = (item: any, type: 'course' | 'degree') => (
    <Card
      key={item.id}
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 2,
        boxShadow: 1,
        minWidth: 320,
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        p: 0,
      }}
    >
      <CardContent sx={{ pb: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="h6" sx={{ fontSize: 20, fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
            {item.name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14, mb: 0.25 }}>
            Dept: {item.department?.name || 'N/A'}
          </Typography>
          {type === 'course' && item.degree_name && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14, mb: 0.25 }}>
              Degree: {item.degree_name}
            </Typography>
          )}
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 14, mb: 0.25 }}>
            Code: {item.code}{item.version > 1 ? ` (v${item.version})` : ''} {item.credits ? ` • ${item.credits} Credits • Semester ${item.semester}` : item.duration_years ? ` • ${item.duration_years} Years` : ''}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.primary', fontSize: 15, mb: 1 }}>
            {item.description}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 13, mt: 1 }}>
            Submitted: {formatDate(item.submitted_at || item.submittedAt || item.createdAt || item.created_at)}
          </Typography>
        </Box>
      </CardContent>
      <CardActions sx={{ pt: 0 }}>
        <Button
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={() => {/* TODO: implement view course handler */}}
        >
          View Course
        </Button>
        <Button
          size="small"
          startIcon={<MoreHorizIcon />}
          onClick={() => handleItemClick(item, type)}
        >
          Action
        </Button>
        <Button
          size="small"
          startIcon={<TimelineIcon />}
          onClick={async () => {
            setTimelineEntityName(item.name || item.code || item.id);
            try {
              const data = await timelineAPI.getTimeline(type, item.id);
              // Merge audit and messages into a single timeline array
              const auditEvents = Array.isArray(data.audit) ? data.audit.map((a: any) => ({
                type: 'audit',
                id: a.id,
                action: a.action,
                user: a.user,
                description: a.description,
                timestamp: a.timestamp || a.createdAt || null
              })) : [];
              const messageEvents = Array.isArray(data.messages) ? data.messages.map((m: any) => ({
                type: 'message',
                id: m.id,
                message: m.message,
                user: m.user,
                timestamp: m.timestamp || m.createdAt || null
              })) : [];
              // Sort by timestamp descending (most recent first)
              const timeline = [...auditEvents, ...messageEvents].sort((a, b) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
              });
              setTimelineEvents(timeline);
            } catch (err) {
              setTimelineEvents([]);
            }
            setTimelineDialogOpen(true);
          }}
        >
          Timeline
        </Button>
      </CardActions>
    </Card>
  );

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton 
            onClick={() => router.push('/hod')}
            sx={{ ml: { xs: 0, sm: 0, md: 0 }, mr: 4, p: 0 }}
            aria-label="Back to dashboard"
          >
            <ArrowBackIcon sx={{ fontSize: 36, color: '#1565c0', fontWeight: 900 }} />
          </IconButton>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h4" component="h1" align="center">
              Faculty Course Approval
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" align="center">
              Review and approve course and degree program requests from faculty members
            </Typography>
          </Box>
        </Box>

        {/* Statistics */}
        <Box 
          display="grid" 
          gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
          gap={3} 
          sx={{ mb: 4 }}
        >
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main" gutterBottom>
                {pendingCourses.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Courses Pending Approval
              </Typography>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main" gutterBottom>
                {pendingDegrees.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Degrees Pending Approval
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Main Content */}
        <Paper elevation={2}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label={`Pending Courses (${pendingCourses.length})`} />
              <Tab label={`Pending Degrees (${pendingDegrees.length})`} />
            </Tabs>
          </Box>

          <CardContent>
            {activeTab === 0 && (
              <Box>
                {pendingCourses.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No courses pending approval
                  </Alert>
                ) : (
                  pendingCourses.map((course) => renderApprovalCard(course, 'course'))
                )}
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                {pendingDegrees.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    No degree programs pending approval
                  </Alert>
                ) : (
                  pendingDegrees.map((degree) => renderApprovalCard(degree, 'degree'))
                )}
              </Box>
            )}
          </CardContent>
        </Paper>

        {/* Timeline Dialog (shared component for uniformity) */}
        <TimelineDialog
          open={timelineDialogOpen}
          onClose={() => setTimelineDialogOpen(false)}
          events={timelineEvents}
          entityName={timelineEntityName}
        />
        <Dialog 
          open={Boolean(selectedItem)} 
          onClose={handleCloseDialog} 
          maxWidth="md" 
          fullWidth
        >
          {selectedItem && (
            <>
              <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6">
                      Review {selectedItem.type === 'course' ? 'Course' : 'Degree'}: {selectedItem.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {selectedItem.code} • By {selectedItem.faculty?.first_name || 'Unknown'} {selectedItem.faculty?.last_name || ''}
                    </Typography>
                  </Box>
                  <IconButton onClick={handleCloseDialog}>
                    <CloseIcon />
                  </IconButton>
                </Box>
              </DialogTitle>

              <DialogContent dividers>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Description:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedItem.description}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Faculty:
                    </Typography>
                    <Typography variant="body2">
                      {selectedItem.faculty?.first_name || 'Unknown'} {selectedItem.faculty?.last_name || ''}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {selectedItem.faculty?.email || ''}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Department:
                    </Typography>
                    <Typography variant="body2">
                      {selectedItem.department?.name || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {selectedItem.department?.code || 'N/A'}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Message / Feedback (required for rejection, optional for approval)"
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  placeholder="Provide feedback for approval or rejection..."
                  helperText={
                    actionMessage.trim().length < 10 && actionMessage.trim().length > 0
                      ? `Minimum 10 characters required for rejection (${actionMessage.length}/10)`
                      : `${actionMessage.length}/500 characters - This feedback will be sent to the faculty`
                  }
                  error={actionMessage.length > 500}
                  inputProps={{ maxLength: 500 }}
                  sx={{
                    '& .MuiInputBase-root': {
                      minHeight: '120px'
                    }
                  }}
                />
              </DialogContent>

              <DialogActions sx={{ p: 2 }}>
                <Button 
                  onClick={handleCloseDialog} 
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleReject}
                  variant="outlined"
                  color="error"
                  disabled={actionLoading || actionMessage.trim().length < 10}
                  startIcon={<RejectIcon />}
                >
                  Request Change
                </Button>
                <Button 
                  onClick={handleApprove}
                  variant="contained"
                  color="success"
                  disabled={actionLoading}
                  startIcon={<ApproveIcon />}
                >
                  Approve
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </Container>
  );
};

export default FacultyApprovalPage;
