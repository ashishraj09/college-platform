import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { 
  People, 
  School, 
  Class, 
  Assignment,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  LockReset as PasswordResetIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { usersAPI, departmentsAPI } from '../../services/api';
import CreateDepartmentDialog from '../../components/admin/CreateDepartmentDialog';
import LoadingButton from '../../components/common/LoadingButton';

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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

const AdminDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [createDepartmentOpen, setCreateDepartmentOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState<Record<string, boolean>>({});
  const [userActionLoading, setUserActionLoading] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState<any[]>([]);
  
  // Department edit form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active',
  });

  // Department edit dialog state
  const [editDepartmentOpen, setEditDepartmentOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  
  // Toggle switches for showing inactive items
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [showInactiveDepartments, setShowInactiveDepartments] = useState(false);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    content: '',
    action: '', // Add action type to determine button text and color
    onConfirm: () => {},
  });
  
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleEditUser = (user: any) => {
    navigate(`/admin/edit-user/${user.id}`);
  };

  const handlePasswordReset = (user: any) => {
    setConfirmDialog({
      open: true,
      title: `Reset Password for ${user.first_name} ${user.last_name}`,
      content: `Are you sure you want to reset the password for ${user.first_name} ${user.last_name}? A new temporary password will be sent to their email address.`,
      action: 'reset',
      onConfirm: () => confirmPasswordReset(user.id),
    });
  };

  const confirmPasswordReset = async (userId: string) => {
    setPasswordResetLoading(prev => ({ ...prev, [userId]: true }));
    try {
      await usersAPI.resetUserPassword(userId);
      enqueueSnackbar('Password reset successfully! New password sent to user\'s email.', { variant: 'success' });
    } catch (error) {
      console.error('Error resetting password:', error);
      enqueueSnackbar('Failed to reset password', { variant: 'error' });
    } finally {
      setPasswordResetLoading(prev => ({ ...prev, [userId]: false }));
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  const handleEditDepartment = (department: any) => {
    setEditingDepartment(department);
    setEditFormData({
      name: department.name,
      code: department.code,
      description: department.description || '',
      status: department.status,
    });
    setEditDepartmentOpen(true);
  };

  const handleSaveDepartment = async () => {
    if (!editingDepartment) return;
    
    // Validate required fields
    if (!editFormData.name.trim() || !editFormData.code.trim()) {
      enqueueSnackbar('Name and Code are required fields', { variant: 'error' });
      return;
    }
    
    try {
      setLoading(true);
      await departmentsAPI.updateDepartment(editingDepartment.id, editFormData);
      setEditDepartmentOpen(false);
      setEditingDepartment(null);
      loadDepartments();
      enqueueSnackbar('Department updated successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Error updating department:', error);
      enqueueSnackbar('Failed to update department', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateDepartment = (department: any) => {
    const action = department.status === 'active' ? 'deactivate' : 'activate';
    setConfirmDialog({
      open: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Department`,
      content: `Are you sure you want to ${action} the department "${department.name}"?`,
      action: action,
      onConfirm: () => confirmToggleDepartmentStatus(department.id, action),
    });
  };

  const confirmToggleDepartmentStatus = async (departmentId: string, action: string) => {
    try {
      const newStatus = action === 'activate' ? 'active' : 'inactive';
      await departmentsAPI.updateDepartment(departmentId, { status: newStatus });
      loadDepartments();
      enqueueSnackbar(`Department ${action}d successfully!`, { variant: 'success' });
    } catch (error) {
      console.error(`Error ${action}ing department:`, error);
      enqueueSnackbar(`Failed to ${action} department`, { variant: 'error' });
    } finally {
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  const handleDeactivateUser = (user: any) => {
    const action = user.status === 'active' ? 'deactivate' : 'activate';
    setConfirmDialog({
      open: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      content: `Are you sure you want to ${action} the user "${user.first_name} ${user.last_name}"?`,
      action: action,
      onConfirm: () => confirmToggleUserStatus(user.id, action),
    });
  };

  const confirmToggleUserStatus = async (userId: string, action: string) => {
    setUserActionLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const newStatus = action === 'activate' ? 'active' : 'inactive';
      await usersAPI.updateUser(userId, { status: newStatus });
      loadUsers();
      enqueueSnackbar(`User ${action}d successfully!`, { variant: 'success' });
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      enqueueSnackbar(`Failed to ${action} user`, { variant: 'error' });
    } finally {
      setUserActionLoading(prev => ({ ...prev, [userId]: false }));
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Handle ResizeObserver errors that commonly occur with MUI tables and responsive layouts
  useEffect(() => {
    const handleResizeObserverError = (event: ErrorEvent) => {
      if (event.message?.includes('ResizeObserver loop completed with undelivered notifications')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('error', handleResizeObserverError);
    
    return () => {
      window.removeEventListener('error', handleResizeObserverError);
    };
  }, []);

  // Load data
  const loadUsers = async () => {
    try {
      const response = await usersAPI.getUsers();
      const usersData = response.users || response;
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentsAPI.getDepartments();
      setDepartments(response.departments || response);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, []);

  // Filter data based on search query and current tab
  useEffect(() => {
    const getCurrentData = () => {
      switch (tabValue) {
        case 0: // Students
          return users.filter(u => u.user_type === 'student');
        case 1: // Faculty
          return users.filter(u => u.user_type === 'faculty');
        case 2: // Office
          return users.filter(u => u.user_type === 'office');
        case 3: // Departments
          return departments;
        default:
          return [];
      }
    };

    let data = getCurrentData();
    
    // Filter based on inactive toggle - exclusive filtering
    if (tabValue === 3) { // Departments
      if (showInactiveDepartments) {
        // When toggle is ON, show ONLY inactive items
        data = data.filter(item => item.status === 'inactive');
      } else {
        // When toggle is OFF, show all EXCEPT inactive items
        data = data.filter(item => item.status !== 'inactive');
      }
    } else { // Users
      if (showInactiveUsers) {
        // When toggle is ON, show ONLY inactive items
        data = data.filter(item => item.status === 'inactive');
      } else {
        // When toggle is OFF, show all EXCEPT inactive items
        data = data.filter(item => item.status !== 'inactive');
      }
    }

    // Apply search filter
    if (searchQuery) {
      const filtered = data.filter(item => {
        if (tabValue === 3) { // Departments
          return item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 item.code?.toLowerCase().includes(searchQuery.toLowerCase());
        } else { // Users
          return item.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 item.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 item.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 item.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 item.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
        }
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [tabValue, searchQuery, users, departments, showInactiveUsers, showInactiveDepartments]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSearchQuery(''); // Reset search when changing tabs
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'pending': return 'warning';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const stats = [
    {
      title: 'Total Students',
      count: users.filter(u => u.user_type === 'student').length,
      icon: <People sx={{ fontSize: 40 }} />,
      color: '#1976d2'
    },
    {
      title: 'Faculty Members',
      count: users.filter(u => u.user_type === 'faculty').length,
      icon: <School sx={{ fontSize: 40 }} />,
      color: '#388e3c'
    },
    {
      title: 'Office Staff',
      count: users.filter(u => u.user_type === 'office').length,
      icon: <Class sx={{ fontSize: 40 }} />,
      color: '#f57c00'
    },
    {
      title: 'Departments',
      count: departments.length,
      icon: <Assignment sx={{ fontSize: 40 }} />,
      color: '#d32f2f'
    },
  ];

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage users, departments, and system administration
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box 
        display="grid" 
        gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }}
        gap={3} 
        sx={{ mb: 3 }}
      >
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" color="textSecondary">
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" color={stat.color}>
                    {stat.count}
                  </Typography>
                </Box>
                <Box sx={{ color: stat.color }}>
                  {stat.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
            <Tab label="Students" />
            <Tab label="Faculty" />
            <Tab label="Office Staff" />
            <Tab label="Departments" />
          </Tabs>
        </Box>

        {/* Search Bar */}
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <TextField
                placeholder={tabValue === 3 ? "Search departments..." : "Search users..."}
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 300 }}
              />
              
              {/* Show Inactive Toggle */}
              {tabValue === 3 ? (
                <FormControlLabel
                  control={
                    <Switch
                      checked={showInactiveDepartments}
                      onChange={(e) => setShowInactiveDepartments(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Show Inactive"
                />
              ) : (
                <FormControlLabel
                  control={
                    <Switch
                      checked={showInactiveUsers}
                      onChange={(e) => setShowInactiveUsers(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Show Inactive"
                />
              )}
            </Box>
            
            <Box>
              {/* Create User buttons for each user type tab */}
              {(tabValue === 0 || tabValue === 1 || tabValue === 2) && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/admin/create-user')}
                >
                  Create User
                </Button>
              )}
              {/* Add Department button for departments tab */}
              {tabValue === 3 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDepartmentOpen(true)}
                >
                  Add Department
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          {/* Students Table */}
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2 }}>
                          {student.first_name?.charAt(0)}
                        </Avatar>
                        {student.first_name} {student.last_name}
                      </Box>
                    </TableCell>
                    <TableCell>{student.student_id || 'N/A'}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.department?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={student.status} 
                        color={getStatusColor(student.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit User">
                        <IconButton size="small" onClick={() => handleEditUser(student)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <span>
                          <LoadingButton
                            size="small"
                            variant="text"
                            onClick={() => handlePasswordReset(student)}
                            loading={passwordResetLoading[student.id] || false}
                            sx={{ minWidth: 'auto', padding: '4px' }}
                          >
                            <PasswordResetIcon />
                          </LoadingButton>
                        </span>
                      </Tooltip>
                      {student.status !== 'inactive' && (
                        <Tooltip title="Deactivate User">
                          <span>
                            <LoadingButton
                              size="small"
                              variant="text"
                              onClick={() => handleDeactivateUser(student)}
                              loading={userActionLoading[student.id] || false}
                              sx={{ minWidth: 'auto', padding: '4px' }}
                            >
                              <BlockIcon />
                            </LoadingButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Faculty Table */}
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>HOD</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.map((faculty) => (
                  <TableRow key={faculty.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2 }}>
                          {faculty.first_name?.charAt(0)}
                        </Avatar>
                        {faculty.first_name} {faculty.last_name}
                      </Box>
                    </TableCell>
                    <TableCell>{faculty.employee_id || 'N/A'}</TableCell>
                    <TableCell>{faculty.email}</TableCell>
                    <TableCell>{faculty.department?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={faculty.is_head_of_department ? 'Yes' : 'No'} 
                        color={faculty.is_head_of_department ? 'primary' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={faculty.status} 
                        color={getStatusColor(faculty.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit User">
                        <IconButton size="small" onClick={() => handleEditUser(faculty)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <span>
                          <LoadingButton
                            size="small"
                            variant="text"
                            onClick={() => handlePasswordReset(faculty)}
                            loading={passwordResetLoading[faculty.id] || false}
                            sx={{ minWidth: 'auto', padding: '4px' }}
                          >
                            <PasswordResetIcon />
                          </LoadingButton>
                        </span>
                      </Tooltip>
                      {faculty.status !== 'inactive' && (
                        <Tooltip title="Deactivate User">
                          <span>
                            <LoadingButton
                              size="small"
                              variant="text"
                              onClick={() => handleDeactivateUser(faculty)}
                              loading={userActionLoading[faculty.id] || false}
                              sx={{ minWidth: 'auto', padding: '4px' }}
                            >
                              <BlockIcon />
                            </LoadingButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Office Staff Table */}
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Avatar sx={{ mr: 2 }}>
                          {staff.first_name?.charAt(0)}
                        </Avatar>
                        {staff.first_name} {staff.last_name}
                      </Box>
                    </TableCell>
                    <TableCell>{staff.employee_id || 'N/A'}</TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>{staff.department?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={staff.status} 
                        color={getStatusColor(staff.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit User">
                        <IconButton size="small" onClick={() => handleEditUser(staff)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <span>
                          <LoadingButton
                            size="small"
                            variant="text"
                            onClick={() => handlePasswordReset(staff)}
                            loading={passwordResetLoading[staff.id] || false}
                            sx={{ minWidth: 'auto', padding: '4px' }}
                          >
                            <PasswordResetIcon />
                          </LoadingButton>
                        </span>
                      </Tooltip>
                      {staff.status !== 'inactive' && (
                        <Tooltip title="Deactivate User">
                          <span>
                            <LoadingButton
                              size="small"
                              variant="text"
                              onClick={() => handleDeactivateUser(staff)}
                              loading={userActionLoading[staff.id] || false}
                              sx={{ minWidth: 'auto', padding: '4px' }}
                            >
                              <BlockIcon />
                            </LoadingButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* Departments Table */}
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell>{department.name}</TableCell>
                    <TableCell>{department.code}</TableCell>
                    <TableCell>{department.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={department.status} 
                        color={getStatusColor(department.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit Department">
                        <IconButton size="small" onClick={() => handleEditDepartment(department)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {department.status !== 'inactive' && (
                        <Tooltip title="Deactivate Department">
                          <IconButton size="small" onClick={() => handleDeactivateDepartment(department)}>
                            <BlockIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>

      <CreateDepartmentDialog
        open={createDepartmentOpen}
        onClose={() => setCreateDepartmentOpen(false)}
        onSuccess={() => {
          setCreateDepartmentOpen(false);
          loadDepartments();
          enqueueSnackbar('Department created successfully!', { variant: 'success' });
        }}
      />

      {/* Edit Department Dialog */}
      <Dialog
        open={editDepartmentOpen}
        onClose={() => setEditDepartmentOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Department</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Department Name"
              name="name"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="code"
              label="Department Code"
              name="code"
              value={editFormData.code}
              onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
            />
            <TextField
              margin="normal"
              fullWidth
              id="description"
              label="Description"
              name="description"
              multiline
              rows={3}
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                id="status"
                value={editFormData.status}
                label="Status"
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDepartmentOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveDepartment}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDialog.onConfirm}
            color={confirmDialog.action === 'activate' ? 'success' : confirmDialog.action === 'reset' ? 'primary' : 'warning'}
            variant="contained"
          >
            {confirmDialog.action === 'activate' ? 'Activate' : confirmDialog.action === 'reset' ? 'Reset Password' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
