import React, { useState, useEffect } from 'react';
import DegreeDialog from '../../components/common/DegreeDialog';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tab,
  Tabs,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Business as BusinessIcon, School as SchoolIcon, Edit as EditIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { degreesAPI, coursesAPI } from '../../services/api';

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
      id={`dept-mgmt-tabpanel-${index}`}
      aria-labelledby={`dept-mgmt-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `dept-mgmt-tab-${index}`,
    'aria-controls': `dept-mgmt-tabpanel-${index}`,
  };
}

const DepartmentManagementPage: React.FC = () => {
  // Efficient filter function
  const filterByStatus = (items: any[], departmentId: string | null, status: string) => {
    return items.filter(item => {
      if (item.department_id !== departmentId) return false;
      if (status === 'all') return true;
      if (status === 'active') return item.status === 'active';
      return item.status === status;
    });
  };
  const [currentTab, setCurrentTab] = useState(0);
  const [degrees, setDegrees] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingDegrees, setLoadingDegrees] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [statusOptions, setStatusOptions] = useState<string[]>(['all', 'active']);
  const [degreeDialogOpen, setDegreeDialogOpen] = useState(false);
  const [degreeDialogMode, setDegreeDialogMode] = useState<'create' | 'edit'>('create');
  const [degreeDialogData, setDegreeDialogData] = useState<any>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDegreeId, setRejectDegreeId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Get departmentId from localStorage or fetch from HOD profile
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem('departmentId');
    console.log('[DepartmentManagement] localStorage departmentId:', storedId);
    if (storedId) {
      setDepartmentId(storedId);
    } else {
      // Fetch HOD profile and set departmentId
      import('../../services/api').then(({ authAPI }) => {
        authAPI.getProfile().then(profile => {
          console.log('[DepartmentManagement] Fetched profile:', profile);
          const deptId = profile?.department_id || profile?.user?.department_id;
          if (deptId) {
            localStorage.setItem('departmentId', deptId);
            setDepartmentId(deptId);
          } else {
            console.error('[DepartmentManagement] No department_id in profile or user object');
          }
        }).catch(err => {
          console.error('[DepartmentManagement] Error fetching profile:', err);
        });
      });
    }
  }, []);

  useEffect(() => {
    if (!departmentId) {
      console.warn('[DepartmentManagement] No departmentId, skipping degrees API call');
      return;
    }
    setLoadingDegrees(true);
    console.log('[DepartmentManagement] Fetching all degrees for departmentId:', departmentId);
    degreesAPI.getFacultyDegrees(departmentId, undefined, true) // Use HOD view to get all department degrees
      .then(data => {
        let degreesArr: any[] = [];
        if (Array.isArray(data)) {
          degreesArr = data;
        } else if (data && Array.isArray(data.degrees)) {
          degreesArr = data.degrees;
        } else if (data && Array.isArray(data.all)) {
          degreesArr = data.all;
        }
        setDegrees(degreesArr);
        // Collect unique statuses from degrees
        const statuses = Array.from(new Set(degreesArr.map((d: any) => d.status).filter((s: any): s is string => typeof s === 'string')));
        setStatusOptions(['all', 'active', ...statuses as string[]]);
      })
      .catch(err => {
        console.error('[DepartmentManagement] Error fetching degrees:', err);
      })
      .finally(() => setLoadingDegrees(false));
  }, [departmentId]);

  useEffect(() => {
    if (!departmentId) {
      console.warn('[DepartmentManagement] No departmentId, skipping courses API call');
      return;
    }
    setLoadingCourses(true);
    console.log('[DepartmentManagement] Fetching all courses for departmentId:', departmentId);
    coursesAPI.getDepartmentCourses({ departmentId }) // Use HOD view mode with department-courses endpoint
      .then(data => {
  const coursesArr = Array.isArray(data) ? data : data.all || data.courses || [];
  setCourses(coursesArr);
  // Collect unique statuses from courses
  const statuses = Array.from(new Set(coursesArr.map((c: any) => c.status).filter((s: any): s is string => typeof s === 'string')));
  setStatusOptions(prev => Array.from(new Set([...prev, ...statuses])).filter((s): s is string => typeof s === 'string'));
      })
      .catch(err => {
        console.error('[DepartmentManagement] Error fetching courses:', err);
      })
      .finally(() => setLoadingCourses(false));
  }, [departmentId]);

  // Get userId from localStorage or profile
  const [userId, setUserId] = useState<string | null>(null);
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
    setCurrentTab(newValue);
  };

  const handleEdit = (item: any, type: 'degree' | 'course') => {
    if (type === 'degree') {
      setDegreeDialogMode('edit');
      // Ensure courses_per_semester is always an object
      const degreeData = {
        ...item,
        courses_per_semester: item.courses_per_semester && typeof item.courses_per_semester === 'object' ? item.courses_per_semester : {},
        is_head_of_department: true, // Always pass HOD role
      };
      setDegreeDialogData(degreeData);
      setDegreeDialogOpen(true);
    } else {
      // fallback to old course edit dialog for now
      // ...existing code for course editing...
    }
  };

  const handleReject = (degreeId: string) => {
    setRejectDegreeId(degreeId);
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectDegreeId || !userId) return;
    try {
  await degreesAPI.rejectDegree(rejectDegreeId, { reason: rejectReason, userId });
      setRejectDialogOpen(false);
      setRejectReason('');
      setRejectDegreeId(null);
      // Reload degrees
      setLoadingDegrees(true);
      degreesAPI.getDegrees({ departmentId })
        .then(data => {
          let degreesArr: any[] = [];
          if (Array.isArray(data)) {
            degreesArr = data;
          } else if (data && Array.isArray(data.degrees)) {
            degreesArr = data.degrees;
          } else if (data && Array.isArray(data.all)) {
            degreesArr = data.all;
          }
          setDegrees(degreesArr);
        })
        .finally(() => setLoadingDegrees(false));
    } catch (err) {
      let errorMsg = 'Unknown error';
      if (err && typeof err === 'object') {
        // Use optional chaining to avoid type errors
        if ((err as any).response?.data?.error) {
          errorMsg = (err as any).response.data.error;
        } else if ((err as any).message && typeof (err as any).message === 'string') {
          errorMsg = (err as any).message;
        }
      }
      alert('Failed to reject degree: ' + errorMsg);
    }
  };

  const handleEditConfirm = () => {
    setConfirmDialogOpen(true);
  };

  const handleShowVersion = (item: any) => {
    setSelectedVersion(item);
    setVersionDialogOpen(true);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton 
            onClick={() => navigate('/hod')}
            sx={{ mr: 2 }}
            aria-label="Back to dashboard"
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              Department Management
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Manage degrees and courses for your department
            </Typography>
          </Box>
        </Box>

        <Paper elevation={2}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              aria-label="Department management tabs"
              sx={{ px: 2 }}
            >
              <Tab icon={<SchoolIcon />} label="Degrees" {...a11yProps(0)} sx={{ minHeight: 64 }} />
              <Tab icon={<BusinessIcon />} label="Courses" {...a11yProps(1)} sx={{ minHeight: 64 }} />
            </Tabs>
          </Box>

          {/* Degrees Tab */}
          <TabPanel value={currentTab} index={0}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography>Status Filter:</Typography>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px' }}>
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
              </Box>
              {(() => {
                if (loadingDegrees) return <CircularProgress />;
                // UI filtering
                const filteredDegrees = filterByStatus(degrees, departmentId, statusFilter);
                return (
                  <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(320px, 1fr))" gap={2}>
                    {filteredDegrees.length === 0 ? (
                      <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body1">No degrees found for your department.</Typography>
                      </Paper>
                    ) : (
                      filteredDegrees.map(degree => (
                        <Paper key={degree.id} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1, boxShadow: 3 }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="h6">{degree.name}</Typography>
                            <Box>
                              <Tooltip title="Edit">
                                <IconButton onClick={() => handleEdit(degree, 'degree')}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              {degree.status === 'pending' && (
                                <Tooltip title="Reject">
                                  <IconButton color="error" onClick={() => handleReject(degree.id)}>
                                    <span style={{ fontWeight: 'bold', fontSize: 18 }}>✗</span>
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                          <Typography variant="body2" color="text.secondary">Code: {degree.code}</Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={1}>
                            <Chip label={`Version ${degree.version || 1}`} size="small" onClick={() => handleShowVersion(degree)} />
                            {degree.status && <Chip label={degree.status} size="small" color={degree.status === 'archived' ? 'default' : degree.status === 'disabled' ? 'warning' : 'success'} />}
                          </Box>
                          <Typography variant="body2" sx={{ mt: 1 }}>{degree.description}</Typography>
                        </Paper>
                      ))
                    )}
                  </Box>
                );
              })()}
            </Box>
            {/* DegreeDialog for create/edit */}
            <DegreeDialog
              open={degreeDialogOpen}
              onClose={() => setDegreeDialogOpen(false)}
              onSuccess={() => {
                setDegreeDialogOpen(false);
                // Reload degrees after edit/create
                setLoadingDegrees(true);
                degreesAPI.getDegrees({ departmentId })
                  .then(data => {
                    let degreesArr: any[] = [];
                    if (Array.isArray(data)) {
                      degreesArr = data;
                    } else if (data && Array.isArray(data.degrees)) {
                      degreesArr = data.degrees;
                    } else if (data && Array.isArray(data.all)) {
                      degreesArr = data.all;
                    }
                    setDegrees(degreesArr);
                  })
                  .finally(() => setLoadingDegrees(false));
              }}
              initialData={degreeDialogData}
              mode={degreeDialogMode}
            />
          </TabPanel>

          {/* Courses Tab */}
          <TabPanel value={currentTab} index={1}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography>Status Filter:</Typography>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px' }}>
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
              </Box>
              {(() => {
                if (loadingCourses) return <CircularProgress />;
                // UI filtering
                const filteredCourses = filterByStatus(courses, departmentId, statusFilter);
                return (
                  <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(320px, 1fr))" gap={2}>
                    {filteredCourses.length === 0 ? (
                      <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body1">No courses found for your department.</Typography>
                      </Paper>
                    ) : (
                      filteredCourses.map(course => (
                        <Paper key={course.id} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1, boxShadow: 3 }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="h6">{course.name}</Typography>
                            <Tooltip title="Edit">
                              <IconButton onClick={() => handleEdit(course, 'course')}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography variant="body2" color="text.secondary">Code: {course.code}</Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={1}>
                            <Chip label={`Version ${course.version || 1}`} size="small" onClick={() => handleShowVersion(course)} />
                            {course.status && <Chip label={course.status} size="small" color={course.status === 'archived' ? 'default' : course.status === 'disabled' ? 'warning' : 'success'} />}
                          </Box>
                          <Typography variant="body2" sx={{ mt: 1 }}>{course.description}</Typography>
                        </Paper>
                      ))
                    )}
                  </Box>
                );
              })()}
            </Box>
          </TabPanel>
        </Paper>


        {/* Confirm Publish Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="xs">
          <DialogTitle>Confirm Publish</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to publish these changes?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            {/* Old publish handler removed. Button now just closes dialog. */}
            <Button onClick={() => setConfirmDialogOpen(false)} variant="contained" color="primary">Close</Button>
          </DialogActions>
        </Dialog>

        {/* Version Dialog */}
        <Dialog open={versionDialogOpen} onClose={() => setVersionDialogOpen(false)} maxWidth="sm">
          <DialogTitle>Version Details</DialogTitle>
          <DialogContent>
            {selectedVersion && (
              <Box>
                <Typography variant="h6">{selectedVersion.name}</Typography>
                <Typography variant="body2" color="text.secondary">Code: {selectedVersion.code}</Typography>
                <Typography variant="body2">Version: {selectedVersion.version || 1}</Typography>
                <Typography variant="body2">Status: {selectedVersion.status}</Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>Description: {selectedVersion.description}</Typography>
                {/* Add more version details if available */}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVersionDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Reject Degree Dialog */}
        <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="xs">
          <DialogTitle>Reject Degree</DialogTitle>
          <DialogContent>
            <Typography>Enter reason for rejection:</Typography>
            <TextField
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              fullWidth
              multiline
              rows={3}
              autoFocus
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmReject} variant="contained" color="error" disabled={!rejectReason}>Reject</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default DepartmentManagementPage;
