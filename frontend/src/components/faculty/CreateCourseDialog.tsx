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
  overview: string;
  credits: number;
  semester: number;
  department_code: string;
  degree_code: string;
  is_elective: boolean;
  max_students: number;
  prerequisites: string[];
  study_details: {
    learning_objectives: string[];
    course_outcomes: string[];
    assessment_methods: string[];
    textbooks: string[];
    references: string[];
  };
  faculty_details: {
    primary_instructor: string;
    co_instructors: string[];
    guest_lecturers: string[];
    lab_instructors: string[];
  };
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
    overview: '',
    credits: 3,
    semester: 1,
    department_code: '',
    degree_code: '',
    is_elective: false,
    max_students: 50,
    prerequisites: [],
    study_details: {
      learning_objectives: [''],
      course_outcomes: [''],
      assessment_methods: [''],
      textbooks: [''],
      references: [''],
    },
    faculty_details: {
      primary_instructor: '',
      co_instructors: [],
      guest_lecturers: [],
      lab_instructors: [],
    },
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
    overview?: string;
    credits?: string;
    semester?: string;
    max_students?: string;
    degree_code?: string;
    learning_objectives?: string;
    course_outcomes?: string;
    assessment_methods?: string;
    textbooks?: string;
    references?: string;
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
              degree_code: courseData.degree?.id ?? courseData.degree_code ?? '',
              department_code: courseData.department?.code ?? courseData.department_code ?? '',
              study_details: {
                ...defaultForm.study_details,
                ...courseData.study_details,
              },
              faculty_details: {
                ...defaultForm.faculty_details,
                ...courseData.faculty_details,
              },
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
      case 'overview':
        if (!value?.trim()) return 'Course overview is required';
        if (value.trim().length < 10) return 'Overview must be at least 10 characters';
        if (value.trim().length > 2000) return 'Overview cannot exceed 2000 characters';
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
    event: React.ChangeEvent<HTMLInputElement>
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

  const handleStudyDetailChange = (section: keyof CourseForm['study_details'], index: number, value: string) => {
    const updatedDetails = { ...form.study_details };
    updatedDetails[section][index] = value;
    setForm({
      ...form,
      study_details: updatedDetails,
    });
  };

  const addStudyDetailItem = (section: keyof CourseForm['study_details']) => {
    const updatedDetails = { ...form.study_details };
    updatedDetails[section].push('');
    setForm({
      ...form,
      study_details: updatedDetails,
    });
  };

  const removeStudyDetailItem = (section: keyof CourseForm['study_details'], index: number) => {
    const updatedDetails = { ...form.study_details };
    updatedDetails[section].splice(index, 1);
    setForm({
      ...form,
      study_details: updatedDetails,
    });
  };

  const handlePrerequisiteAdd = () => {
    setForm({
      ...form,
      prerequisites: [...form.prerequisites, ''],
    });
  };

  const handlePrerequisiteChange = (index: number, value: string) => {
    const updatedPrereqs = [...form.prerequisites];
    updatedPrereqs[index] = value;
    setForm({
      ...form,
      prerequisites: updatedPrereqs,
    });
  };

  const handlePrerequisiteRemove = (index: number) => {
    const updatedPrereqs = form.prerequisites.filter((_, i) => i !== index);
    setForm({
      ...form,
      prerequisites: updatedPrereqs,
    });
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

    if (!form.overview.trim()) {
      newFieldErrors.overview = 'Course overview is required';
      hasError = true;
    } else if (form.overview.trim().length < 10) {
      newFieldErrors.overview = 'Overview must be at least 10 characters';
      hasError = true;
    } else if (form.overview.trim().length > 2000) {
      newFieldErrors.overview = 'Overview cannot exceed 2000 characters';
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

    // Check study details
    if (form.study_details.learning_objectives.filter(obj => obj.trim()).length === 0) {
      newFieldErrors.learning_objectives = 'At least one learning objective is required';
      hasError = true;
    }

    if (form.study_details.course_outcomes.filter(outcome => outcome.trim()).length === 0) {
      newFieldErrors.course_outcomes = 'At least one course outcome is required';
      hasError = true;
    }

    if (form.study_details.assessment_methods.filter(method => method.trim()).length === 0) {
      newFieldErrors.assessment_methods = 'At least one assessment method is required';
      hasError = true;
    }

    if (form.study_details.textbooks.filter(book => book.trim()).length === 0) {
      newFieldErrors.textbooks = 'At least one textbook is required';
      hasError = true;
    }

    if (form.study_details.references.filter(ref => ref.trim()).length === 0) {
      newFieldErrors.references = 'At least one reference is required';
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
      if (fieldErrors.name || fieldErrors.code || fieldErrors.overview || 
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
      const cleanedForm = {
        ...form,
        department_id: selectedDepartment?.id ?? '',
        degree_id: selectedDegree?.id ?? '',
        prerequisites: form.prerequisites.filter(p => p.trim()),
        study_details: {
          learning_objectives: form.study_details.learning_objectives.filter(obj => obj.trim()),
          course_outcomes: form.study_details.course_outcomes.filter(outcome => outcome.trim()),
          assessment_methods: form.study_details.assessment_methods.filter(method => method.trim()),
          textbooks: form.study_details.textbooks.filter(book => book.trim()),
          references: form.study_details.references.filter(ref => ref.trim()),
        },
        faculty_details: {
          primary_instructor: form.faculty_details.primary_instructor,
          co_instructors: form.faculty_details.co_instructors.filter(instructor => instructor.trim()),
          guest_lecturers: form.faculty_details.guest_lecturers.filter(lecturer => lecturer.trim()),
          lab_instructors: form.faculty_details.lab_instructors.filter(instructor => instructor.trim()),
        },
      };

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

  const renderStudyDetailSection = (title: string, section: keyof CourseForm['study_details']) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      {form.study_details[section].map((item, index) => {
        // Only show error for the first empty item in required fields
        const showError = !!fieldErrors[section] && (!item.trim() && index === 0);
        return (
          <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              fullWidth
              size="small"
              value={item}
              onChange={(e) => handleStudyDetailChange(section, index, e.target.value)}
              placeholder={`Enter ${title.toLowerCase()}`}
              error={showError}
              helperText={showError ? fieldErrors[section] : ''}
              sx={showError ? { backgroundColor: '#fff3e0' } : {}}
            />
            <IconButton
              size="small"
              onClick={() => removeStudyDetailItem(section, index)}
              disabled={form.study_details[section].length === 1}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        );
      })}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => addStudyDetailItem(section)}
      >
        Add {title}
      </Button>
    </Box>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <CourseIcon color="primary" />
        {mode === 'edit' ? 'Edit Course' : 'Create New Course'}
      </DialogTitle>
      
      <DialogContent dividers sx={{ height: '70vh', overflow: 'hidden', p: 0 }}>
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
              <Tab label="Faculty Details" />
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
                />
                
                <TextField
                  required
                  fullWidth
                  label="Course Code"
                  value={form.code ?? ''}
                  onChange={handleInputChange('code')}
                  error={!!fieldErrors.code}
                  helperText={fieldErrors.code || "e.g., CS101 (uppercase letters and numbers only)"}
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

                <FormControl fullWidth required error={!!fieldErrors.degree_code}>
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
                        <MenuItem key={degree.id} value={degree.id}>
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
                    inputLabel: { shrink: true },
                    htmlInput: { min: 0, max: 10 }
                  }}
                />

                <TextField
                  fullWidth
                  label="Max Students"
                  type="number"
                  value={form.max_students}
                  onChange={handleInputChange('max_students')}
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

              <TextField
                required
                fullWidth
                multiline
                rows={4}
                label="Course Overview"
                value={form.overview}
                onChange={handleInputChange('overview')}
                error={!!fieldErrors.overview}
                helperText={fieldErrors.overview || `Provide a detailed overview (10-2000 characters) - ${form.overview.length}/2000`}
              />

              <Box>
                <Typography variant="h6" gutterBottom>
                  Prerequisites
                </Typography>
                {form.prerequisites.map((prereq, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={prereq}
                      onChange={(e) => handlePrerequisiteChange(index, e.target.value)}
                      placeholder="Enter prerequisite course"
                    />
                    <IconButton
                      size="small"
                      onClick={() => handlePrerequisiteRemove(index)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handlePrerequisiteAdd}
                >
                  Add Prerequisite
                </Button>
              </Box>
            </Box>
          )}

          {/* Tab 1: Study Details */}
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Box>
                  {renderStudyDetailSection('Learning Objectives', 'learning_objectives')}
                  {renderStudyDetailSection('Assessment Methods', 'assessment_methods')}
                  {renderStudyDetailSection('References', 'references')}
                </Box>
                
                <Box>
                  {renderStudyDetailSection('Course Outcomes', 'course_outcomes')}
                  {renderStudyDetailSection('Textbooks', 'textbooks')}
                </Box>
              </Box>
            </Box>
          )}

          {/* Tab 2: Faculty Details */}
          {activeTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth required sx={{ mt: 2 }}>
                <InputLabel>Primary Instructor</InputLabel>
                <Select
                  value={form.faculty_details.primary_instructor}
                  label="Primary Instructor"
                  onChange={(e) => setForm({
                    ...form,
                    faculty_details: {
                      ...form.faculty_details,
                      primary_instructor: e.target.value,
                    },
                  })}
                >
                  {faculty.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Additional faculty details could be added here */}
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