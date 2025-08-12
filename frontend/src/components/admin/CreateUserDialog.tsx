import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { authAPI, departmentsAPI, degreesAPI } from '../../services/api';

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateUserDialog: React.FC<CreateUserDialogProps> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    user_type: '' as 'student' | 'faculty' | 'office' | 'admin' | '',
    student_id: '',
    employee_id: '',
    department_id: '',
    degree_id: '',
    enrolled_year: new Date().getFullYear(),
    is_head_of_department: false,
  });

  const [departments, setDepartments] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchDepartments();
      fetchDegrees();
    }
  }, [open]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getDepartments();
      setDepartments(response || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    }
  };

  const fetchDegrees = async () => {
    try {
      const response = await degreesAPI.getDegrees();
      setDegrees(response || []);
    } catch (error) {
      console.error('Failed to fetch degrees:', error);
      setDegrees([]);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password,
        user_type: formData.user_type as 'student' | 'faculty' | 'office' | 'admin',
        enrolled_year: formData.user_type === 'student' ? formData.enrolled_year : undefined,
        student_id: formData.user_type === 'student' ? formData.student_id : undefined,
        employee_id: ['faculty', 'office', 'admin'].includes(formData.user_type) ? formData.employee_id : undefined,
        department_id: ['student', 'faculty'].includes(formData.user_type) ? formData.department_id : undefined,
        degree_id: formData.user_type === 'student' ? formData.degree_id : undefined,
        is_head_of_department: formData.user_type === 'faculty' ? formData.is_head_of_department : false,
      };

      await authAPI.register(userData);
      onSuccess();
      onClose();
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        user_type: '',
        student_id: '',
        employee_id: '',
        department_id: '',
        degree_id: '',
        enrolled_year: new Date().getFullYear(),
        is_head_of_department: false,
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const renderUserTypeSpecificFields = () => {
    if (!formData.user_type) return null;

    return (
      <Box sx={{ mt: 2 }}>
        {formData.user_type === 'student' && (
          <>
            <TextField
              fullWidth
              label="Student ID"
              value={formData.student_id}
              onChange={(e) => handleChange('student_id', e.target.value)}
              margin="normal"
              required
            />
            
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Degree</InputLabel>
              <Select
                value={formData.degree_id}
                onChange={(e) => handleChange('degree_id', e.target.value)}
                label="Degree"
              >
                {degrees?.map((degree: any) => (
                  <MenuItem key={degree.id} value={degree.id}>
                    {degree.name} ({degree.level})
                  </MenuItem>
                )) || []}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Enrolled Year"
              type="number"
              value={formData.enrolled_year}
              onChange={(e) => handleChange('enrolled_year', parseInt(e.target.value))}
              margin="normal"
              required
            />
          </>
        )}

        {['faculty', 'office', 'admin'].includes(formData.user_type) && (
          <TextField
            fullWidth
            label="Employee ID"
            value={formData.employee_id}
            onChange={(e) => handleChange('employee_id', e.target.value)}
            margin="normal"
            required
          />
        )}

        {['student', 'faculty'].includes(formData.user_type) && (
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Department</InputLabel>
            <Select
              value={formData.department_id}
              onChange={(e) => handleChange('department_id', e.target.value)}
              label="Department"
            >
              {departments?.map((dept: any) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              )) || []}
            </Select>
          </FormControl>
        )}

        {formData.user_type === 'faculty' && (
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_head_of_department}
                onChange={(e) => handleChange('is_head_of_department', e.target.checked)}
              />
            }
            label="Head of Department"
          />
        )}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New User</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <TextField
              label="First Name"
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              required
            />

            <TextField
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              required
            />
          </Box>

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            margin="normal"
            required
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>User Type</InputLabel>
            <Select
              value={formData.user_type}
              onChange={(e) => handleChange('user_type', e.target.value)}
              label="User Type"
            >
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="faculty">Faculty</MenuItem>
              <MenuItem value="office">Office</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>

          {renderUserTypeSpecificFields()}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateUserDialog;
