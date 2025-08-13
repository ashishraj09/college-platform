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
import { coursesAPI, degreesAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface CreateCourseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

  useEffect(() => {
    if (open) {
      // Initialize form based on mode
      if (course && mode === 'edit') {
        // Populate form with existing course data
        setForm({
          name: course.name || '',
          code: course.code || '',
          overview: course.overview || '',
          credits: course.credits || 3,
          semester: course.semester || 1,
          department_id: course.department_id || '',
          degree_id: course.degree_id || '',
          is_elective: course.is_elective || false,
          max_students: course.max_students || 50,
          prerequisites: course.prerequisites || [],
          study_details: {
            learning_objectives: course.study_details?.learning_objectives || [''],
            course_outcomes: course.study_details?.course_outcomes || [''],
            assessment_methods: course.study_details?.assessment_methods || [''],
            textbooks: course.study_details?.textbooks || [''],
            references: course.study_details?.references || [''],
          },
          faculty_details: {
            primary_instructor: course.faculty_details?.primary_instructor || course.faculty_details?.instructor || '',
            co_instructors: course.faculty_details?.co_instructors || [],
            guest_lecturers: course.faculty_details?.guest_lecturers || [],
            lab_instructors: course.faculty_details?.lab_instructors || [],
          },
        });
      } else if (mode === 'create') {
        // Reset form for new course
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
      const response = await degreesAPI.getFacultyDegrees(user?.department?.id);
      
      if (response && response.all) {
        setDegrees(response.all);
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
    setForm({
      ...form,
      [field]: event.target.value,
    });
    setError('');
  };

  const handleSelectChange = (field: keyof CourseForm) => (
    event: any
  ) => {
    setForm({
      ...form,
      [field]: event.target.value,
    });
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

  const handleSubmit = async () => {
    // Check if user has a department assigned
    if (!user?.department?.id) {
      setError('You must be assigned to a department to create courses. Please contact your administrator.');
      return;
    }

    if (!form.name || !form.code || !form.overview || !form.department_id || !form.degree_id) {
      setError('Please fill in all required fields');
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
        await coursesAPI.updateCourse(course.id, cleanedForm, user?.id, user?.department?.id);
        enqueueSnackbar('Course updated successfully!', { variant: 'success' });
      } else {
        await coursesAPI.createCourse(cleanedForm, user?.id, user?.department?.id);
        enqueueSnackbar('Course created successfully!', { variant: 'success' });
      }
      
      onSuccess();
      handleClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || `Failed to ${mode === 'edit' ? 'update' : 'create'} course`;
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
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
    onClose();
  };

  const renderStudyDetailSection = (title: string, section: keyof CourseForm['study_details']) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      {form.study_details[section].map((item, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={item}
            onChange={(e) => handleStudyDetailChange(section, index, e.target.value)}
            placeholder={`Enter ${title.toLowerCase()}`}
          />
          <IconButton
            size="small"
            onClick={() => removeStudyDetailItem(section, index)}
            disabled={form.study_details[section].length === 1}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}
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
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
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
              />
              
              <TextField
                required
                fullWidth
                label="Course Code"
                value={form.code}
                onChange={handleInputChange('code')}
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

              <FormControl fullWidth required>
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
                inputProps={{ min: 1, max: 10 }}
              />

              <TextField
                required
                fullWidth
                label="Semester"
                type="number"
                value={form.semester}
                onChange={handleInputChange('semester')}
                inputProps={{ min: 1, max: 10 }}
              />

              <TextField
                fullWidth
                label="Max Students"
                type="number"
                value={form.max_students}
                onChange={handleInputChange('max_students')}
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
              helperText="Provide a detailed overview of the course (10-2000 characters)"
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
