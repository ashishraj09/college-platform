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
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api, { coursesAPI, degreesAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface CreateCourseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newCourseId?: string) => void;
  course?: any; // Course data for editing
  mode?: 'create' | 'edit';
}

interface CourseForm {
  name: string;
  code: string;
  overview: string;
  credits: number;
  semester: number;
  department_id: string;
  degree_id: string;
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
  course = null,
  mode = 'create',
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingDegrees, setLoadingDegrees] = useState(false);
  const [degrees, setDegrees] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [owner, setOwner] = useState<any>(null);
  const [courseId, setCourseId] = useState<string | null>(null);

  const [form, setForm] = useState<CourseForm>({
    name: '',
    code: '',
    overview: '',
    credits: 3,
    semester: 1,
    department_id: user?.department?.id || '',
    degree_id: '',
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
  });

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    code?: string;
    overview?: string;
    credits?: string;
    semester?: string;
    max_students?: string;
    degree_id?: string;
    learning_objectives?: string;
    course_outcomes?: string;
    assessment_methods?: string;
    textbooks?: string;
    references?: string;
  }>({});

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
      case 'degree_id':
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

  useEffect(() => {
    if (open) {
      // If editing, fetch course data if only ID is provided
      if (mode === 'edit') {
        let editId: string | null = null;
        if (course && typeof course === 'object' && course.id) {
          editId = course.id;
        } else if (course && typeof course === 'string') {
          editId = course;
        }
        if (editId && typeof editId === 'string') {
          setCourseId(editId);
          const fetchCourseForEdit = async () => {
            try {
              setLoading(true);
              const response = await coursesAPI.getCourseForEdit(editId as string);
              const courseData = response.course;
              setOwner(courseData.creator);
              setForm({
                name: courseData.name || '',
                code: courseData.code || '',
                overview: courseData.overview || '',
                credits: courseData.credits || 3,
                semester: courseData.semester || 1,
                department_id: courseData.department_id || '',
                degree_id: courseData.degree_id || '',
                is_elective: courseData.is_elective || false,
                max_students: courseData.max_students || 50,
                prerequisites: courseData.prerequisites || [],
                study_details: {
                  learning_objectives: courseData.study_details?.learning_objectives || [''],
                  course_outcomes: courseData.study_details?.course_outcomes || [''],
                  assessment_methods: courseData.study_details?.assessment_methods || [''],
                  textbooks: courseData.study_details?.textbooks || [''],
                  references: courseData.study_details?.references || [''],
                },
                faculty_details: {
                  primary_instructor: courseData.faculty_details?.primary_instructor || courseData.faculty_details?.instructor || '',
                  co_instructors: courseData.faculty_details?.co_instructors || [],
                  guest_lecturers: courseData.faculty_details?.guest_lecturers || [],
                  lab_instructors: courseData.faculty_details?.lab_instructors || [],
                },
              });
            } catch (error) {
              console.error('Error fetching course for edit:', error);
              setError('Failed to load course data for editing');
            } finally {
              setLoading(false);
            }
          };
          fetchCourseForEdit();
        }
      } else if (mode === 'create') {
        setForm({
          name: '',
          code: '',
          overview: '',
          credits: 3,
          semester: 1,
          department_id: user?.department?.id || '',
          degree_id: '',
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
        });
      }
      // Load data
      loadDegreesByDepartment();
      if (form.department_id || user?.department?.id) {
        loadFacultyByDepartment(form.department_id || user?.department?.id);
      }
    }
  }, [open, course, mode, user?.department?.id]);

  const loadDegreesByDepartment = async () => {
    try {
      setLoadingDegrees(true);
      const response = await degreesAPI.getActiveDegrees(user?.department?.id);
      if (response && response.all) {
        setDegrees(response.all);
      } else if (Array.isArray(response)) {
        setDegrees(response);
      } else {
        setDegrees([]);
      }
    } catch (error) {
      console.error('Error loading degrees:', error);
      setError('Failed to load degrees. Please try again.');
      setDegrees([]);
    } finally {
      setLoadingDegrees(false);
    }
  };

  const loadFacultyByDepartment = async (departmentId: string) => {
    try {
      const response = await usersAPI.getUsersByDepartment(departmentId, {
        user_type: 'faculty',
        status: 'active'
      });
      setFaculty(response.users);
    } catch (error) {
      console.error('Error loading faculty:', error);
    }
  };

  const handleInputChange = (field: keyof CourseForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = field === 'code' ? event.target.value.toUpperCase() : event.target.value;
    const numericValue = ['credits', 'semester', 'max_students'].includes(field) 
      ? parseInt(value) || 0 
      : value;

    setForm({
      ...form,
      [field]: numericValue,
    });
    
    // Real-time validation
    updateFieldError(field, numericValue);
    setError('');
  };

  const handleSelectChange = (field: keyof CourseForm) => (
    event: any
  ) => {
    setForm({
      ...form,
      [field]: event.target.value,
    });
    
    // Real-time validation
    updateFieldError(field, event.target.value);
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

  const validateForm = (): string | null => {
    // Check if user has a department assigned
    if (!user?.department?.id) {
      return 'You must be assigned to a department to create courses. Please contact your administrator.';
    }

    // Required field validation
    if (!form.name.trim()) {
      return 'Course name is required';
    }
    
    if (form.name.trim().length < 3) {
      return 'Course name must be at least 3 characters long';
    }
    
    if (form.name.trim().length > 100) {
      return 'Course name cannot exceed 100 characters';
    }

    if (!form.code.trim()) {
      return 'Course code is required';
    }
    
    if (form.code.trim().length < 3) {
      return 'Course code must be at least 3 characters long';
    }
    
    if (form.code.trim().length > 10) {
      return 'Course code cannot exceed 10 characters';
    }
    
    // Course code format validation (letters and numbers only)
    if (!/^[A-Z0-9]+$/.test(form.code.trim())) {
      return 'Course code must contain only uppercase letters and numbers';
    }

    if (!form.overview.trim()) {
      return 'Course overview is required';
    }
    
    if (form.overview.trim().length < 10) {
      return 'Course overview must be at least 10 characters long';
    }
    
    if (form.overview.trim().length > 2000) {
      return 'Course overview cannot exceed 2000 characters';
    }

    if (!form.department_id) {
      return 'Department selection is required';
    }

    if (!form.degree_id) {
      return 'Degree selection is required';
    }

    // Numeric field validation
    if (form.credits < 1 || form.credits > 10) {
      return 'Credits must be between 1 and 10';
    }

    if (form.semester < 1 || form.semester > 10) {
      return 'Semester must be between 1 and 10';
    }

    if (form.max_students < 1 || form.max_students > 500) {
      return 'Maximum students must be between 1 and 500';
    }

    // Study details validation - ensure at least one item in each required section
    if (form.study_details.learning_objectives.filter(obj => obj.trim()).length === 0) {
      return 'At least one learning objective is required';
    }

    if (form.study_details.course_outcomes.filter(outcome => outcome.trim()).length === 0) {
      return 'At least one course outcome is required';
    }

    if (form.study_details.assessment_methods.filter(method => method.trim()).length === 0) {
      return 'At least one assessment method is required';
    }

    return null;
  };

  const handleSubmit = async () => {
    // Validate all required fields and set fieldErrors for study details
    let hasError = false;
    const newFieldErrors: typeof fieldErrors = {};
    if (!form.name.trim()) {
      newFieldErrors.name = 'Course name is required';
      hasError = true;
    }
    if (!form.code.trim()) {
      newFieldErrors.code = 'Course code is required';
      hasError = true;
    }
    if (!form.overview.trim()) {
      newFieldErrors.overview = 'Course overview is required';
      hasError = true;
    }
    if (!form.degree_id) {
      newFieldErrors.degree_id = 'Degree selection is required';
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
    if (hasError) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Filter out empty values
      const cleanedForm = {
        ...form,
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

      if (mode === 'edit' && course) {
        // Check if course is approved or active
        if (course.status === 'approved' || course.status === 'active') {
          try {
            // Create a new version instead of updating directly
            const response = await api.post(`${API_BASE_URL}/courses/${course.id}/create-version`);
            const data = response.data;
            enqueueSnackbar(`New version created. You will be redirected to edit the draft.`, { variant: 'success' });
            
            // Return the new course ID for potential redirection
            onSuccess(data.course?.id);
          } catch (error: any) {
            throw error;
          }
        } else {
          // Update draft or pending courses directly
          await coursesAPI.updateCourse(course.id, cleanedForm, user?.id, user?.department?.id);
          enqueueSnackbar('Course updated successfully!', { variant: 'success' });
          onSuccess();
        }
      } else {
        await coursesAPI.createCourse(cleanedForm, user?.id, user?.department?.id);
        enqueueSnackbar('Course created successfully!', { variant: 'success' });
        onSuccess();
      }
      
      handleClose();
    } catch (error: any) {
      let errorMsg = `Failed to ${mode === 'edit' ? 'update' : 'create'} course`;
      if (error && typeof error === 'object') {
        if ('response' in error && error.response?.data?.error) {
          const backendError = error.response.data.error;
          errorMsg = typeof backendError === 'string' ? backendError : 'An unknown error occurred';
        } else if ('message' in error && typeof error.message === 'string') {
          errorMsg = error.message;
        } else if (error instanceof Error && error.message) {
          errorMsg = error.message;
        } else {
          console.error('CreateCourseDialog error:', error);
          errorMsg = 'An unknown error occurred';
        }
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else {
        console.error('CreateCourseDialog error:', error);
        errorMsg = 'An unknown error occurred';
      }
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({
      name: '',
      code: '',
      overview: '',
      credits: 3,
      semester: 1,
      department_id: '',
      degree_id: '',
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
    });
    setError('');
    setFieldErrors({});
    setOwner(null);
    onClose();
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
      <DialogTitle>{mode === 'edit' ? 'Edit Course' : 'Create New Course'}</DialogTitle>
      <DialogContent dividers>
        {!user?.department && (
          <Alert severity="error" sx={{ mb: 2 }}>
            You must be assigned to a department to create courses. Please contact your administrator.
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
              <TextField
                required
                fullWidth
                label="Course Name"
                value={form.name}
                onChange={handleInputChange('name')}
                error={!!fieldErrors.name}
                helperText={fieldErrors.name || "Enter the full name of the course"}
              />
              
              <TextField
                required
                fullWidth
                label="Course Code"
                value={form.code}
                onChange={handleInputChange('code')}
                error={!!fieldErrors.code}
                helperText={fieldErrors.code || "e.g., CS101 (uppercase letters and numbers only)"}
                inputProps={{ style: { textTransform: 'uppercase' } }}
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
                  value={`${owner.first_name} ${owner.last_name}`}
                  disabled
                  helperText={`Created by ${owner.email}`}
                  variant="filled"
                />
              )}

              <FormControl fullWidth required error={!!fieldErrors.degree_id}>
                <InputLabel>Degree</InputLabel>
                <Select
                  value={form.degree_id}
                  label="Degree"
                  onChange={handleSelectChange('degree_id')}
                  disabled={!form.department_id || loadingDegrees}
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
                {fieldErrors.degree_id && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {fieldErrors.degree_id}
                  </Typography>
                )}
              </FormControl>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
              <TextField
                required
                fullWidth
                label="Credits"
                type="number"
                value={form.credits}
                onChange={handleInputChange('credits')}
                error={!!fieldErrors.credits}
                helperText={fieldErrors.credits || "1-10 credit hours"}
                inputProps={{ min: 1, max: 10 }}
              />

              <TextField
                required
                fullWidth
                label="Semester"
                type="number"
                value={form.semester}
                onChange={handleInputChange('semester')}
                error={!!fieldErrors.semester}
                helperText={fieldErrors.semester || "Which semester (1-10)"}
                inputProps={{ min: 1, max: 10 }}
              />

              <TextField
                fullWidth
                label="Max Students"
                type="number"
                value={form.max_students}
                onChange={handleInputChange('max_students')}
                error={!!fieldErrors.max_students}
                helperText={fieldErrors.max_students || "Maximum enrollment (1-500)"}
                inputProps={{ min: 1, max: 500 }}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
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
              sx={{ mt: 2 }}
            />
          </Box>

          {/* Prerequisites */}
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

          {/* Study Details */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Study Details
            </Typography>
            
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

          {/* Faculty Details */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Faculty Details
            </Typography>
            
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
          </Box>
        </Box>
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
