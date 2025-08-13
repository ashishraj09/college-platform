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
  TablePagination,
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
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../../services/api';
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
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  });
  const { enqueueSnackbar } = useSnackbar();

  const fetchUsers = async (page: number = 1, limit: number = 20) => {
    setLoading(true);
    try {
      const response = await usersAPI.getUsers({ page, limit });
      // Handle the API response structure: { users, pagination }
      if (response && response.users) {
        setUsers(Array.isArray(response.users) ? response.users : []);
        setPagination(response.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
      } else {
        // Fallback for different response structures
        const usersList = Array.isArray(response) ? response : [];
        setUsers(usersList);
        setPagination({ total: usersList.length, page: 1, limit: 20, pages: 1 });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      enqueueSnackbar('Failed to fetch users', { variant: 'error' });
      setUsers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRefresh = () => {
    fetchUsers(pagination.page, pagination.limit);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    fetchUsers(newPage + 1, pagination.limit);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    fetchUsers(1, newLimit);
  };

  const handleCreateSuccess = () => {
    fetchUsers(pagination.page, pagination.limit);
    enqueueSnackbar('User created successfully!', { variant: 'success' });
  };

  const handleEditClick = (user: User) => {
    navigate(`/admin/edit-user/${user.id}`);
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
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/create-user')}
            sx={{ ml: 1 }}
          >
            Create User
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
          
          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page - 1}
            onPageChange={handleChangePage}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </CardContent>
      </Card>

    </Box>
  );
};

export default UsersPage;
