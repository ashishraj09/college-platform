import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
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
  ListItemSecondaryAction
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
import { enrollmentAPI } from '../../services/enrollmentApi';

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
  course_ids: string[];
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
  // Removed unused departments state
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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
  const [approvalInProgress, setApprovalInProgress] = useState(false);

  const loadPendingApprovals = React.useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedDegree) params.degree_id = selectedDegree;
      if (selectedSemester) params.semester = selectedSemester;
      if (searchTerm) params.search = searchTerm;

      const data = await enrollmentAPI.getPendingApprovals(params);
      console.log('Pending approvals data:', data);
      
      // The data comes in a flat structure but we need to group it for display
      // Group enrollments by student and semester
      const groupedData: GroupedEnrollment[] = [];
      const groupMap: Record<string, number> = {};
      
      if (data.pendingApprovals && data.pendingApprovals.length > 0) {
        data.pendingApprovals.forEach((enrollment: any) => {
          // Check if this is the new API format with enrollments array
          if (enrollment.enrollments && enrollment.enrollments.length > 0) {
            // New API format - process each enrollment in the enrollments array
            enrollment.enrollments.forEach((innerEnrollment: any) => {
              const key = `${enrollment.student.id}-${enrollment.semester}`;
              
              if (groupMap[key] === undefined) {
                // Create a new group
                groupMap[key] = groupedData.length;
                groupedData.push({
                  student: enrollment.student,
                  semester: enrollment.semester,
                  enrollments: []
                });
              }
              
              // Add the enrollment to the group
              groupedData[groupMap[key]].enrollments.push({
                ...innerEnrollment,
                student: enrollment.student
              });
            });
          } else {
            // Old API format - direct enrollment object
            const key = `${enrollment.student_id}-${enrollment.semester}`;
            
            // Normalize course data - find the first course in the courses array if course is missing
            if (!enrollment.course && enrollment.courses && enrollment.courses.length > 0) {
              enrollment.course = enrollment.courses[0];
            }
            
            if (groupMap[key] === undefined) {
              // Create a new group
              groupMap[key] = groupedData.length;
              groupedData.push({
                student: enrollment.student,
                semester: enrollment.semester,
                enrollments: [enrollment]
              });
            } else {
              // Add to existing group
              groupedData[groupMap[key]].enrollments.push(enrollment);
            }
          }
        });
      }
      
      console.log('Grouped data:', groupedData);
      setPendingApprovals(groupedData);
      
      // Extract unique degrees from the enrollment requests to populate the dropdown
      if (!selectedDegree && data.pendingApprovals && data.pendingApprovals.length > 0) {
        const uniqueDegrees = new Map<string, Degree>();
        
        data.pendingApprovals.forEach((enrollment: any) => {
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
  }, [loadPendingApprovals]);

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
      setSuccess('Enrollments returned to draft status successfully');
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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading pending approvals...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Student Enrollment Approvals
      </Typography>

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
              Return to Draft
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Checkbox
                        checked={isGroupSelected}
                        indeterminate={!isGroupSelected && isPartiallySelected}
                        onChange={(e) => handleGroupSelection(group, e.target.checked)}
                      />
                      <Box>
                        <Typography variant="h6">
                          {group.student.first_name} {group.student.last_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Student ID: {group.student.student_id} | 
                          Degree: {group.student.degree?.name} ({group.student.degree?.code})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Semester: {group.semester}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={`${group.enrollments.length} courses`} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent expansion toggling
                          handleIndividualApprove(group);
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent expansion toggling
                          setIndividualRejectionGroup(group);
                          setIndividualRejectionDialog(true);
                        }}
                      >
                        Return to Draft
                      </Button>
                      <IconButton
                        onClick={() => toggleGroupExpansion(groupKey)}
                        size="small"
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </Box>

                  <Collapse in={isExpanded}>
                    <Box sx={{ mt: 2 }}>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Course Code</TableCell>
                              <TableCell>Course Name</TableCell>
                              <TableCell>Credits</TableCell>
                              <TableCell>Requested</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.enrollments.map((enrollment) => {
                              // Handle both single course and multiple courses formats
                              if (enrollment.courses && enrollment.courses.length > 0) {
                                // Multiple courses format
                                return enrollment.courses.map((course: any) => (
                                  <TableRow key={`${enrollment.id}-${course.id}`}>
                                    <TableCell>{course.code}</TableCell>
                                    <TableCell>{course.name}</TableCell>
                                    <TableCell>{course.credits}</TableCell>
                                    <TableCell>
                                      {new Date(enrollment.createdAt).toLocaleDateString()}
                                    </TableCell>
                                  </TableRow>
                                ));
                              } else {
                                // Single course format
                                return (
                                  <TableRow key={enrollment.id}>
                                    <TableCell>{enrollment.course?.version_code || enrollment.course?.code || 'N/A'}</TableCell>
                                    <TableCell>{enrollment.course?.name || 'N/A'}</TableCell>
                                    <TableCell>{enrollment.course?.credits || 'N/A'}</TableCell>
                                    <TableCell>
                                      {new Date(enrollment.createdAt).toLocaleDateString()}
                                    </TableCell>
                                  </TableRow>
                                );
                              }
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)}>
        <DialogTitle>Approve Enrollments</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to approve {selectedEnrollments.length} selected enrollment(s)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
          <Button onClick={handleApprove} variant="contained" color="success">
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog} onClose={() => setRejectionDialog(false)}>
        <DialogTitle>Return Enrollments to Draft</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Please provide a reason for returning {selectedEnrollments.length} selected enrollment(s) to draft status:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectionDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleReject} 
            variant="contained" 
            color="error"
            disabled={!rejectionReason.trim()}
          >
            Return to Draft
          </Button>
        </DialogActions>
      </Dialog>

      {/* Individual Rejection Dialog */}
      <Dialog open={individualRejectionDialog} onClose={() => setIndividualRejectionDialog(false)}>
        <DialogTitle>Return Enrollment to Draft</DialogTitle>
        <DialogContent>
          {individualRejectionGroup && (
            <>
              <Typography gutterBottom>
                Please provide a reason for returning this enrollment to draft status:
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                {individualRejectionGroup.student.first_name} {individualRejectionGroup.student.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Student ID: {individualRejectionGroup.student.student_id}<br />
                Semester: {individualRejectionGroup.semester}<br />
                Courses: {individualRejectionGroup.enrollments.length}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Rejection Reason"
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
            Return to Draft
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnrollmentApprovalsTab;
