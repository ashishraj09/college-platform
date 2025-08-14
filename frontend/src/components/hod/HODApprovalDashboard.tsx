import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  IconButton,
  Divider,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
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

const HODApprovalDashboard: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [pendingCourses, setPendingCourses] = useState<any[]>([]);
  const [pendingDegrees, setPendingDegrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
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
  };

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
    setRejectReason('');
  };

  const handleApprove = async () => {
    if (!selectedItem) return;

    setActionLoading(true);
    try {
      if (selectedItem.type === 'course') {
        await coursesAPI.approveCourse(selectedItem.id);
      } else {
        await degreesAPI.approveDegree(selectedItem.id);
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
    
    const trimmedReason = rejectReason.trim();
    
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
        await degreesAPI.rejectDegree(selectedItem.id, trimmedReason);
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
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 2,
          backgroundColor: 'action.hover'
        }
      }}
      onClick={() => handleItemClick(item, type)}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {item.name}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {item.code} • Submitted by {item.faculty?.first_name || 'Unknown'} {item.faculty?.last_name || ''}
            </Typography>
          </Box>
          <Chip label="Pending Review" color="warning" size="small" />
        </Box>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          {item.description}
        </Typography>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="textSecondary">
            Department: {item.department?.name || 'N/A'}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Submitted: {formatDate(item.submitted_at || item.submittedAt || item.createdAt || item.created_at)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        HOD Approval Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom sx={{ mb: 3 }}>
        Review and approve courses and degree programs submitted by faculty
      </Typography>

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

      {/* Tabs */}
      <Card>
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
      </Card>

      {/* Approval Dialog */}
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
                label="Rejection Reason (Required for rejection)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide specific feedback on what needs to be improved..."
                helperText={
                  rejectReason.trim().length < 10 && rejectReason.trim().length > 0
                    ? `Minimum 10 characters required (${rejectReason.length}/10)`
                    : `${rejectReason.length}/500 characters - This feedback will help the faculty improve their submission`
                }
                error={rejectReason.length > 500}
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
                disabled={actionLoading || rejectReason.trim().length < 10}
                startIcon={<RejectIcon />}
              >
                Reject
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
  );
};

export default HODApprovalDashboard;
