import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Alert,
  IconButton,
  Collapse,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Card,
  CardContent,
  Button,
  Dialog,
  TablePagination
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { enrollmentAPI, enrollmentsAPI } from '../../services/api';

import TimelineDialog, { TimelineEvent } from '../common/TimelineDialog';
import { timelineAPI } from '../../services/api';
import { Timeline as TimelineIcon } from '@mui/icons-material';

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester?: number;
  version_code: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  email: string;
  degree?: Degree;
}

interface PendingEnrollment {
  id: string;
  student_id: string;
  course_codes: string[];
  enrollment_status: string;
  is_submitted: boolean;
  submitted_at: string;
  academic_year: string;
  semester: number;
  student: Student;
  course?: Course;
  courses?: Course[];
  createdAt: string;
  updatedAt: string;
}

interface GroupedEnrollment {
  student: PendingEnrollment['student'];
  semester: number;
  enrollments: PendingEnrollment[];
}

// Removed unused Department type

interface Degree {
  id: string;
  name: string;
  code: string;
}

const EnrollmentApprovalsTab: React.FC = () => {
  const [pendingApprovals, setPendingApprovals] = useState<GroupedEnrollment[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  // Pagination state
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });

  // Filters
  const [selectedDegree, setSelectedDegree] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Selection and approval
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);

  // State for dialogs
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // State for individual approval/rejection
  const [individualRejectionDialog, setIndividualRejectionDialog] = useState(false);
  const [individualRejectionGroup, setIndividualRejectionGroup] = useState<GroupedEnrollment | null>(null);
  const [individualRejectionReason, setIndividualRejectionReason] = useState('');

  // Timeline dialog state
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineEntityName, setTimelineEntityName] = useState('');

  // Get department_code from user context
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { user } = require('../../contexts/AuthContext').useAuth();
  const departmentCode = user?.department?.code || user?.department_code || '';
  const [approvalInProgress, setApprovalInProgress] = useState(false);

  const loadPendingApprovals = React.useCallback(async () => {
    try {
      setLoading(true);
  const params: any = {
    page: pagination.page,
    limit: pagination.limit
  };
  if (selectedDegree) params.degree_id = selectedDegree;
  if (selectedSemester) params.semester = selectedSemester;
  if (searchTerm) params.search = searchTerm;
  if (departmentCode) params.department_code = departmentCode;

      // Fetch enrollments list (backend now returns a plain array). Keep compatibility with legacy { pendingApprovals: [] }.
  const raw = await enrollmentsAPI.getEnrollments(params);
  // Use new paginated response
  const data = raw && raw.enrollments ? raw : { enrollments: [], pagination: { total: 0, page: 1, limit: 20, pages: 1 } };
      console.log('Pending approvals data:', data);
      
      // The data comes in a flat structure but we need to group it for display
      // Group enrollments by student and semester
      const groupedData: GroupedEnrollment[] = [];
      const groupMap: Record<string, number> = {};
      
      if (data.enrollments && data.enrollments.length > 0) {
        data.enrollments.forEach((enrollment: any) => {
          // Always use enrollment.student for grouping and display
          let studentObj = enrollment.student;
          if (!studentObj) {
            // Fallback for legacy/old API format
            studentObj = {
              id: enrollment.student_id,
              first_name: '',
              last_name: '',
              student_id: enrollment.student_id,
              email: '',
              degree: undefined
            };
          }
          if (enrollment.enrollments && enrollment.enrollments.length > 0) {
            // New API format - process each enrollment in the enrollments array
            enrollment.enrollments.forEach((innerEnrollment: any) => {
              const key = `${studentObj.id}-${enrollment.semester}`;
              if (groupMap[key] === undefined) {
                // Create a new group
                groupMap[key] = groupedData.length;
                groupedData.push({
                  student: studentObj,
                  semester: enrollment.semester,
                  enrollments: []
                });
              }
              // Add the enrollment to the group
              groupedData[groupMap[key]].enrollments.push({
                ...innerEnrollment,
                student: studentObj
              });
            });
          } else {
            // Old API format - direct enrollment object
            const key = `${studentObj.id}-${enrollment.semester}`;
            // Normalize course data - find the first course in the courses array if course is missing
            if (!enrollment.course && enrollment.courses && enrollment.courses.length > 0) {
              enrollment.course = enrollment.courses[0];
            }
            if (groupMap[key] === undefined) {
              // Create a new group
              groupMap[key] = groupedData.length;
              groupedData.push({
                student: studentObj,
                semester: enrollment.semester,
                enrollments: [enrollment]
              });
            } else {
              // Add to existing group
              groupedData[groupMap[key]].enrollments.push(enrollment);
            }
          }
        });
        // Filter by degree after grouping if selectedDegree is set
        const filteredGroupedData = selectedDegree
          ? groupedData.filter(group => group.student.degree && group.student.degree.id === selectedDegree)
          : groupedData;
        setPendingApprovals(filteredGroupedData);
        setPagination(data.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
        // Extract unique degrees from the enrollment requests to populate the dropdown
        if (!selectedDegree && data.enrollments && data.enrollments.length > 0) {
          const uniqueDegrees = new Map<string, Degree>();
          data.enrollments.forEach((enrollment: any) => {
            const student = enrollment.student || (enrollment.enrollments && enrollment.enrollments[0]?.student);
            if (student?.degree && !uniqueDegrees.has(student.degree.id)) {
              uniqueDegrees.set(student.degree.id, {
                id: student.degree.id,
                name: student.degree.name,
                code: student.degree.code
              });
            }
          });
          setDegrees(Array.from(uniqueDegrees.values()));
        }
      } else {
        setPendingApprovals([]);
        setPagination(data.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
      }
    } catch (err) {
      setError('Failed to load pending approvals');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDegree, selectedSemester, searchTerm]);

  useEffect(() => {
    // Just load pending approvals - degrees will be extracted from the response
    loadPendingApprovals();
  }, [loadPendingApprovals, pagination.page, pagination.limit, selectedDegree, selectedSemester, searchTerm]);

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const handleGroupSelection = (group: GroupedEnrollment, checked: boolean) => {
    const enrollmentIds = group.enrollments.map(e => e.id);
    setSelectedEnrollments(prev => 
      checked 
        ? [...prev.filter(id => !enrollmentIds.includes(id)), ...enrollmentIds]
        : prev.filter(id => !enrollmentIds.includes(id))
    );
  };

  const handleApprove = async () => {
    if (selectedEnrollments.length === 0) return;

    try {
      await enrollmentAPI.approveEnrollments({
        enrollment_ids: selectedEnrollments
      });
      setSuccess('Enrollments approved successfully');
      setSelectedEnrollments([]);
      setApprovalDialog(false);
      loadPendingApprovals();
    } catch (err) {
      setError('Failed to approve enrollments');
      console.error(err);
    }
  };

  const handleReject = async () => {
    if (selectedEnrollments.length === 0 || !rejectionReason.trim()) return;

    try {
      await enrollmentAPI.rejectEnrollments({
        enrollment_ids: selectedEnrollments,
        rejection_reason: rejectionReason
      });
      setSuccess('Enrollments change request submitted successfully');
      setSelectedEnrollments([]);
      setRejectionDialog(false);
      setRejectionReason('');
      loadPendingApprovals();
    } catch (err) {
      setError('Failed to reject enrollments');
      console.error(err);
    }
  };

  // Individual approval/rejection handlers
  const handleIndividualApprove = async (group: GroupedEnrollment) => {
    if (approvalInProgress) return;
    
    try {
      setApprovalInProgress(true);
      const enrollmentIds = group.enrollments.map(e => e.id);
      
      await enrollmentAPI.approveEnrollments({
        enrollment_ids: enrollmentIds
      });
      
      setSuccess(`Enrollment for ${group.student.first_name} ${group.student.last_name} approved successfully`);
      loadPendingApprovals();
    } catch (err) {
      setError('Failed to approve enrollment');
      console.error(err);
    } finally {
      setApprovalInProgress(false);
    }
  };

  const handleIndividualReject = async () => {
    if (!individualRejectionGroup || !individualRejectionReason.trim()) return;
    
    try {
      const enrollmentIds = individualRejectionGroup.enrollments.map(e => e.id);
      
      await enrollmentAPI.rejectEnrollments({
        enrollment_ids: enrollmentIds,
        rejection_reason: individualRejectionReason
      });
      
      setSuccess(`Enrollment for ${individualRejectionGroup.student.first_name} ${individualRejectionGroup.student.last_name} returned to draft status successfully`);
      setIndividualRejectionGroup(null);
      setIndividualRejectionDialog(false);
      setIndividualRejectionReason('');
      loadPendingApprovals();
    } catch (err) {
      setError('Failed to reject enrollment');
      console.error(err);
    }
  };

  const handleOpenTimelineDialog = async (group: GroupedEnrollment) => {
    setTimelineDialogOpen(true);
    setTimelineEntityName(`${group.student.first_name} ${group.student.last_name}`);
    try {
      const events = await timelineAPI.getTimeline('enrollment', group.enrollments[0].id);
      setTimelineEvents(events);
    } catch (err) {
      setTimelineEvents([]);
    }
  };

  const handleCloseTimelineDialog = () => {
    setTimelineDialogOpen(false);
    setTimelineEvents([]);
    setTimelineEntityName('');
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading pending approvals...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, py: { xs: 2, sm: 3 }, pb: 1, maxWidth: '100%', width: '100%' }}>

    {error && (
      <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
        {error}
      </Alert>
    )}

    {success && (
      <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
        {success}
      </Alert>
    )}

    {/* Filters */}
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        Filters
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ minWidth: 200 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Filter by Degree</InputLabel>
            <Select
              value={selectedDegree}
              label="Filter by Degree"
              onChange={(e) => setSelectedDegree(e.target.value)}
            >
              <MenuItem value="">All Degrees</MenuItem>
              {degrees.map((degree) => (
                <MenuItem key={degree.id} value={degree.id}>
                  {degree.name} ({degree.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
          <Box sx={{ minWidth: 150 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Semester</InputLabel>
              <Select
                value={selectedSemester}
                label="Filter by Semester"
                onChange={(e) => setSelectedSemester(e.target.value)}
              >
                <MenuItem value="">All Semesters</MenuItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <MenuItem key={sem} value={sem.toString()}>
                    Semester {sem}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ minWidth: 250, flex: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Search by student name or ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>
        </Box>
      </Paper>

      {/* Action buttons */}
      {selectedEnrollments.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {selectedEnrollments.length} enrollment(s) selected
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<ApproveIcon />}
              onClick={() => setApprovalDialog(true)}
            >
              Approve Selected
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<RejectIcon />}
              onClick={() => setRejectionDialog(true)}
            >
              Request Changes for Selected
            </Button>
          </Box>
        </Paper>
      )}

      {/* Pending enrollments grouped by student */}
      {pendingApprovals.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No pending enrollments
          </Typography>
          <Typography color="text.secondary">
            All enrollment requests have been processed.
          </Typography>
        </Paper>
      ) : (
  <Box>
          {pendingApprovals.map((group) => {
            const groupKey = `${group.student.id}-${group.semester}`;
            const isExpanded = expandedGroups[groupKey];
            const isGroupSelected = group.enrollments.every(e => selectedEnrollments.includes(e.id));
            const isPartiallySelected = group.enrollments.some(e => selectedEnrollments.includes(e.id));

            return (
              <Card key={groupKey} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    justifyContent: 'space-between',
                    gap: { xs: 2, md: 3 },
                    width: '100%'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      <Checkbox
                        checked={isGroupSelected}
                        indeterminate={!isGroupSelected && isPartiallySelected}
                        onChange={(e) => handleGroupSelection(group, e.target.checked)}
                        sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}
                      />
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'flex-start', width: '100%', gap: { xs: 2, sm: 4 } }}>
                        {/* Student Name Column */}
                        <Box sx={{ minWidth: 120, display: 'flex', alignItems: 'center', mb: { xs: 1, sm: 0 } }}>
                          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {group.student.first_name} {group.student.last_name}
                          </Typography>
                        </Box>
                        {/* Student Details Column */}
                        <Box sx={{ minWidth: 180, textAlign: 'left', mb: { xs: 1, sm: 0 } }}>
                          <Typography variant="body1" sx={{ mb: 0.5, textAlign: 'left' }}>
                            <span style={{ color: '#6c757d' }}>Student ID:</span> <span style={{ color: '#212121' }}>{group.student.student_id}</span>
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 0.5, textAlign: 'left' }}>
                            <span style={{ color: '#6c757d' }}>Degree:</span> <span style={{ color: '#212121' }}>{group.student.degree?.name} ({group.student.degree?.code})</span>
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 0.5, textAlign: 'left' }}>
                            <span style={{ color: '#6c757d' }}>Semester:</span> <span style={{ color: '#212121' }}>{group.semester}</span>
                          </Typography>
                        </Box>
                        <Box sx={{ minWidth: 160, textAlign: 'left', mb: { xs: 1, sm: 0 } }}>
                          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5, textAlign: 'left' }}>
                            Selected Courses ({group.enrollments[0].course_codes.length}):
                          </Typography>
                          <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
                            {group.enrollments[0].course_codes.map((code: string) => {
                              const course = group.enrollments[0].courses?.find((c: any) => c.code === code);
                              return (
                                <li key={code} style={{ marginBottom: '0.25em', fontSize: '1rem', color: '#212121' }}>
                                  {course ? `${course.name} (${code})` : code}
                                </li>
                              );
                            })}
                          </ul>
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'flex-end', mt: { xs: 2, md: 0 } }}>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTimelineDialog(group);
                        }}
                        variant="text"
                        color="primary"
                        startIcon={<TimelineIcon />}
                        sx={{ textTransform: 'none', fontWeight: 500, fontSize: 16, minWidth: 0, px: 1, mr: { sm: 2, xs: 0 } }}
                      >
                        Timeline
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIndividualRejectionGroup(group);
                          setIndividualRejectionDialog(true);
                        }}
                        variant="outlined"
                        color="error"
                        startIcon={<RejectIcon />}
                        sx={{ mb: { xs: 1, sm: 0 }, mr: { sm: 2, xs: 0 } }}
                      >
                        Request Change
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleIndividualApprove(group);
                        }}
                        variant="contained"
                        color="success"
                        startIcon={<ApproveIcon />}
                      >
                        Approve
                      </Button>
                    </Box>
                  </Box>

                  {/* Show course details table directly below info, no dropdown */}
                  {/* Removed course details table */}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Approval Dialog */}
      {/* Pagination Controls */}
      {pagination.total > 0 && (
        <Box sx={{ mt: 2, mb: 1, justifyContent: 'flex-end', width: '100%' }}>
          <Paper sx={{ minWidth: 320 }}>
            <TablePagination
              component="div"
              count={pagination.total}
              page={pagination.page - 1}
              onPageChange={(_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => setPagination(prev => ({ ...prev, page: newPage + 1 }))}
              rowsPerPage={pagination.limit}
              onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => setPagination(prev => ({ ...prev, page: 1, limit: parseInt(event.target.value, 10) }))}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </Paper>
        </Box>
      )}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}
        PaperProps={{ sx: { borderRadius: 3, minWidth: 400, p: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 22, pb: 1 }}>Approve Enrollments</DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <Typography sx={{ fontSize: 18, mb: 2 }}>
            Are you sure you want to approve <b>{selectedEnrollments.length}</b> selected enrollment(s)?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end' }}>
          <Button onClick={() => setApprovalDialog(false)} variant="outlined" color="inherit" sx={{ borderRadius: 1, minWidth: 120, fontWeight: 500, fontSize: 16, py: 1, px: 3, mx: 1 }}>
            Cancel
          </Button>
          <Button onClick={handleApprove} variant="contained" color="success" startIcon={<ApproveIcon />} sx={{ borderRadius: 1, minWidth: 120, fontWeight: 600, fontSize: 16, py: 1, px: 3, mx: 1, boxShadow: 1 }}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog} onClose={() => setRejectionDialog(false)}>
  <DialogTitle>Request Change for Enrollments</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Please provide a reason for requesting change for {selectedEnrollments.length} selected enrollment(s):
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Change Request Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectionDialog(false)} variant="outlined" color="inherit" sx={{ borderRadius: 1, minWidth: 120, fontWeight: 500, fontSize: 16, py: 1, px: 3, mx: 1 }}>
            Cancel
          </Button>
          <Button 
            onClick={handleReject} 
            variant="contained" 
            color="error"
            startIcon={<RejectIcon />}
            disabled={!rejectionReason.trim()}
            sx={{ borderRadius: 1, minWidth: 120, fontWeight: 600, fontSize: 16, py: 1, px: 3, mx: 1, boxShadow: 1 }}
          >
            Request Change
          </Button>
        </DialogActions>
      </Dialog>

      {/* Individual Rejection Dialog */}
      <Dialog open={individualRejectionDialog} onClose={() => setIndividualRejectionDialog(false)}>
  <DialogTitle>Request Change for Enrollment</DialogTitle>
        <DialogContent>
          {individualRejectionGroup && (
            <>
              <Typography gutterBottom>
                Please provide a reason for requesting change for this enrollment:
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                {individualRejectionGroup.student.first_name} {individualRejectionGroup.student.last_name}
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" component="span" sx={{ mr: 1 }}>
                  Student ID:
                </Typography>
                <Typography variant="body2" color="text.primary" component="span" sx={{ mr: 2 }}>
                  {individualRejectionGroup.student.student_id}
                </Typography>
                <Typography variant="body2" color="text.secondary" component="span" sx={{ mr: 1 }}>
                  Semester:
                </Typography>
                <Typography variant="body2" color="text.primary" component="span">
                  {individualRejectionGroup.semester}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Courses:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
                  {individualRejectionGroup.enrollments[0].course_codes.map((code: string) => {
                    const course = individualRejectionGroup.enrollments[0].courses?.find((c: any) => c.code === code);
                    return (
                      <li key={code} style={{ marginBottom: '0.25em', fontSize: '1rem', color: '#212121' }}>
                        <span style={{ color: '#212121' }}>{course ? `${course.name} (${code})` : code}</span>
                      </li>
                    );
                  })}
                </ul>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Change Request Reason"
                value={individualRejectionReason}
                onChange={(e) => setIndividualRejectionReason(e.target.value)}
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIndividualRejectionDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleIndividualReject} 
            variant="contained" 
            color="error"
            disabled={!individualRejectionReason.trim()}
          >
            Request Change
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timeline Dialog */}
      <TimelineDialog
        open={timelineDialogOpen}
        onClose={handleCloseTimelineDialog}
        events={timelineEvents}
        entityName={timelineEntityName}
      />
    </Box>
  );
};

export default EnrollmentApprovalsTab;
