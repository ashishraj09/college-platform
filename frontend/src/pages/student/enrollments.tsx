import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Button, Card, CardContent, Chip, Grid, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Link from 'next/link';
import { enrollmentAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`enrollment-tabpanel-${index}`}
      aria-labelledby={`enrollment-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'default';
    case 'pending_hod_approval': return 'warning';
    // Keep this case for backward compatibility with existing data
    case 'pending_office_approval': return 'info';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    case 'withdrawn': return 'secondary';
    default: return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'draft': return 'Draft';
    case 'pending_hod_approval': return 'Pending Approval';
    // Keep this case for backward compatibility with existing data
    case 'pending_office_approval': return 'Pending Approval';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'withdrawn': return 'Withdrawn';
    default: return status;
  }
};

const EnrollmentPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    setLoading(true);
    const data = await enrollmentAPI.getAllEnrollments();
    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }
    setEnrollments(data);
    setError(null);
    setLoading(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSubmitEnrollment = (enrollment: any) => {
    setSelectedEnrollment(enrollment);
    setConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    setLoading(true);
    const result = await enrollmentAPI.submitForApproval({ enrollment_id: selectedEnrollment.id });
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    
    setConfirmDialog(false);
    await fetchEnrollments();
    setError(null);
    setLoading(false);
  };

  // Filter enrollments based on isCurrent flag
  const currentEnrollments = enrollments.filter(e => e.isCurrent);
  const pastEnrollments = enrollments.filter(e => !e.isCurrent);

  if (loading && enrollments.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 5, minHeight: '300px' }}>
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Loading enrollments...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we fetch your enrollment history
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Enrollments
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="enrollment tabs">
        <Tab label="Current Semester" />
        <Tab label="Past Semesters" />
      </Tabs>
      
      <TabPanel value={tabValue} index={0}>
        {currentEnrollments.length === 0 ? (
          <Typography>No enrollments found for the current semester.</Typography>
        ) : (
          <Grid container spacing={3}>
            {currentEnrollments.map((enrollment) => (
              <Grid size={{ xs: 12 }} key={enrollment.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {enrollment.academic_year} - Semester {enrollment.semester}
                      </Typography>
                      <Chip 
                        label={getStatusLabel(enrollment.enrollment_status)} 
                        color={getStatusColor(enrollment.enrollment_status) as any}
                      />
                    </Box>
                    
                    <Typography variant="subtitle1" gutterBottom>Courses:</Typography>
                    <Grid container spacing={1}>
                      {enrollment.course && enrollment.course.map((course: any) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course.id}>
                          <Card variant="outlined">
                            <CardContent>
                                      <Typography variant="subtitle2">
                                        <Link href={`/course/${encodeURIComponent(course.code)}`}>{course.code}: {course.name}</Link>
                                      </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Credits: {course.credits} | Department: {course.department?.code}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                    
                    {enrollment.enrollment_status === 'draft' && (
                      <Box sx={{ mt: 2, textAlign: 'right' }}>
                        <Button 
                          variant="contained" 
                          color="primary" 
                          onClick={() => handleSubmitEnrollment(enrollment)}
                        >
                          Submit for Approval
                        </Button>
                      </Box>
                    )}
                    
                    {enrollment.enrollment_status === 'rejected' && (
                      <Box sx={{ mt: 2 }}>
                        <Alert severity="error">
                          <Typography variant="subtitle2">Rejection Reason:</Typography>
                          <Typography variant="body2">{enrollment.rejection_reason || 'No reason provided'}</Typography>
                        </Alert>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {pastEnrollments.length === 0 ? (
          <Typography>No past enrollments found.</Typography>
        ) : (
          <Grid container spacing={3}>
            {pastEnrollments.map((enrollment) => (
              <Grid size={{ xs: 12 }} key={enrollment.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {enrollment.academic_year} - Semester {enrollment.semester}
                      </Typography>
                      <Chip 
                        label={getStatusLabel(enrollment.enrollment_status)} 
                        color={getStatusColor(enrollment.enrollment_status) as any}
                      />
                    </Box>
                    
                    <Typography variant="subtitle1" gutterBottom>Courses:</Typography>
                    <Grid container spacing={1}>
                      {enrollment.course && enrollment.course.map((course: any) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course.id}>
                          <Card variant="outlined">
                            <CardContent>
                                <Typography variant="subtitle2">
                                  <Link href={`/course/${encodeURIComponent(course.code)}`}>{course.code}: {course.name}</Link>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Credits: {course.credits} | Department: {course.department?.code}
                                </Typography>
                              </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
      
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit this enrollment for approval? 
            Once submitted, you won't be able to make changes unless it's rejected.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button onClick={confirmSubmit} variant="contained" color="primary">Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnrollmentPage;