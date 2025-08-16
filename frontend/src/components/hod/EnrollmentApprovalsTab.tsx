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
  Collapse
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { enrollmentAPI } from '../../services/enrollmentApi';
import { departmentsAPI } from '../../services/departmentsApi';

interface PendingEnrollment {
  id: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    student_id: string;
    degree: {
      id: string;
      name: string;
      code: string;
    };
  };
  course: {
    id: string;
    name: string;
    code: string;
    version_code: string;
    credits: number;
  };
  academic_year: string;
  semester: number;
  createdAt: string;
}

interface GroupedEnrollment {
  student: PendingEnrollment['student'];
  academic_year: string;
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
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadPendingApprovals = React.useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedDegree) params.degree_id = selectedDegree;
      if (selectedSemester) params.semester = selectedSemester;
      if (searchTerm) params.search = searchTerm;

      const data = await enrollmentAPI.getPendingApprovals(params);
      setPendingApprovals(data.pendingApprovals);
    } catch (err) {
      setError('Failed to load pending approvals');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDegree, selectedSemester, searchTerm]);

  useEffect(() => {
    loadPendingApprovals();
    loadDepartments();
  }, [loadPendingApprovals]);

  const loadDepartments = async () => {
    try {
      const data = await departmentsAPI.getAllDepartments();
  // Removed setDepartments, not needed
      
      // Load degrees for the selected department (in real app, would be HOD's department)
      if (data.departments.length > 0) {
        const deptId = data.departments[0].id; // Use first department for demo
        const degreesData = await departmentsAPI.getDepartmentDegrees(deptId);
        setDegrees(degreesData.degrees);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const handleEnrollmentSelection = (enrollmentId: string, checked: boolean) => {
    setSelectedEnrollments(prev => 
      checked 
        ? [...prev, enrollmentId]
        : prev.filter(id => id !== enrollmentId)
    );
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
      await enrollmentAPI.hodDecision({
        enrollment_ids: selectedEnrollments,
        action: 'approve'
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
      await enrollmentAPI.hodDecision({
        enrollment_ids: selectedEnrollments,
        action: 'reject',
        rejection_reason: rejectionReason
      });
      setSuccess('Enrollments rejected successfully');
      setSelectedEnrollments([]);
      setRejectionDialog(false);
      setRejectionReason('');
      loadPendingApprovals();
    } catch (err) {
      setError('Failed to reject enrollments');
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
              Reject Selected
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
            const groupKey = `${group.student.id}-${group.academic_year}-${group.semester}`;
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
                          Degree: {group.student.degree.name} ({group.student.degree.code})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Academic Year: {group.academic_year} | Semester: {group.semester}
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
                              <TableCell>Select</TableCell>
                              <TableCell>Course Code</TableCell>
                              <TableCell>Course Name</TableCell>
                              <TableCell>Credits</TableCell>
                              <TableCell>Requested</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.enrollments.map((enrollment) => (
                              <TableRow key={enrollment.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedEnrollments.includes(enrollment.id)}
                                    onChange={(e) => handleEnrollmentSelection(enrollment.id, e.target.checked)}
                                  />
                                </TableCell>
                                <TableCell>{enrollment.course.version_code}</TableCell>
                                <TableCell>{enrollment.course.name}</TableCell>
                                <TableCell>{enrollment.course.credits}</TableCell>
                                <TableCell>
                                  {new Date(enrollment.createdAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
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
        <DialogTitle>Reject Enrollments</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Please provide a reason for rejecting {selectedEnrollments.length} selected enrollment(s):
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
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnrollmentApprovalsTab;
