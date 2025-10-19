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

const CreateCourseDialog: React.FC<CreateCourseDialogProps> = ({ 
  open, 
  onClose, 
  onSuccess, 
  mode, 
  course 
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
  const [form, setForm] = useState<CourseForm>({...defaultForm});
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
  const [fieldErrors, setFieldErrors] = useState<{
  name?: string;
  code?: string;
  description?: string;
  credits?: string;
  semester?: string;
  max_students?: string;
  degree_code?: string;
  prerequisites?: string;
  learning_objectives?: string;
  course_outcomes?: string;
  assessment_methods?: string;
  textbooks?: string;
  references?: string;
  primary_instructor?: string;
  faculty_details?: string;
}>({});

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

  // Validation functions
  const validateField = (fieldName: string, value: any): string | undefined => {
  switch (fieldName) {
    case 'name':
      if (!value?.trim()) return 'Course name is required';
      if (value.trim().length < 3) return 'Course name must be at least 3 characters';
      if (value.trim().length > 100) return 'Course name cannot exceed 100 characters';
      break;
    case 'code':
      if (!value?.trim()) return 'Course code is required';
      if (value.trim().length < 3) return 'Course code must be at least 3 characters';
      if (value.trim().length > 10) return 'Course code cannot exceed 10 characters';
      if (!/^[A-Z0-9]+$/.test(value.trim())) return 'Only uppercase letters and numbers allowed';
      break;
    case 'description':
      if (!value?.trim()) return 'Course description is required';
      break;
    case 'prerequisites':
      if (!value?.trim()) return 'Prerequisites are required';
      break;
    case 'learning_objectives':
      if (!value?.trim()) return 'Learning objective is required';
      break;
    case 'course_outcomes':
      if (!value?.trim()) return 'Course outcome is required';
      break;
    case 'assessment_methods':
      if (!value?.trim()) return 'Assessment method is required';
      break;
    case 'textbooks':
      if (!value?.trim()) return 'Textbook is required';
      break;
    case 'references':
      if (!value?.trim()) return 'Reference is required';
      break;
    case 'faculty_details':
      if (!value?.trim()) return 'Faculty details are required';
      break;
    case 'credits':
      if (value < 1 || value > 10) return 'Credits must be between 1 and 10';
      break;
    case 'semester':
      if (value < 1 || value > 10) return 'Semester must be between 1 and 10';
      break;
    case 'max_students':
      if (value < 1 || value > 500) return 'Max students must be between 1 and 500';
      break;
    case 'degree_code':
      if (!value) return 'Degree selection is required';
      break;
    case 'primary_instructor':
      if (!value || !value.trim()) return 'Primary instructor is required';
      break;
  }
  return undefined;
};

  const updateFieldError = (fieldName: string, value: any) => {
    const error = validateField(fieldName, value);
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
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

  const validateForm = (): boolean => {
    // Create a new errors object
    const newFieldErrors: typeof fieldErrors = {};
    let hasError = false;

    // Check required fields
    if (!form.name.trim()) {
      newFieldErrors.name = 'Course name is required';
      hasError = true;
    } else if (form.name.trim().length < 3) {
      newFieldErrors.name = 'Course name must be at least 3 characters';
      hasError = true;
    } else if (form.name.trim().length > 100) {
      newFieldErrors.name = 'Course name cannot exceed 100 characters';
      hasError = true;
    }

    if (!form.code.trim()) {
      newFieldErrors.code = 'Course code is required';
      hasError = true;
    } else if (form.code.trim().length < 3) {
      newFieldErrors.code = 'Course code must be at least 3 characters';
      hasError = true;
    } else if (form.code.trim().length > 10) {
      newFieldErrors.code = 'Course code cannot exceed 10 characters';
      hasError = true;
    } else if (!/^[A-Z0-9]+$/.test(form.code.trim())) {
      newFieldErrors.code = 'Only uppercase letters and numbers allowed';
      hasError = true;
    }

    if (!form.description.trim()) {
      newFieldErrors.description = 'Course description is required';
      hasError = true;
    }

    if (!form.degree_code) {
      newFieldErrors.degree_code = 'Degree selection is required';
      hasError = true;
    }

    if (form.credits < 1 || form.credits > 10) {
      newFieldErrors.credits = 'Credits must be between 1 and 10';
      hasError = true;
    }

    if (form.semester < 1 || form.semester > 10) {
      newFieldErrors.semester = 'Semester must be between 1 and 10';
      hasError = true;
    }

    if (form.max_students < 1 || form.max_students > 500) {
      newFieldErrors.max_students = 'Maximum students must be between 1 and 500';
      hasError = true;
    }

    // Check study details (now flat fields)
    if (!(form.learning_objectives ?? '').trim()) {
      newFieldErrors.learning_objectives = 'Learning objective is required';
      hasError = true;
    }
    if (!(form.course_outcomes ?? '').trim()) {
      newFieldErrors.course_outcomes = 'Course outcome is required';
      hasError = true;
    }
    if (!(form.assessment_methods ?? '').trim()) {
      newFieldErrors.assessment_methods = 'Assessment method is required';
      hasError = true;
    }
    if (!(form.textbooks ?? '').trim()) {
      newFieldErrors.textbooks = 'Textbook is required';
      hasError = true;
    }

    if (!(form.references ?? '').trim()) {
      newFieldErrors.references = 'Reference is required';
      hasError = true;
    }

    if (!(form.prerequisites ?? '').trim()) {
      newFieldErrors.prerequisites = 'Prerequisites are required';
      hasError = true;
    }

    if (!(form.primary_instructor ?? '').trim()) {
      newFieldErrors.primary_instructor = 'Primary instructor is required';
      hasError = true;
    }

    if (!(form.faculty_details ?? '').trim()) {
      newFieldErrors.faculty_details = 'Faculty details are required';
      hasError = true;
    }

    setFieldErrors(newFieldErrors);
    return !hasError;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      // If there are validation errors, show an error message
      setError('Please correct the errors before submitting');
      // Show the tab with errors
      if (fieldErrors.name || fieldErrors.code || fieldErrors.description || 
      fieldErrors.credits || fieldErrors.semester || fieldErrors.degree_code || 
      fieldErrors.max_students) {
        setActiveTab(0);
      } else if (fieldErrors.learning_objectives || fieldErrors.course_outcomes || 
                fieldErrors.assessment_methods || fieldErrors.textbooks || 
                fieldErrors.references) {
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
              />
              {fieldErrors.description && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {fieldErrors.description}
                </Typography>
              )}

              <Box>
                <RichTextEditor
                  label="Prerequisites"
                  value={form.prerequisites}
                  onChange={handleInputChange('prerequisites')}
                  width={"100%"}
                  height={120}
                />
                {fieldErrors.prerequisites && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {fieldErrors.prerequisites}
                  </Typography>
                )}
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
                    />
                    {fieldErrors.learning_objectives && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {fieldErrors.learning_objectives}
                      </Typography>
                    )}

                    <RichTextEditor
                      label="Course Outcomes"
                      value={form.course_outcomes}
                      onChange={handleInputChange('course_outcomes')}
                      width={"100%"}
                      height={120}
                    />
                    {fieldErrors.course_outcomes && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {fieldErrors.course_outcomes}
                      </Typography>
                    )}

                    <RichTextEditor
                      label="Assessment Methods"
                      value={form.assessment_methods}
                      onChange={handleInputChange('assessment_methods')}
                      width={"100%"}
                      height={120}
                    />
                    {fieldErrors.assessment_methods && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {fieldErrors.assessment_methods}
                      </Typography>
                    )}

                    <RichTextEditor
                      label="References"
                      value={form.references}
                      onChange={handleInputChange('references')}
                      width={"100%"}
                      height={120}
                    />
                    {fieldErrors.references && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {fieldErrors.references}
                      </Typography>
                    )}

                    <RichTextEditor
                      label="Faculty Details"
                      value={form.faculty_details}
                      onChange={handleInputChange('faculty_details')}
                      width={"100%"}
                      height={120}
                    />
                    {fieldErrors.faculty_details && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {fieldErrors.faculty_details}
                      </Typography>
                    )}

                    <RichTextEditor
                      label="Textbooks"
                      value={form.textbooks}
                      onChange={handleInputChange('textbooks')}
                      width={"100%"}
                      height={120}
                    />
                    {fieldErrors.textbooks && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {fieldErrors.textbooks}
                      </Typography>
                    )}
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