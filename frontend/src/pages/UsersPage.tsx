import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../services/api';

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
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<UsersPagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async (page: number = 1, limit: number = 20) => {
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
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleChangePage = (event: unknown, newPage: number) => {
    fetchUsers(newPage + 1, pagination.limit);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    fetchUsers(1, newLimit);
  };

  const handleEditUser = (user: User) => {
    // Navigate to edit page with user ID
    navigate(`/admin/edit-user/${user.id}`);
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
            onClick={() => navigate('/admin/create-user')}
          >
            Create User
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
