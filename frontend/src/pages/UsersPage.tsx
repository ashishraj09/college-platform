import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Lock as PasswordResetIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { usersAPI } from '../services/api';
import CreateUserDialog from '../components/admin/CreateUserDialog';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: 'student' | 'faculty' | 'office' | 'admin';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  student_id?: string;
  employee_id?: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
  degree?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UsersPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const UsersPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<UsersPagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    status: 'pending' as User['status']
  });

  const fetchUsers = async (page: number = 1, limit: number = 20) => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersAPI.getUsers({ page, limit });
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
      enqueueSnackbar('Failed to fetch users', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    fetchUsers(newPage + 1, pagination.limit);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    fetchUsers(1, newLimit);
  };

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    fetchUsers(pagination.page, pagination.limit);
    enqueueSnackbar('User created successfully!', { variant: 'success' });
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      status: user.status
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    try {
      await usersAPI.updateUser(selectedUser.id, editFormData);
      setEditDialogOpen(false);
      fetchUsers(pagination.page, pagination.limit);
      enqueueSnackbar('User updated successfully!', { variant: 'success' });
    } catch (err: any) {
      console.error('Error updating user:', err);
      enqueueSnackbar(err.message || 'Failed to update user', { variant: 'error' });
    }
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    try {
      await usersAPI.deleteUser(selectedUser.id);
      setDeleteDialogOpen(false);
      fetchUsers(pagination.page, pagination.limit);
      enqueueSnackbar('User deleted successfully!', { variant: 'success' });
    } catch (err: any) {
      console.error('Error deleting user:', err);
      enqueueSnackbar(err.message || 'Failed to delete user', { variant: 'error' });
    }
  };

  const handlePasswordReset = (user: User) => {
    setSelectedUser(user);
    setPasswordResetDialogOpen(true);
  };

  const confirmPasswordReset = async () => {
    if (!selectedUser) return;

    setPasswordResetLoading(true);
    try {
      await usersAPI.resetUserPassword(selectedUser.id);
      setPasswordResetDialogOpen(false);
      enqueueSnackbar('Password reset email sent successfully!', { 
        variant: 'success',
        persist: false
      });
    } catch (err: any) {
      console.error('Error resetting password:', err);
      enqueueSnackbar(err.message || 'Failed to send password reset email', { 
        variant: 'error',
        persist: true
      });
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'suspended':
        return 'error';
      case 'inactive':
        return 'default';
      default:
        return 'default';
    }
  };

  const getUserTypeColor = (userType: User['user_type']) => {
    switch (userType) {
      case 'admin':
        return 'error';
      case 'faculty':
        return 'primary';
      case 'office':
        return 'secondary';
      case 'student':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Users Management
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={() => fetchUsers(pagination.page, pagination.limit)} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.user_type}
                      color={getUserTypeColor(user.user_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.student_id || user.employee_id || '-'}
                  </TableCell>
                  <TableCell>
                    {user.department ? (
                      <Box>
                        <Typography variant="body2">
                          {user.department.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.department.code}
                        </Typography>
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.status}
                      color={getStatusColor(user.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEditUser(user)}
                        sx={{ mr: 0.5 }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reset Password">
                      <IconButton
                        size="small"
                        onClick={() => handlePasswordReset(user)}
                        color="warning"
                        sx={{ mr: 0.5 }}
                      >
                        <PasswordResetIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={handleChangePage}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Paper>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="First Name"
              value={editFormData.first_name}
              onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Last Name"
              value={editFormData.last_name}
              onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              value={editFormData.email}
              onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={editFormData.status}
                label="Status"
                onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as User['status'] }))}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{selectedUser?.first_name} {selectedUser?.last_name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Reset Confirmation Dialog */}
      <Dialog
        open={passwordResetDialogOpen}
        onClose={() => setPasswordResetDialogOpen(false)}
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography>
            Send password reset email to "{selectedUser?.first_name} {selectedUser?.last_name}" 
            at {selectedUser?.email}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            They will receive an email with a link to set a new password.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordResetDialogOpen(false)} disabled={passwordResetLoading}>
            Cancel
          </Button>
          <Button 
            onClick={confirmPasswordReset} 
            color="warning" 
            variant="contained"
            disabled={passwordResetLoading}
          >
            {passwordResetLoading ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Sending...
              </>
            ) : (
              'Send Reset Email'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
