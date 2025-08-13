import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import { Checkbox, FormControlLabel } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { ArrowBack, Person, School, Settings } from '@mui/icons-material';
import { authAPI, departmentsAPI, degreesAPI, usersAPI } from '../../services/api';
import LoadingButton from '../../components/common/LoadingButton';

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  user_type: 'student' | 'faculty' | 'office' | 'admin';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  department_id: string;
  degree_id: string;
  student_id: string;
  employee_id: string;
  is_head_of_department?: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const CreateUser: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [degrees, setDegrees] = useState<any[]>([]);
  const isEditMode = !!userId;
  
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    user_type: 'student',
    status: 'pending', // Set new users as pending by default
    department_id: '',
    degree_id: '',
    student_id: '',
    employee_id: '',
    is_head_of_department: false,
  });  const [errors, setErrors] = useState<FormErrors>({});

  const steps = ['Basic Information', 'Academic Details', 'Review & Submit'];

  useEffect(() => {
    fetchDepartments();
    fetchDegrees();
    
    const fetchUserData = async (id: string) => {
      try {
        setLoading(true);
        const response = await usersAPI.getUserById(id);
        // API may return { user } or the user object directly
        const userData = response?.user || response?.data?.user || response?.data || response;
        
        setFormData({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          user_type: userData.user_type || 'student',
          status: userData.status || 'pending',
          department_id: userData.department_id || '',
          degree_id: userData.degree_id || '',
          student_id: userData.student_id || '',
          employee_id: userData.employee_id || '',
          is_head_of_department: !!userData.is_head_of_department,
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        enqueueSnackbar('Failed to load user data', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    if (isEditMode && userId) {
      fetchUserData(userId);
    }
  }, [userId, isEditMode, enqueueSnackbar]); // Added all dependencies

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getDepartments();
  // Departments API returns an array directly or possibly wrapped
  const depts = Array.isArray(response) ? response : (response?.data && Array.isArray(response.data) ? response.data : response);
  setDepartments(depts || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchDegrees = async () => {
    try {
      const response = await degreesAPI.getDegrees();
  // Degrees API may return an array or an object like { all: [], degrees: [] }
  let list: any[] = [];
  if (Array.isArray(response)) list = response;
  else if (Array.isArray(response?.data)) list = response.data;
  else if (Array.isArray(response?.degrees)) list = response.degrees;
  else if (Array.isArray(response?.all)) list = response.all;
  else list = response;
  setDegrees(list || []);
    } catch (error) {
      console.error('Error fetching degrees:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 0:
        if (!formData.first_name) newErrors.first_name = 'First name is required';
        if (!formData.last_name) newErrors.last_name = 'Last name is required';
        if (!formData.email) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Invalid email format';
        }
        if (!formData.user_type) newErrors.user_type = 'User type is required';
        break;
        
      case 1:
        if ((formData.user_type === 'student' || formData.user_type === 'faculty') && !formData.department_id) {
          newErrors.department_id = 'Department is required';
        }
        if (formData.user_type === 'student') {
          if (!formData.student_id) newErrors.student_id = 'Student ID is required';
          if (!formData.degree_id) newErrors.degree_id = 'Degree is required';
        }
        if (formData.user_type === 'faculty' || formData.user_type === 'office') {
          if (!formData.employee_id) newErrors.employee_id = 'Employee ID is required';
        }
        break;
        
      case 2:
        // No password validation needed - passwords are handled separately
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    setLoading(true);
    try {
      const userData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        user_type: formData.user_type,
      };

      // Only include status for updates (admin can change user status)
      if (isEditMode) {
        userData.status = formData.status;
      }

      // Conditionally include fields based on user type to avoid clearing existing values
      if ((formData.user_type === 'student' || formData.user_type === 'faculty') && formData.department_id) {
        userData.department_id = formData.department_id;
      }
      if (formData.user_type === 'student') {
        if (formData.degree_id) userData.degree_id = formData.degree_id;
        if (formData.student_id) userData.student_id = formData.student_id;
      }
      if (formData.user_type === 'faculty' || formData.user_type === 'office' || formData.user_type === 'admin') {
        if (formData.employee_id) userData.employee_id = formData.employee_id;
      }
      if (formData.user_type === 'faculty') {
        userData.is_head_of_department = !!formData.is_head_of_department;
      }

      if (isEditMode && userId) {
        await usersAPI.updateUser(userId, userData);
        enqueueSnackbar('User updated successfully!', { variant: 'success' });
      } else {
        // For new users, send an account activation link
        // Generate a temporary password that will be overwritten by activation
        const tempUserData = {
          ...userData,
          password: 'TempPassword123!', // This will be overwritten by activation process
        };
        await authAPI.register(tempUserData);
        enqueueSnackbar('User created successfully! An account activation link has been sent to their email.', { variant: 'success' });
      }
      
      navigate('/admin');
    } catch (error: any) {
      enqueueSnackbar(
        error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} user`,
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box display="flex" flexDirection="column" gap={3}>
            <Box display="flex" gap={2} flexDirection={{ xs: 'column', md: 'row' }}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                error={!!errors.first_name}
                helperText={errors.first_name}
                required
              />
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                error={!!errors.last_name}
                helperText={errors.last_name}
                required
              />
            </Box>
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              required
            />
            
            <FormControl fullWidth error={!!errors.user_type} required>
              <InputLabel>User Type</InputLabel>
              <Select
                value={formData.user_type}
                label="User Type"
                onChange={(e) => handleInputChange('user_type', e.target.value)}
              >
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="faculty">Faculty</MenuItem>
                <MenuItem value="office">Office Staff</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
              {errors.user_type && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                  {errors.user_type}
                </Typography>
              )}
            </FormControl>

            {isEditMode && (
              <FormControl fullWidth error={!!errors.status} required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
                {errors.status && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                    {errors.status}
                  </Typography>
                )}
              </FormControl>
            )}
          </Box>
        );
      
      case 1:
        return (
          <Box display="flex" flexDirection="column" gap={3}>
            {(formData.user_type === 'student' || formData.user_type === 'faculty') && (
              <FormControl fullWidth error={!!errors.department_id}>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department_id}
                  label="Department"
                  onChange={(e) => handleInputChange('department_id', e.target.value)}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.department_id && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                    {errors.department_id}
                  </Typography>
                )}
              </FormControl>
            )}
            
            {formData.user_type === 'student' && (
              <>
                <FormControl fullWidth error={!!errors.degree_id}>
                  <InputLabel>Degree</InputLabel>
                  <Select
                    value={formData.degree_id}
                    label="Degree"
                    onChange={(e) => handleInputChange('degree_id', e.target.value)}
                  >
                    {degrees.map((degree) => (
                      <MenuItem key={degree.id} value={degree.id}>
                        {degree.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.degree_id && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                      {errors.degree_id}
                    </Typography>
                  )}
                </FormControl>
                
                <TextField
                  fullWidth
                  label="Student ID"
                  value={formData.student_id}
                  onChange={(e) => handleInputChange('student_id', e.target.value)}
                  error={!!errors.student_id}
                  helperText={errors.student_id}
                  required
                />
              </>
            )}

            {(formData.user_type === 'faculty' || formData.user_type === 'office' || formData.user_type === 'admin') && (
              <TextField
                fullWidth
                label="Employee ID"
                value={formData.employee_id}
                onChange={(e) => handleInputChange('employee_id', e.target.value)}
                error={!!errors.employee_id}
                helperText={errors.employee_id}
                required={formData.user_type === 'faculty' || formData.user_type === 'office'}
              />
            )}
            
            {(formData.user_type === 'office' || formData.user_type === 'admin') && (
              <Alert severity="info">
                No additional academic information required for this user type.
              </Alert>
            )}

            {formData.user_type === 'faculty' && (
              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!formData.is_head_of_department}
                      onChange={(e) => handleInputChange('is_head_of_department', e.target.checked)}
                    />
                  }
                  label="Head of Department (HOD)"
                />
              </Box>
            )}
          </Box>
        );
      
      case 2:
        return (
          <Box display="flex" flexDirection="column" gap={3}>
            {!isEditMode && (
              <Alert severity="info">
                User account will be created and an activation link will be sent to their email address. 
                The user will need to activate their account and set up their password before they can log in.
              </Alert>
            )}
            
            <Alert severity="success">
              All account information has been collected successfully. 
              {isEditMode ? 'Ready to update user.' : 'Ready to create user account.'}
            </Alert>
          </Box>
        );
        
      default:
        return null;
    }
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 0: return <Person />;
      case 1: return <School />;
      case 2: return <Settings />;
      default: return null;
    }
  };

  return (
    <Box maxWidth="800px" mx="auto">
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin')}
          sx={{ mr: 2 }}
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4">
          {isEditMode ? 'Edit User' : 'Create New User'}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Box mb={4}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel 
                    icon={getStepIcon(index)}
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontSize: '0.875rem',
                        fontWeight: activeStep === index ? 600 : 400,
                      }
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          <Divider sx={{ mb: 4 }} />

          <Box mb={4}>
            {renderStepContent(activeStep)}
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box display="flex" justifyContent="space-between">
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            
            <LoadingButton
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              variant="contained"
              loading={loading}
              loadingText={isEditMode ? 'Updating...' : 'Creating...'}
            >
              {activeStep === steps.length - 1 
                ? (isEditMode ? 'Update User' : 'Create User') 
                : 'Next'
              }
            </LoadingButton>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateUser;
