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
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Typography,
} from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { degreesAPI, departmentsAPI } from '../../services/api';

interface CreateDegreeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DegreeForm {
  name: string;
  code: string;
  description: string;
  duration_years: number;
  department_id: string;
  degree_type: string;
  total_credits: number;
  courses_per_semester: { [key: string]: number };
  specializations: string;
  career_prospects: string;
  admission_requirements: string;
  accreditation: string;
  study_mode: string;
  fees: string;
  location: string;
  entry_requirements: string;
  learning_outcomes: string;
  assessment_methods: string;
}

const CreateDegreeDialog: React.FC<CreateDegreeDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const [form, setForm] = useState<DegreeForm>({
    name: '',
    code: '',
    description: '',
    duration_years: 4,
    department_id: '',
    degree_type: 'Bachelor',
    total_credits: 120,
    courses_per_semester: {},
    specializations: '',
    career_prospects: '',
    admission_requirements: '',
    accreditation: '',
    study_mode: 'Full-time',
    fees: '',
    location: 'On-campus',
    entry_requirements: '',
    learning_outcomes: '',
    assessment_methods: '',
  });

  useEffect(() => {
    if (open) {
      loadDepartments();
    }
  }, [open]);

  const loadDepartments = async () => {
    try {
      const response = await departmentsAPI.getDepartments();
      setDepartments(response);
    } catch (error) {
      console.error('Error loading departments:', error);
      setError('Failed to load departments');
    }
  };

  const handleInputChange = (field: keyof DegreeForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [field]: event.target.value,
    });
    setError('');
  };

  const handleSelectChange = (field: keyof DegreeForm) => (
    event: any
  ) => {
    setForm({
      ...form,
      [field]: event.target.value,
    });
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.name || !form.code || !form.department_id || !form.degree_type || !form.total_credits) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await degreesAPI.createDegree(form);
      enqueueSnackbar('Degree created successfully!', { variant: 'success' });
      onSuccess();
      handleClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create degree';
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
      description: '',
      duration_years: 4,
      department_id: '',
      degree_type: 'Bachelor',
      total_credits: 120,
      courses_per_semester: {},
      specializations: '',
      career_prospects: '',
      admission_requirements: '',
      accreditation: '',
      study_mode: 'Full-time',
      fees: '',
      location: 'On-campus',
      entry_requirements: '',
      learning_outcomes: '',
      assessment_methods: '',
    });
    setError('');
    setActiveTab(0);
    onClose();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <SchoolIcon color="primary" />
        Create New Degree Program
      </DialogTitle>
      <DialogContent dividers sx={{ height: '70vh', overflow: 'hidden', p: 0 }}>
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
          <Tab label="Basic Info" />
          <Tab label="Program Details" />
          <Tab label="Admission & Fees" />
        </Tabs>

        <Box sx={{ p: 3, height: 'calc(100% - 48px)', overflowY: 'auto' }}>
          {/* Tab 0: Basic Information */}
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                required
                fullWidth
                label="Degree Name"
                value={form.name}
                onChange={handleInputChange('name')}
                placeholder="e.g., Master of Commerce"
              />
              
              <TextField
                required
                fullWidth
                label="Degree Code"
                value={form.code}
                onChange={handleInputChange('code')}
                inputProps={{ style: { textTransform: 'uppercase' } }}
                placeholder="e.g., MCOM"
              />

              <FormControl fullWidth required>
                <InputLabel>Degree Type</InputLabel>
                <Select
                  value={form.degree_type}
                  label="Degree Type"
                  onChange={handleSelectChange('degree_type')}
                >
                  <MenuItem value="Certificate">Certificate</MenuItem>
                  <MenuItem value="Diploma">Diploma</MenuItem>
                  <MenuItem value="Associate">Associate Degree</MenuItem>
                  <MenuItem value="Bachelor">Bachelor's Degree</MenuItem>
                  <MenuItem value="Master">Master's Degree</MenuItem>
                  <MenuItem value="Doctoral">Doctoral Degree</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select
                  value={form.department_id}
                  label="Department"
                  onChange={handleSelectChange('department_id')}
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  required
                  fullWidth
                  label="Duration (Years)"
                  type="number"
                  value={form.duration_years}
                  onChange={handleInputChange('duration_years')}
                  inputProps={{ min: 1, max: 10 }}
                />
                
                <TextField
                  required
                  fullWidth
                  label="Total Credits"
                  type="number"
                  value={form.total_credits}
                  onChange={handleInputChange('total_credits')}
                  inputProps={{ min: 1, max: 300 }}
                />
              </Box>

              {/* Courses per Semester Section */}
              <Box sx={{ mt: 2 }}>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon color="primary" />
                  <Typography variant="h6">Courses per Semester</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
                  {Array.from({ length: form.duration_years * 2 }, (_, index) => {
                    const semester = index + 1;
                    return (
                      <TextField
                        key={semester}
                        size="small"
                        label={`Sem ${semester}`}
                        type="number"
                        value={form.courses_per_semester[semester.toString()] || ''}
                        onChange={(e) => {
                          const newCoursesPerSemester = { ...form.courses_per_semester };
                          if (e.target.value) {
                            newCoursesPerSemester[semester.toString()] = parseInt(e.target.value) || 0;
                          } else {
                            delete newCoursesPerSemester[semester.toString()];
                          }
                          setForm({ ...form, courses_per_semester: newCoursesPerSemester });
                        }}
                        inputProps={{ min: 0, max: 15 }}
                        placeholder="0"
                      />
                    );
                  })}
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Specify the number of courses for each semester (leave empty if not applicable)
                </Typography>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Program Description"
                value={form.description}
                onChange={handleInputChange('description')}
                placeholder="Comprehensive overview of the degree program"
              />
            </Box>
          )}

          {/* Tab 1: Program Details */}
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Learning Outcomes"
                value={form.learning_outcomes}
                onChange={handleInputChange('learning_outcomes')}
                placeholder="What students will learn and be able to do upon graduation"
              />

              <TextField
                fullWidth
                multiline
                rows={2}
                label="Specializations"
                value={form.specializations}
                onChange={handleInputChange('specializations')}
                placeholder="Available specializations (comma-separated)"
              />

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Career Prospects"
                value={form.career_prospects}
                onChange={handleInputChange('career_prospects')}
                placeholder="Career opportunities and job prospects for graduates"
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Assessment Methods"
                value={form.assessment_methods}
                onChange={handleInputChange('assessment_methods')}
                placeholder="How students will be assessed (exams, assignments, projects, etc.)"
              />

              <TextField
                fullWidth
                label="Accreditation"
                value={form.accreditation}
                onChange={handleInputChange('accreditation')}
                placeholder="Professional accreditation body or certification"
              />
            </Box>
          )}

          {/* Tab 2: Admission & Fees */}
          {activeTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Admission Requirements"
                value={form.admission_requirements}
                onChange={handleInputChange('admission_requirements')}
                placeholder="General admission requirements and prerequisites"
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Entry Requirements"
                value={form.entry_requirements}
                onChange={handleInputChange('entry_requirements')}
                placeholder="Specific entry requirements (GPA, test scores, etc.)"
              />

              <FormControl fullWidth>
                <InputLabel>Study Mode</InputLabel>
                <Select
                  value={form.study_mode}
                  label="Study Mode"
                  onChange={handleSelectChange('study_mode')}
                >
                  <MenuItem value="Full-time">Full-time</MenuItem>
                  <MenuItem value="Part-time">Part-time</MenuItem>
                  <MenuItem value="Online">Online</MenuItem>
                  <MenuItem value="Hybrid">Hybrid</MenuItem>
                  <MenuItem value="Evening">Evening</MenuItem>
                  <MenuItem value="Weekend">Weekend</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Location"
                value={form.location}
                onChange={handleInputChange('location')}
                placeholder="Campus location or delivery method"
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Fees Information"
                value={form.fees}
                onChange={handleInputChange('fees')}
                placeholder="Tuition fees, additional costs, payment options"
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Create Degree'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDegreeDialog;
