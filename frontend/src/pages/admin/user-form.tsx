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
  CircularProgress,
  Skeleton,
} from '@mui/material';
import { Checkbox, FormControlLabel } from '@mui/material';
import { useRouter } from 'next/router';
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
  const router = useRouter();
  const { id: userId } = router.query;
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingDegrees, setLoadingDegrees] = useState(false);
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

  // Fetch departments and degrees on mount
  useEffect(() => {
    fetchDepartments();
    fetchDegrees();
  }, []);

  // Fetch user data when in edit mode
  useEffect(() => {
    const fetchUserData = async (id: string) => {
      try {
        setLoadingUser(true);
        const response = await usersAPI.getUserById(id);
        // API may return { user } or the user object directly
        const userData = response?.user || response?.data?.user || response?.data || response;

        const departmentCode = userData.department_code || userData.departmentByCode?.code || userData.department_id || '';
        const degreeCode = userData.degree_code || userData.degree?.code || userData.degree_id || '';

        setFormData({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          user_type: userData.user_type || 'student',
          status: userData.status || 'pending',
          department_id: departmentCode,
          degree_id: degreeCode,
          student_id: userData.student_id || '',
          employee_id: userData.employee_id || '',
          is_head_of_department: !!userData.is_head_of_department,
        });

        // If user is a student with a department, fetch degrees for that department
        if (userData.user_type === 'student' && departmentCode) {
          await fetchDegreesByDepartment(departmentCode);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        enqueueSnackbar('Failed to load user data', { variant: 'error' });
      } finally {
        setLoadingUser(false);
      }
    };
    
    if (isEditMode && typeof userId === 'string') {
      fetchUserData(userId);
    }
  }, [userId, isEditMode, enqueueSnackbar]);

  // Refetch degrees when department changes (for filtering)
  // But only if not in edit mode or if user manually changes department
  useEffect(() => {
    if (formData.department_id && formData.user_type === 'student' && !loadingUser) {
      // Only refetch if we're not loading user data (to avoid overwriting initial load)
      fetchDegreesByDepartment(formData.department_id);
    }
  }, [formData.department_id, formData.user_type, loadingUser]);

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const response = await departmentsAPI.getDepartments();
      // Departments API returns an array directly or possibly wrapped
      const depts = Array.isArray(response) ? response : (response?.data && Array.isArray(response.data) ? response.data : response);
      setDepartments(depts || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      enqueueSnackbar('Failed to load departments', { variant: 'error' });
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchDegrees = async () => {
    try {
      setLoadingDegrees(true);
      // Only fetch active degrees for user assignment
      const response = await degreesAPI.getDegrees({ status: 'active' });
      // Degrees API may return an array or an object like { all: [], degrees: [] }
      let list: any[] = [];
      if (Array.isArray(response)) list = response;
      else if (Array.isArray(response?.data)) list = response.data;
      else if (Array.isArray(response?.degrees)) list = response.degrees;
      else if (Array.isArray(response?.all)) list = response.all;
      // If none of the above, fallback to empty array
      if (!Array.isArray(list)) list = [];
      setDegrees(list);
    } catch (error) {
      console.error('Error fetching degrees:', error);
      enqueueSnackbar('Failed to load degrees', { variant: 'error' });
      setDegrees([]);
    } finally {
      setLoadingDegrees(false);
    }
  };

  const fetchDegreesByDepartment = async (departmentCode: string) => {
    try {
      setLoadingDegrees(true);
      // Fetch degrees filtered by department
      const response = await degreesAPI.getDegrees({ 
        status: 'active',
        department_code: departmentCode 
      });
      let list: any[] = [];
      if (Array.isArray(response)) list = response;
      else if (Array.isArray(response?.data)) list = response.data;
      else if (Array.isArray(response?.degrees)) list = response.degrees;
      else if (Array.isArray(response?.all)) list = response.all;
      if (!Array.isArray(list)) list = [];
      setDegrees(list);
    } catch (error) {
      console.error('Error fetching degrees by department:', error);
      setDegrees([]);
    } finally {
      setLoadingDegrees(false);
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

      if (isEditMode && typeof userId === 'string') {
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
      
  router.push('/admin');
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
            {loadingUser && (
              <Box display="flex" alignItems="center" gap={2}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Loading user data...
                </Typography>
              </Box>
            )}
            
            {(formData.user_type === 'student' || formData.user_type === 'faculty') && (
              <FormControl fullWidth error={!!errors.department_id} disabled={loadingDepartments}>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department_id}
                  label="Department"
                  onChange={(e) => handleInputChange('department_id', e.target.value)}
                  startAdornment={loadingDepartments && (
                    <CircularProgress size={20} sx={{ ml: 1, mr: 1 }} />
                  )}
                >
                  {loadingDepartments ? (
                    <MenuItem disabled>Loading departments...</MenuItem>
                  ) : departments.length === 0 ? (
                    <MenuItem disabled>No departments available</MenuItem>
                  ) : (
                    departments.map((dept) => (
                      <MenuItem key={dept.code} value={dept.code}>
                        {dept.name}
                      </MenuItem>
                    ))
                  )}
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
                <FormControl 
                  fullWidth 
                  error={!!errors.degree_id}
                  disabled={!formData.department_id || loadingDegrees}
                >
                  <InputLabel>Degree</InputLabel>
                  <Select
                    value={formData.degree_id}
                    label="Degree"
                    onChange={(e) => handleInputChange('degree_id', e.target.value)}
                    startAdornment={loadingDegrees && (
                      <CircularProgress size={20} sx={{ ml: 1, mr: 1 }} />
                    )}
                  >
                    {!formData.department_id ? (
                      <MenuItem disabled>Please select a department first</MenuItem>
                    ) : loadingDegrees ? (
                      <MenuItem disabled>Loading degrees...</MenuItem>
                    ) : (
                      (Array.isArray(degrees) ? degrees.filter(degree => degree.department_code === formData.department_id) : []).length === 0 ? (
                        <MenuItem disabled>No degrees available for this department</MenuItem>
                      ) : (
                        (Array.isArray(degrees) ? degrees.filter(degree => degree.department_code === formData.department_id) : []).map((degree) => (
                          <MenuItem key={degree.code} value={degree.code}>
                            {degree.name}
                          </MenuItem>
                        ))
                      )
                    )}
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
          onClick={() => router.push('/admin')}
          sx={{ mr: 2 }}
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4">
          {isEditMode ? 'Edit User' : 'Create New User'}
        </Typography>
      </Box>

      {loadingUser ? (
        <Card>
          <CardContent>
            <Box display="flex" flexDirection="column" gap={3}>
              <Box display="flex" alignItems="center" justifyContent="center" py={4}>
                <CircularProgress size={40} />
                <Typography variant="h6" sx={{ ml: 2 }}>
                  Loading user data...
                </Typography>
              </Box>
              <Skeleton variant="rectangular" height={60} />
              <Skeleton variant="rectangular" height={60} />
              <Skeleton variant="rectangular" height={60} />
            </Box>
          </CardContent>
        </Card>
      ) : (
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
      )}
    </Box>
  );
};

export default CreateUser;
