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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  CircularProgress,
} from '@mui/material';
import { 
  People, 
  School, 
  Class, 
  Assignment,
  Search as SearchIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  LockReset as PasswordResetIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import CreateDepartmentDialog from '../../components/admin/CreateDepartmentDialog';
import { useNavigate } from 'react-router-dom';
import { usersAPI, departmentsAPI } from '../../services/api';
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
  // ...existing code...
  useEffect(() => {
    fetchAllUsers();
    loadDepartments();
  }, []);
  const [tabValue, setTabValue] = useState(0);
  const [createDepartmentOpen, setCreateDepartmentOpen] = useState(false);
  const [users, setUsers] = useState<any[] | null>(null);
  const [departments, setDepartments] = useState<any[] | null>(null);
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
  
  // Add pagination state for each user type
  const [pagination, setPagination] = useState({
    student: { page: 1, limit: 20, total: 0, pages: 1 },
    faculty: { page: 1, limit: 20, total: 0, pages: 1 },
    office: { page: 1, limit: 20, total: 0, pages: 1 },
  });
  const [pageLoading, setPageLoading] = useState(false);

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
      // loadUsers();
      fetchAllUsers();
      enqueueSnackbar(`User ${action}d successfully!`, { variant: 'success' });
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      enqueueSnackbar(`Failed to ${action} user`, { variant: 'error' });
    } finally {
      setUserActionLoading(prev => ({ ...prev, [userId]: false }));
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Update loadUsers to support user_type and pagination
  const loadUsers = async (userType: string, page: number = 1, limit: number = 20) => {
    try {
      const response = await usersAPI.getUsers({ user_type: userType, page, limit });
      return {
        users: Array.isArray(response.users) ? response.users : [],
        pagination: response.pagination || { page, limit, total: 0, pages: 1 },
      };
    } catch (error) {
      console.error('Error loading users:', error);
      return { users: [], pagination: { page, limit, total: 0, pages: 1 } };
    }
  };

  // Load data
  const loadDepartments = async () => {
    try {
      const response = await departmentsAPI.getDepartments();
      setDepartments(response.departments || response);
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
    }
  };

  // Generic sorting state for all tables
  const [sortConfig, setSortConfig] = useState<{ tab: number; column: string; direction: 'asc' | 'desc' }>({ tab: 0, column: '', direction: 'asc' });

  // Generic sort handler
  const handleSort = (tab: number, column: string) => {
    setSortConfig(prev => ({
      tab,
      column,
      direction: prev.tab === tab && prev.column === column ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
    }));
  };

  // Generic sort function
  const getSortedData = (data: any[], tab: number) => {
    if (!sortConfig.column || sortConfig.tab !== tab) return data;
    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.column];
      let bVal = b[sortConfig.column];
      // Special cases
      if (sortConfig.column === 'department') {
        aVal = a.department?.name || '';
        bVal = b.department?.name || '';
      }
      if (sortConfig.column === 'last_login') {
        aVal = a.last_login ? new Date(a.last_login).getTime() : 0;
        bVal = b.last_login ? new Date(b.last_login).getTime() : 0;
      }
      if (sortConfig.column === 'is_head_of_department') {
        aVal = !!a.is_head_of_department ? 1 : 0;
        bVal = !!b.is_head_of_department ? 1 : 0;
      }
      if (sortConfig.column === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      }
      if (sortConfig.column === 'current_semester') {
        aVal = a.current_semester || 0;
        bVal = b.current_semester || 0;
      }
      // For string comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Fetch all users for all types and update state
  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const studentRes = await loadUsers('student', pagination.student.page, pagination.student.limit);
      const facultyRes = await loadUsers('faculty', pagination.faculty.page, pagination.faculty.limit);
      const officeRes = await loadUsers('office', pagination.office.page, pagination.office.limit);
      const allUsers = [
        ...studentRes.users,
        ...facultyRes.users,
        ...officeRes.users,
      ];
      setUsers(allUsers);
      setPagination(prev => ({
        ...prev,
        student: studentRes.pagination,
        faculty: facultyRes.pagination,
        office: officeRes.pagination,
      }));
    } catch (error) {
      enqueueSnackbar('Failed to fetch users', { variant: 'error' });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Stats for dashboard cards
  const stats = [
    {
      title: 'Students',
      count: pagination.student.total,
      color: 'primary',
      icon: <People />,
    },
    {
      title: 'Faculty',
      count: pagination.faculty.total,
      color: 'secondary',
      icon: <School />,
    },
    {
      title: 'Office Staff',
      count: pagination.office.total,
      color: 'info',
      icon: <Class />,
    },
    {
      title: 'Departments',
      count: Array.isArray(departments) ? departments.length : 0,
      color: 'success',
      icon: <Assignment />,
    },
  ];

  // Filter data based on search query and current tab
  useEffect(() => {
    const getCurrentData = () => {
      switch (tabValue) {
        case 0: // Students
          return Array.isArray(users) ? users.filter(u => u.user_type === 'student') : [];
        case 1: // Faculty
          return Array.isArray(users) ? users.filter(u => u.user_type === 'faculty') : [];
        case 2: // Office
          return Array.isArray(users) ? users.filter(u => u.user_type === 'office') : [];
        case 3: // Departments
          return Array.isArray(departments) ? departments : [];
        default:
          return [];
      }
    };

    let data: any[] = getCurrentData();

    // Filter based on inactive toggle - exclusive filtering
    if (tabValue === 3) { // Departments
      if (showInactiveDepartments) {
        data = Array.isArray(data) ? data.filter(item => item.status === 'inactive') : [];
      } else {
        data = Array.isArray(data) ? data.filter(item => item.status !== 'inactive') : [];
      }
    } else { // Users
      if (showInactiveUsers) {
        data = Array.isArray(data) ? data.filter(item => item.status === 'inactive') : [];
      } else {
        data = Array.isArray(data) ? data.filter(item => item.status !== 'inactive') : [];
      }
    }

    // Apply search filter
    if (searchQuery) {
      const filtered = Array.isArray(data) ? data.filter(item => {
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
      }) : [];
      setFilteredData(filtered);
    } else {
      setFilteredData(Array.isArray(data) ? data : []);
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
  
  // Helper function to get ordinal suffix for semester (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
      return 'st';
    }
    if (j === 2 && k !== 12) {
      return 'nd';
    }
    if (j === 3 && k !== 13) {
      return 'rd';
    }
    return 'th';
  };

  // Loader logic: block dashboard content until all API data is loaded
  const isLoading = users === null || departments === null;

  // Pagination controls for each tab (move above return)
  const handleChangePage = async (userType: 'student' | 'faculty' | 'office', newPage: number) => {
    // Update state with new page number
    setPagination(prev => ({
      ...prev,
      [userType]: {
        ...prev[userType],
        page: newPage,
      },
    }));
    
    // Set loading state
    setPageLoading(true);
    
    try {
      // Fetch data for the new page
      const response = await loadUsers(userType, newPage, pagination[userType].limit);
      
      // Update the users list by replacing only the users of the current type
      setUsers(prevUsers => {
        // Handle null case
        if (!prevUsers) return response.users;
        
        // Filter out users of the current type and add the new ones
        const otherTypeUsers = prevUsers.filter(user => user.user_type !== userType);
        return [...otherTypeUsers, ...response.users];
      });
      
      // Update pagination info
      setPagination(prev => ({
        ...prev,
        [userType]: response.pagination,
      }));
    } catch (error) {
      console.error(`Error loading page ${newPage} for ${userType}:`, error);
    } finally {
      setPageLoading(false);
    }
  };

  const handleChangeRowsPerPage = async (userType: 'student' | 'faculty' | 'office', newLimit: number) => {
    // Update state with new limit and reset to page 1
    setPagination(prev => ({
      ...prev,
      [userType]: {
        ...prev[userType],
        page: 1, // Reset to page 1 when changing limit
        limit: newLimit,
      },
    }));
    
    // Set loading state
    setPageLoading(true);
    
    try {
      // Fetch data with new limit, starting from page 1
      const response = await loadUsers(userType, 1, newLimit);
      
      // Update the users list by replacing only the users of the current type
      setUsers(prevUsers => {
        // Handle null case
        if (!prevUsers) return response.users;
        
        // Filter out users of the current type and add the new ones
        const otherTypeUsers = prevUsers.filter(user => user.user_type !== userType);
        return [...otherTypeUsers, ...response.users];
      });
      
      // Update pagination info
      setPagination(prev => ({
        ...prev,
        [userType]: response.pagination,
      }));
    } catch (error) {
      console.error(`Error changing rows per page for ${userType}:`, error);
    } finally {
      setPageLoading(false);
    }
  };

  return (
    <Box>
      {isLoading ? (
        <Card sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <svg width="48" height="48" viewBox="0 0 50 50" style={{ marginBottom: 16 }}>
            <circle cx="25" cy="25" r="20" fill="none" stroke="#1976d2" strokeWidth="5" strokeDasharray="31.4 31.4" strokeDashoffset="0">
              <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
            </circle>
          </svg>
          <Typography variant="h6" color="text.secondary">Loading dashboard...</Typography>
        </Card>
      ) : (
        <>
          <Box mb={3}>
            <Typography variant="h4" gutterBottom>
              Admin Dashboard
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Manage users, departments, and system administration
            </Typography>
          </Box>
          {/* Stats Cards */}
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }} gap={3} sx={{ mb: 3 }}>
            {stats.map((stat: any, index: number) => (
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
            {/* Tab panels */}
            <TabPanel value={tabValue} index={0}>
              {pageLoading && (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 200 }}>
                  <CircularProgress color="primary" />
                </Box>
              )}
              {/* Students Table */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  placeholder="Search students..."
                  variant="outlined"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell onClick={() => handleSort(0, 'first_name')} style={{ cursor: 'pointer' }}>First Name {sortConfig.tab === 0 && sortConfig.column === 'first_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(0, 'last_name')} style={{ cursor: 'pointer' }}>Last Name {sortConfig.tab === 0 && sortConfig.column === 'last_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(0, 'email')} style={{ cursor: 'pointer' }}>Email {sortConfig.tab === 0 && sortConfig.column === 'email' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(0, 'student_id')} style={{ cursor: 'pointer' }}>Student ID {sortConfig.tab === 0 && sortConfig.column === 'student_id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(0, 'department')} style={{ cursor: 'pointer' }}>Department {sortConfig.tab === 0 && sortConfig.column === 'department' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(0, 'current_semester')} style={{ cursor: 'pointer' }}>Semester {sortConfig.tab === 0 && sortConfig.column === 'current_semester' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(0, 'last_login')} style={{ cursor: 'pointer' }}>Last Login {sortConfig.tab === 0 && sortConfig.column === 'last_login' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(0, 'status')} style={{ cursor: 'pointer' }}>Status {sortConfig.tab === 0 && sortConfig.column === 'status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getSortedData((filteredData.length > 0 ? filteredData : users)?.filter((user: any) => user.user_type === 'student') || [], 0).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.first_name}</TableCell>
                        <TableCell>{user.last_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.student_id}</TableCell>
                        <TableCell>{user.department?.name || '-'}</TableCell>
                        <TableCell>
                          {user.current_semester ? `${user.current_semester}${getOrdinalSuffix(user.current_semester)} Semester` : '-'}
                        </TableCell>
                        <TableCell>
                          {user.last_login ?
                            new Date(user.last_login).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            })
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Chip label={user.status} color={getStatusColor(user.status)} />
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={() => handleEditUser(user)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handlePasswordReset(user)}>
                            <PasswordResetIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeactivateUser(user)}>
                            {user.status === 'active' ? <BlockIcon /> : null}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={pagination.student.total}
                page={pagination.student.page - 1}
                onPageChange={(e, newPage) => handleChangePage('student', newPage + 1)}
                rowsPerPage={pagination.student.limit}
                onRowsPerPageChange={e => handleChangeRowsPerPage('student', parseInt(e.target.value, 10))}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              {pageLoading && (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 200 }}>
                  <CircularProgress color="primary" />
                </Box>
              )}
              {/* Faculty Table */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  placeholder="Search faculty..."
                  variant="outlined"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell onClick={() => handleSort(1, 'first_name')} style={{ cursor: 'pointer' }}>First Name {sortConfig.tab === 1 && sortConfig.column === 'first_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(1, 'last_name')} style={{ cursor: 'pointer' }}>Last Name {sortConfig.tab === 1 && sortConfig.column === 'last_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(1, 'email')} style={{ cursor: 'pointer' }}>Email {sortConfig.tab === 1 && sortConfig.column === 'email' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(1, 'employee_id')} style={{ cursor: 'pointer' }}>Employee ID {sortConfig.tab === 1 && sortConfig.column === 'employee_id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(1, 'department')} style={{ cursor: 'pointer' }}>Department {sortConfig.tab === 1 && sortConfig.column === 'department' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(1, 'is_head_of_department')} style={{ cursor: 'pointer' }}>HOD {sortConfig.tab === 1 && sortConfig.column === 'is_head_of_department' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(1, 'last_login')} style={{ cursor: 'pointer' }}>Last Login {sortConfig.tab === 1 && sortConfig.column === 'last_login' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(1, 'status')} style={{ cursor: 'pointer' }}>Status {sortConfig.tab === 1 && sortConfig.column === 'status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getSortedData((filteredData.length > 0 ? filteredData : users)?.filter((user: any) => user.user_type === 'faculty') || [], 1).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.first_name}</TableCell>
                        <TableCell>{user.last_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.employee_id}</TableCell>
                        <TableCell>{user.department?.name || '-'}</TableCell>
                        <TableCell>
                          {user.is_head_of_department ? <Chip label="HOD" color="primary" /> : null}
                        </TableCell>
                        <TableCell>
                          {user.last_login ?
                            new Date(user.last_login).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            })
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Chip label={user.status} color={getStatusColor(user.status)} />
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={() => handleEditUser(user)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handlePasswordReset(user)}>
                            <PasswordResetIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeactivateUser(user)}>
                            {user.status === 'active' ? <BlockIcon /> : null}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={pagination.faculty.total}
                page={pagination.faculty.page - 1}
                onPageChange={(e, newPage) => handleChangePage('faculty', newPage + 1)}
                rowsPerPage={pagination.faculty.limit}
                onRowsPerPageChange={e => handleChangeRowsPerPage('faculty', parseInt(e.target.value, 10))}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              {pageLoading && (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 200 }}>
                  <CircularProgress color="primary" />
                </Box>
              )}
              {/* Office Staff Table */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  placeholder="Search office staff..."
                  variant="outlined"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell onClick={() => handleSort(2, 'first_name')} style={{ cursor: 'pointer' }}>First Name {sortConfig.tab === 2 && sortConfig.column === 'first_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(2, 'last_name')} style={{ cursor: 'pointer' }}>Last Name {sortConfig.tab === 2 && sortConfig.column === 'last_name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(2, 'email')} style={{ cursor: 'pointer' }}>Email {sortConfig.tab === 2 && sortConfig.column === 'email' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(2, 'employee_id')} style={{ cursor: 'pointer' }}>Employee ID {sortConfig.tab === 2 && sortConfig.column === 'employee_id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(2, 'last_login')} style={{ cursor: 'pointer' }}>Last Login {sortConfig.tab === 2 && sortConfig.column === 'last_login' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(2, 'status')} style={{ cursor: 'pointer' }}>Status {sortConfig.tab === 2 && sortConfig.column === 'status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getSortedData((filteredData.length > 0 ? filteredData : users)?.filter((user: any) => user.user_type === 'office') || [], 2).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.first_name}</TableCell>
                        <TableCell>{user.last_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.employee_id}</TableCell>
                        <TableCell>
                          {user.last_login ?
                            new Date(user.last_login).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            })
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Chip label={user.status} color={getStatusColor(user.status)} />
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={() => handleEditUser(user)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handlePasswordReset(user)}>
                            <PasswordResetIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeactivateUser(user)}>
                            {user.status === 'active' ? <BlockIcon /> : null}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={pagination.office.total}
                page={pagination.office.page - 1}
                onPageChange={(e, newPage) => handleChangePage('office', newPage + 1)}
                rowsPerPage={pagination.office.limit}
                onRowsPerPageChange={e => handleChangeRowsPerPage('office', parseInt(e.target.value, 10))}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
              {pageLoading && (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 200 }}>
                  <CircularProgress color="primary" />
                </Box>
              )}
              {/* Departments Table */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  placeholder="Search departments..."
                  variant="outlined"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell onClick={() => handleSort(3, 'name')} style={{ cursor: 'pointer' }}>Name {sortConfig.tab === 3 && sortConfig.column === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(3, 'code')} style={{ cursor: 'pointer' }}>Code {sortConfig.tab === 3 && sortConfig.column === 'code' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(3, 'description')} style={{ cursor: 'pointer' }}>Description {sortConfig.tab === 3 && sortConfig.column === 'description' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell onClick={() => handleSort(3, 'status')} style={{ cursor: 'pointer' }}>Status {sortConfig.tab === 3 && sortConfig.column === 'status' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getSortedData(filteredData.length > 0 ? filteredData : departments || [], 3).map((department) => (
                      <TableRow key={department.id}>
                        <TableCell>{department.name}</TableCell>
                        <TableCell>{department.code}</TableCell>
                        <TableCell>{department.description}</TableCell>
                        <TableCell>
                          <Chip label={department.status} color={getStatusColor(department.status)} />
                        </TableCell>
                        <TableCell>
                          <IconButton onClick={() => handleEditDepartment(department)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeactivateDepartment(department)}>
                            {department.status === 'active' ? <BlockIcon /> : null}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={pagination.office.total}
                page={pagination.office.page - 1}
                onPageChange={(e, newPage) => handleChangePage('office', newPage + 1)}
                rowsPerPage={pagination.office.limit}
                onRowsPerPageChange={e => handleChangeRowsPerPage('office', parseInt(e.target.value, 10))}
                rowsPerPageOptions={[10, 20, 50]}
              />
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
        </>
      )}
    </Box>
  );
};

export default AdminDashboard;
