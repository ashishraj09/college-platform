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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { departmentsAPI } from '../../services/api';
import CreateDepartmentDialog from '../../components/admin/CreateDepartmentDialog';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await departmentsAPI.getDepartments();
      setDepartments(response);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    fetchDepartments();
  };

  const handleEditClick = (department: Department) => {
    setSelectedDepartment(department);
    setEditFormData({
      name: department.name,
      code: department.code,
      description: department.description,
      status: department.status,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedDepartment) return;

    try {
      await departmentsAPI.updateDepartment(selectedDepartment.id, editFormData);
      setEditDialogOpen(false);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (error) {
      console.error('Error updating department:', error);
    }
  };

  const handleDeleteClick = async (departmentId: string) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await departmentsAPI.deleteDepartment(departmentId);
        fetchDepartments();
      } catch (error) {
        console.error('Error deleting department:', error);
      }
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Departments
        </Typography>
        <Box>
          <IconButton onClick={fetchDepartments} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ ml: 1 }}
          >
            Add Department
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
                  <TableCell>Code</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No departments found
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell>{department.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={department.code}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{department.description || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={department.status}
                          color={department.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(department.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleEditClick(department)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(department.id)}
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
      <CreateDepartmentDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Department</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Department Name"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Department Code"
            value={editFormData.code}
            onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
            margin="normal"
            required
            helperText="Short code for the department"
          />
          <TextField
            fullWidth
            label="Description"
            value={editFormData.description}
            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained">
            Update Department
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DepartmentsPage;
