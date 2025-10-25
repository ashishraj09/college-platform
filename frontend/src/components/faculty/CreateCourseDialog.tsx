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
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  SelectChangeEvent,
  Tabs,
  Tab
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, MenuBook as CourseIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { coursesAPI, degreesAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(() => import('../common/RichTextEditor'), { ssr: false });

export interface CreateCourseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newCourseId?: string) => void;
  mode: 'create' | 'edit';
  course?: Partial<CourseForm> & { id?: string; status?: string; entityType?: string };
}

interface CourseForm {
  name: string;
  code: string;
  description: string;
  credits: number;
  semester: number;
  department_code: string;
  degree_code: string;
  is_elective: boolean;
  max_students: number;
  prerequisites: string;
  faculty_details: string;
  learning_objectives: string;
  course_outcomes: string;
  assessment_methods: string;
  textbooks: string;
  references: string;
  primary_instructor: string;
}

const fieldValidationConfig: { [key: string]: { required?: boolean; minLength?: number; maxLength?: number; pattern?: RegExp; min?: number; max?: number; message?: string } } = {
  name: { required: true, minLength: 3, maxLength: 100, message: 'Course name is required' },
  code: { required: true, minLength: 3, maxLength: 10, pattern: /^[A-Z0-9]+$/, message: 'Course code is required' },
  description: { required: true, minLength: 5, message: 'Course description is required' },
  credits: { required: true, min: 1, max: 10, message: 'Credits must be between 1 and 10' },
  semester: { required: true, min: 1, max: 10, message: 'Semester must be between 1 and 10' },
  max_students: { required: true, min: 1, max: 500, message: 'Max students must be between 1 and 500' },
  degree_code: { required: true, message: 'Degree selection is required' },
  prerequisites: { required: true, minLength: 3, message: 'Prerequisites are required' },
  learning_objectives: { required: true, minLength: 3, message: 'Learning objective is required' },
  course_outcomes: { required: true, minLength: 3, message: 'Course outcome is required' },
  assessment_methods: { required: true, minLength: 3, message: 'Assessment method is required' },
  textbooks: { required: true, minLength: 3, message: 'Textbook is required' },
  references: { required: true, minLength: 3, message: 'Reference is required' },
  faculty_details: { required: true, minLength: 3, message: 'Faculty details are required' },
  primary_instructor: { required: true, message: 'Primary instructor is required' },
};

const CreateCourseDialog: React.FC<CreateCourseDialogProps> = ({
  open,
  onClose,
  onSuccess,
  mode,
  course,
}) => {
  // Auth context
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // Default form structure
  const defaultForm: CourseForm = {
    name: '',
    code: '',
    description: '',
    credits: 3,
    semester: 1,
    department_code: '',
    degree_code: '',
    is_elective: false,
    max_students: 50,
    prerequisites: '',
    learning_objectives: '',
    course_outcomes: '',
    assessment_methods: '',
    textbooks: '',
    references: '',
    primary_instructor: '',
    faculty_details: '',
  };

  // State management
  const [form, setForm] = useState<CourseForm>({ ...defaultForm });
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [owner, setOwner] = useState<any>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [degrees, setDegrees] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loadingDegrees, setLoadingDegrees] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Load degrees and faculty when dialog opens
  useEffect(() => {
    if (open && user?.department?.code) {
      setInitialLoading(true);
      
      // Fetch degrees
      const fetchDegrees = async () => {
        try {
          setLoadingDegrees(true);
          const response = await degreesAPI.getActiveDegrees(user.department.code);
          // Filter degrees to only those matching department code
          const filteredDegrees = (response.degrees || []).filter((degree: any) => degree.department_code === user.department.code);
          setDegrees(filteredDegrees);
        } catch (err) {
          console.error("Error fetching degrees:", err);
          setError("Failed to load degrees");
        } finally {
          setLoadingDegrees(false);
        }
      };

      // Fetch faculty members
      const fetchFaculty = async () => {
        try {
          // Use department code for API call
          const response = await usersAPI.getUsersByDepartment(user.department.code, { user_type: 'faculty' });
          setFaculty(response.users || []);
        } catch (err) {
          console.error("Error fetching faculty:", err);
        }
      };

      Promise.all([fetchDegrees(), fetchFaculty()]).finally(() => {
        setInitialLoading(false);
      });
    }
  }, [open, user]);

  // Initialize form when dialog opens or mode changes
  useEffect(() => {
    if (open) {
      setOwner(null);
      setActiveTab(0);
      
      if (mode === 'edit' && course && course.id) {
        setCourseId(course.id);
        const fetchCourseForEdit = async () => {
          try {
            setInitialLoading(true);
            const response = await coursesAPI.getCourseForEdit(course.id as string);
            const courseData = response.course;
            setOwner(courseData.creator);
            setForm({
              ...defaultForm,
              ...courseData,
              degree_code: courseData.degree?.code ?? courseData.degree_code ?? '',
              department_code: courseData.department?.code ?? courseData.department_code ?? '',
              primary_instructor: courseData.primary_instructor ?? '',
            });
          } catch (err) {
            setError('Failed to load course for editing');
          } finally {
            setInitialLoading(false);
          }
        };
        fetchCourseForEdit();
      } else {
        setForm({
          ...defaultForm,
          department_code: user?.department?.code || '',
        });
        setCourseId(null);
      }
      setError('');
      setFieldErrors({});
    }
  }, [open, mode, course, user]);

  // Config-driven validation function
  const validateField = (field: string, value: any): string | undefined => {
    const config = fieldValidationConfig[field];
    if (!config) return undefined;
    if (config.required && (value === undefined || value === null || (typeof value === 'string' ? value.trim().length === 0 : false))) {
      return config.message || 'This field is required';
    }
    if (config.minLength && typeof value === 'string' && value.trim().length < config.minLength) {
      return config.message || `Minimum ${config.minLength} characters required`;
    }
    if (config.maxLength && typeof value === 'string' && value.trim().length > config.maxLength) {
      return config.message || `Maximum ${config.maxLength} characters allowed`;
    }
    if (config.pattern && typeof value === 'string' && value && !config.pattern.test(value.trim())) {
      return 'Only uppercase letters and numbers allowed';
    }
    if (config.min !== undefined && typeof value === 'number' && value < config.min) {
      return config.message;
    }
    if (config.max !== undefined && typeof value === 'number' && value > config.max) {
      return config.message;
    }
    return undefined;
  };

  const updateFieldError = (field: string, value: any) => {
    setFieldErrors(prev => ({ ...prev, [field]: validateField(field, value) || '' }));
  };

  // Event handlers
  const handleInputChange = (field: keyof CourseForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    // Accept both standard and RichTextEditor event shapes
    const value = event.target.value ?? '';
    setForm((prev: CourseForm) => ({ ...prev, [field]: value }));
    updateFieldError(field, value);
    setError('');
  };

  const handleSelectChange = (field: keyof CourseForm) => (
    event: SelectChangeEvent
  ) => {
    const value = event.target.value ?? '';
    setForm({
      ...form,
      [field]: value,
    });
    // Real-time validation
    updateFieldError(field, value);
    setError('');
  };

  // Config-driven form validation
  const validateForm = (): boolean => {
    let hasError = false;
    const newErrors: { [key: string]: string } = {};
    Object.keys(fieldValidationConfig).forEach(field => {
      const error = validateField(field, (form as any)[field]);
      if (error) {
        newErrors[field] = error;
        hasError = true;
      }
    });
    setFieldErrors(newErrors);
    return !hasError;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Please correct the errors before submitting');
      // Tab switching logic: find which tab has the first error
      const tab0Fields = ['name', 'code', 'description', 'credits', 'semester', 'degree_code', 'max_students', 'primary_instructor'];
      const tab1Fields = ['prerequisites', 'learning_objectives', 'course_outcomes', 'assessment_methods', 'textbooks', 'references', 'faculty_details'];
      if (tab0Fields.some(f => fieldErrors[f])) {
        setActiveTab(0);
      } else if (tab1Fields.some(f => fieldErrors[f])) {
        setActiveTab(1);
      }
      return;
    }

    setLoading(true);
    setError('');

    // Find selected degree and department objects
    const selectedDegree = degrees.find(d => d.id === form.degree_code || d.code === form.degree_code);
    const selectedDepartment = user?.department || null;

      // Filter out empty values and set correct UUIDs
      const cleanedForm = { ...form };

      if ('department_id' in cleanedForm) {
        delete cleanedForm.department_id;
      }
      if ('degree_id' in cleanedForm) {
        delete cleanedForm.degree_id;
      }

      if (mode === 'edit' && course?.id) {
        // Check if course is approved or active
        if (course.status === 'approved' || course.status === 'active') {
          // Create a new version instead of updating directly
          const response = await coursesAPI.createCourseVersion(course.id);
          if (response.error) {
            enqueueSnackbar(response.error, { variant: 'error' });
            setLoading(false);
            return;
          }
          const data = response;
          enqueueSnackbar(`New version created. You will be redirected to edit the draft.`, { variant: 'success' });
          // Return the new course ID for potential redirection
          onSuccess(data.course?.id);
        } else {
          // Update draft or pending courses directly
          if (user?.department?.code && cleanedForm.degree_code) {
            // Find the selected degree object
            const selectedDegree = degrees.find(d => d.id === cleanedForm.degree_code || d.code === cleanedForm.degree_code);
            // Send department_code and degree_code (short code) in the payload
            const updateResult = await coursesAPI.updateCourse(course.id, {
              ...cleanedForm,
              department_code: user.department.code,
              degree_code: selectedDegree?.code || cleanedForm.degree_code,
            });
            if (updateResult.error) {
              enqueueSnackbar(updateResult.error, { variant: 'error' });
              setLoading(false);
              return;
            }
            enqueueSnackbar('Course updated successfully!', { variant: 'success' });
            onSuccess();
          } else {
            enqueueSnackbar('Department code or Degree code is missing', { variant: 'error' });
            setLoading(false);
            return;
          }
        }
      } else {
        if (user?.id && user?.department?.id) {
          const createResult = await coursesAPI.createCourse(cleanedForm, user.id, user.department.id);
          if (createResult.error) {
            enqueueSnackbar(createResult.error, { variant: 'error' });
            setLoading(false);
            return;
          }
          enqueueSnackbar('Course created successfully!', { variant: 'success' });
          onSuccess();
        } else {
          enqueueSnackbar('User ID or Department ID is missing', { variant: 'error' });
          setLoading(false);
          return;
        }
      }
      
      handleClose();
      setLoading(false);
  };

  const handleClose = () => {
    setForm({...defaultForm});
    setError('');
    setFieldErrors({});
    setOwner(null);
    setActiveTab(0);
    onClose();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <CourseIcon color="primary" />
        {mode === 'edit' ? 'Edit Course' : 'Create New Course'}
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', p: 0 }}>
        {initialLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
            <CircularProgress size={60} />
            <Typography variant="body1" color="text.secondary">
              {mode === 'edit' ? 'Loading course...' : 'Loading form...'}
            </Typography>
          </Box>
        ) : (
          <>
            {!user?.department && (
              <Alert severity="error" sx={{ m: 2 }}>
                You must be assigned to a department to create courses. Please contact your administrator.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ m: 2 }}>
                {error}
                {Object.values(fieldErrors).filter(Boolean).length > 0 && (
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    {Object.entries(fieldErrors)
                      .filter(([_, msg]) => !!msg)
                      .map(([field, msg]) => (
                        <li key={field}>{msg}</li>
                      ))}
                  </ul>
                )}
              </Alert>
            )}

            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab label="Basic Information" />
              <Tab label="Study Details" />
            </Tabs>

            <Box sx={{ p: 3, height: 'calc(100% - 48px)', overflowY: 'auto' }}>
              {/* Tab 0: Basic Information */}
              {activeTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    required
                    fullWidth
                    label="Course Name"
                    value={form.name ?? ''}
                    onChange={handleInputChange('name')}
                    error={!!fieldErrors.name}
                    helperText={fieldErrors.name || "Enter the full name of the course"}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    required
                    fullWidth
                    label="Course Code"
                    value={form.code ?? ''}
                    onChange={handleInputChange('code')}
                    error={!!fieldErrors.code}
                    helperText={fieldErrors.code || "e.g., CS101 (uppercase letters and numbers only)"}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    slotProps={{ 
                      htmlInput: { style: { textTransform: 'uppercase' } }
                    }}
                  />
                <TextField
                  fullWidth
                  label="Department"
                  value={user?.department ? `${user.department.name} (${user.department.code})` : 'Loading...'}
                  disabled
                  helperText="Courses are automatically assigned to your department"
                  variant="filled"
                />

                {mode === 'edit' && owner && (
                  <TextField
                    fullWidth
                    label="Course Owner"
                    value={`${owner.first_name ?? ''} ${owner.last_name ?? ''}`}
                    disabled
                    helperText={`Created by ${owner.email ?? ''}`}
                    variant="filled"
                  />
                )}

                <FormControl fullWidth required error={!!fieldErrors.degree_code} sx={{ minWidth: 240 }}>
                  <InputLabel>Degree</InputLabel>
                  <Select
                    value={form.degree_code ?? ''}
                    label="Degree"
                    onChange={handleSelectChange('degree_code')}
                    disabled={!form.department_code || loadingDegrees}
                      >
                    {loadingDegrees ? (
                      <MenuItem disabled>Loading degrees...</MenuItem>
                    ) : degrees.length === 0 ? (
                      <MenuItem disabled>No degrees available</MenuItem>
                    ) : (
                      degrees.map((degree) => (
                          <MenuItem key={degree.code} value={degree.code}>
                          {degree.name} ({degree.code})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {fieldErrors.degree_code && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {fieldErrors.degree_code}
                    </Typography>
                  )}
                </FormControl>
                <FormControl fullWidth required sx={{ minWidth: 240 }}>
                  <InputLabel>Primary Instructor</InputLabel>
                  <Select
                    value={form.primary_instructor}
                    label="Primary Instructor"
                    onChange={(e) => {
                      setForm({
                        ...form,
                        primary_instructor: e.target.value,
                      });
                      updateFieldError('primary_instructor', e.target.value);
                    }}
                    error={!!fieldErrors.primary_instructor}
                  >
                    {faculty.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.primary_instructor && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {fieldErrors.primary_instructor}
                    </Typography>
                  )}
                </FormControl>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                <TextField
                  required
                  fullWidth
                  label="Credits"
                  type="number"
                  value={form.credits}
                  onChange={handleInputChange('credits')}
                  error={!!fieldErrors.credits}
                  helperText={fieldErrors.credits || "1-10 credit hours"}
                  slotProps={{ 
                    inputLabel: { shrink: true },
                    htmlInput: { min: 1, max: 10 }
                  }}
                />

                <TextField
                  required
                  fullWidth
                  label="Semester"
                  type="number"
                  value={form.semester}
                  onChange={handleInputChange('semester')}
                  error={!!fieldErrors.semester}
                  helperText={fieldErrors.semester || "Which semester (0-10)"}
                  slotProps={{ 
                    inputLabel: { shrink: true }
                  }}
                />

                <TextField
                  fullWidth
                  label="Max Students"
                  type="number"
                  value={form.max_students === 0 ? '' : String(form.max_students)}
                  onChange={e => {
                    const val = e.target.value;
                    setForm(f => ({
                      ...f,
                      max_students: val === '' ? 0 : Math.max(0, Math.min(500, Number(val)))
                    }));
                    // Only validate if not empty
                    if (val !== '') updateFieldError('max_students', Number(val));
                  }}
                  error={!!fieldErrors.max_students}
                  helperText={fieldErrors.max_students || "Maximum enrollment (1-500)"}
                  slotProps={{ 
                    inputLabel: { shrink: true },
                    htmlInput: { min: 1, max: 500 }
                  }}
                />
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.is_elective}
                      onChange={(e) => setForm({ ...form, is_elective: e.target.checked })}
                    />
                  }
                  label="Elective Course"
                />
              </Box>

              <RichTextEditor
                label="Course Overview"
                value={form.description}
                onChange={handleInputChange('description')}
                width={"100%"}
                height={120}
                error={fieldErrors.description}
              />

              <Box>
                <RichTextEditor
                  label="Prerequisites"
                  value={form.prerequisites}
                  onChange={handleInputChange('prerequisites')}
                  width={"100%"}
                  height={120}
                  error={fieldErrors.prerequisites}
                />
              </Box>
                </Box>
              )}

              {/* Tab 1: Study Details */}
              {activeTab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                  <RichTextEditor
                      label="Learning Objectives"
                      value={form.learning_objectives}
                      onChange={handleInputChange('learning_objectives')}
                      width={"100%"}
                      height={120}
                      error={fieldErrors.learning_objectives}
                    />

                    <RichTextEditor
                      label="Course Outcomes"
                      value={form.course_outcomes}
                      onChange={handleInputChange('course_outcomes')}
                      width={"100%"}
                      height={120}
                      error={fieldErrors.course_outcomes}
                    />

                    <RichTextEditor
                      label="Assessment Methods"
                      value={form.assessment_methods}
                      onChange={handleInputChange('assessment_methods')}
                      width={"100%"}
                      height={120}
                      error={fieldErrors.assessment_methods}
                    />

                    <RichTextEditor
                      label="References"
                      value={form.references}
                      onChange={handleInputChange('references')}
                      width={"100%"}
                      height={120}
                      error={fieldErrors.references}
                    />

                    <RichTextEditor
                      label="Faculty Details"
                      value={form.faculty_details}
                      onChange={handleInputChange('faculty_details')}
                      width={"100%"}
                      height={120}
                      error={fieldErrors.faculty_details}
                    />

                    <RichTextEditor
                      label="Textbooks"
                      value={form.textbooks}
                      onChange={handleInputChange('textbooks')}
                      width={"100%"}
                      height={120}
                      error={fieldErrors.textbooks}
                    />
                </Box>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !user?.department}>
          {loading ? <CircularProgress size={24} /> : (mode === 'edit' ? 'Update Course' : 'Create Course')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateCourseDialog;