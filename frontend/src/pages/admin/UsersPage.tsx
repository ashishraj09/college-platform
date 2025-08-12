import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { usersAPI } from '../../services/api';
import CreateUserDialog from '../../components/admin/CreateUserDialog';
import { useSnackbar } from 'notistack';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: 'student' | 'faculty' | 'office' | 'admin';
  student_id?: string;
  employee_id?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    user_type: 'student' as 'student' | 'faculty' | 'office' | 'admin',
    status: 'active' as 'active' | 'inactive' | 'pending' | 'suspended',
  });
  const { enqueueSnackbar } = useSnackbar();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getUsers();
      setUsers(response || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      enqueueSnackbar('Failed to fetch users', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    fetchUsers();
    enqueueSnackbar('User created successfully!', { variant: 'success' });
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      user_type: user.user_type,
      status: user.status,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;

    try {
      await usersAPI.updateUser(selectedUser.id, editFormData);
      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
      enqueueSnackbar('User updated successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Error updating user:', error);
      enqueueSnackbar('Failed to update user', { variant: 'error' });
    }
  };

  const handleDeleteClick = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.deleteUser(userId);
        fetchUsers();
        enqueueSnackbar('User deleted successfully!', { variant: 'success' });
      } catch (error) {
        console.error('Error deleting user:', error);
        enqueueSnackbar('Failed to delete user', { variant: 'error' });
      }
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'admin': return 'error';
      case 'faculty': return 'primary';
      case 'office': return 'secondary';
      case 'student': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'pending': return 'warning';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Users
        </Typography>
        <Box>
          <IconButton onClick={fetchUsers} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ ml: 1 }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.first_name} {user.last_name}</TableCell>
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
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(user)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(user.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="First Name"
            value={editFormData.first_name}
            onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Last Name"
            value={editFormData.last_name}
            onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            value={editFormData.email}
            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            margin="normal"
            required
            type="email"
          />
          <TextField
            fullWidth
            select
            label="User Type"
            value={editFormData.user_type}
            onChange={(e) => setEditFormData({ ...editFormData, user_type: e.target.value as any })}
            margin="normal"
            required
          >
            <MenuItem value="student">Student</MenuItem>
            <MenuItem value="faculty">Faculty</MenuItem>
            <MenuItem value="office">Office</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
          <TextField
            fullWidth
            select
            label="Status"
            value={editFormData.status}
            onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
            margin="normal"
            required
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="suspended">Suspended</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained">
            Update User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
