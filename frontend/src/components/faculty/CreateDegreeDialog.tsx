import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
  mode: 'create' | 'edit';
  degree?: Partial<DegreeForm> & { id?: string };
}

interface DegreeForm {
  name: string;
  code: string;
  description: string;
  duration_years: number;
  department_id: string;
  degree_type: string;
  total_credits: number;
  courses_per_semester: { [semester: string]: { count: number | string; enrollment_start: string; enrollment_end: string } };
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
  contact_information: string;
  application_deadlines: string;
  application_process: string;
}

const CreateDegreeDialog: React.FC<CreateDegreeDialogProps> = ({
  open,
  onClose,
  onSuccess,
  mode,
  degree,
}) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const defaultForm = {
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
    contact_information: '',
    application_deadlines: '',
    application_process: '',
  };
  const [form, setForm] = useState<any>(defaultForm);

  // Initialize form when dialog opens or mode/degree changes
  useEffect(() => {
    if (open) {
      // If creating, set department_id to user's department code
      if (mode === 'create' && user?.department?.code) {
        setForm({ ...defaultForm, department_id: user.department.code });
      } else {
        setForm(mode === 'edit' && degree ? { ...defaultForm, ...degree } : defaultForm);
      }
      setActiveTab(0);
      setError('');
    }
  }, [open, mode, degree]);
  // Helper to add a new semester
  // Add semester
  const handleAddSemester = () => {
    const semesters = Object.keys(form.courses_per_semester).map(Number);
    const nextSemester = semesters.length > 0 ? Math.max(...semesters) + 1 : 1;
  setForm((prev: DegreeForm) => ({
      ...prev,
      courses_per_semester: {
        ...prev.courses_per_semester,
        [nextSemester]: { count: '', enrollment_start: '', enrollment_end: '' }
      }
    }));
  };

  // Helper to remove a semester
  // Remove semester
  const handleRemoveSemester = (semester: string) => {
  setForm((prev: DegreeForm) => {
      const updated = { ...prev.courses_per_semester };
      delete updated[semester];
      return {
        ...prev,
        courses_per_semester: updated
      };
    });
  };

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

  // Form field change handler
  const handleInputChange = (field: keyof DegreeForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
  setForm((prev: DegreeForm) => ({ ...prev, [field]: event.target.value }));
    setError('');
  };

  // Select field change handler
  const handleSelectChange = (field: keyof DegreeForm) => (
    event: any
  ) => {
  setForm((prev: DegreeForm) => ({ ...prev, [field]: event.target.value }));
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
      const payload = { ...form };
      if (form.courses_per_semester && Object.keys(form.courses_per_semester).length > 0) {
        payload.courses_per_semester = form.courses_per_semester;
      }
      if (mode === 'edit' && degree && degree.id) {
        await degreesAPI.updateDegree(degree.id, payload);
        enqueueSnackbar('Degree updated successfully!', { variant: 'success' });
      } else {
        await degreesAPI.createDegree(payload);
        enqueueSnackbar('Degree created successfully!', { variant: 'success' });
      }
      onSuccess();
      handleClose();
    } catch (error: any) {
      let errorMsg = 'Failed to save degree';
      if (error && typeof error === 'object') {
        if ('response' in error && error.response?.data?.error) {
          const backendError = error.response.data.error;
          errorMsg = typeof backendError === 'string' ? backendError : 'An unknown error occurred';
        } else if ('message' in error && typeof error.message === 'string') {
          errorMsg = error.message;
        } else if (error instanceof Error && error.message) {
          errorMsg = error.message;
        } else {
          console.error('DegreeDialog error:', error);
          errorMsg = 'An unknown error occurred';
        }
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else {
        console.error('DegreeDialog error:', error);
        errorMsg = 'An unknown error occurred';
      }
      setError(errorMsg);
  enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(defaultForm);
    setError('');
    setActiveTab(0);
    onClose();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <React.Fragment>
  {/* Dialog Open Debug removed */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <SchoolIcon color="primary" />
          {mode === 'edit' ? 'Edit Degree Program' : 'Create New Degree Program'}
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
                  {user?.department?.code ? (
                    <TextField
                      fullWidth
                      label="Department"
                      value={`${user.department.name} (${user.department.code})`}
                      disabled
                      helperText="Degrees are automatically assigned to your department"
                      variant="filled"
                    />
                  ) : (
                    <>
                      <InputLabel>Department</InputLabel>
                      <Select
                        value={form.department_id}
                        label="Department"
                        onChange={handleSelectChange('department_id')}
                      >
                        {departments.map((dept) => (
                          <MenuItem key={dept.code} value={dept.code}>
                            {dept.name} ({dept.code})
                          </MenuItem>
                        ))}
                      </Select>
                    </>
                  )}
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
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Courses Per Semester & Enrollment Dates</Typography>
                  {Object.keys(form.courses_per_semester).length === 0 && (
                    <Alert severity="info" sx={{ mb: 2 }}>No semesters added. Click + to add a semester.</Alert>
                  )}
                  {Object.entries(form.courses_per_semester).map(([semester, value]) => (
                    <Box key={semester} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                      <Typography sx={{ minWidth: 90 }}>Semester {semester}</Typography>
                      <TextField
                        label="Courses"
                        type="number"
                        value={String((value as { count: string | number; enrollment_start: string; enrollment_end: string }).count)}
                        onChange={(e) => {
                          setForm((prev: any) => ({
                            ...prev,
                            courses_per_semester: {
                              ...prev.courses_per_semester,
                              [semester]: {
                                ...(value as { count: string | number; enrollment_start: string; enrollment_end: string }),
                                count: e.target.value
                              }
                            }
                          }));
                        }}
                        sx={{ width: 100 }}
                      />
                      <TextField
                        label="Enrollment Start"
                        type="date"
                        value={(value as { count: string; enrollment_start: string; enrollment_end: string }).enrollment_start}
                        onChange={(e) => {
                          setForm((prev: any) => ({
                            ...prev,
                            courses_per_semester: {
                              ...prev.courses_per_semester,
                              [semester]: {
                                ...(value as { count: string; enrollment_start: string; enrollment_end: string }),
                                enrollment_start: e.target.value
                              }
                            }
                          }));
                        }}
                        sx={{ width: 170 }}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="Enrollment End"
                        type="date"
                        value={(value as { count: string; enrollment_start: string; enrollment_end: string }).enrollment_end}
                        onChange={(e) => {
                          setForm((prev: any) => ({
                            ...prev,
                            courses_per_semester: {
                              ...prev.courses_per_semester,
                              [semester]: {
                                ...(value as { count: string; enrollment_start: string; enrollment_end: string }),
                                enrollment_end: e.target.value
                              }
                            }
                          }));
                        }}
                        sx={{ width: 170 }}
                        InputLabelProps={{ shrink: true }}
                      />
                      <Button color="error" variant="outlined" sx={{ minWidth: 40 }} onClick={() => handleRemoveSemester(semester)}>-</Button>
                    </Box>
                  ))}
                  <Button variant="contained" color="primary" sx={{ mt: 1 }} onClick={handleAddSemester}>+</Button>
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
            {activeTab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField label="Specializations" value={form.specializations} onChange={handleInputChange('specializations')} fullWidth />
                <TextField label="Career Prospects" value={form.career_prospects} onChange={handleInputChange('career_prospects')} fullWidth />
                <TextField label="Admission Requirements" value={form.admission_requirements} onChange={handleInputChange('admission_requirements')} fullWidth />
                <TextField label="Accreditation" value={form.accreditation} onChange={handleInputChange('accreditation')} fullWidth />
                <TextField label="Study Mode" value={form.study_mode} onChange={handleInputChange('study_mode')} fullWidth />
                <TextField label="Fees" value={form.fees} onChange={handleInputChange('fees')} fullWidth />
                <TextField label="Location" value={form.location} onChange={handleInputChange('location')} fullWidth />
                <TextField label="Entry Requirements" value={form.entry_requirements} onChange={handleInputChange('entry_requirements')} fullWidth />
                <TextField label="Learning Outcomes" value={form.learning_outcomes} onChange={handleInputChange('learning_outcomes')} fullWidth />
                <TextField label="Assessment Methods" value={form.assessment_methods} onChange={handleInputChange('assessment_methods')} fullWidth />
                <TextField label="Contact Information" value={form.contact_information} onChange={handleInputChange('contact_information')} fullWidth />
                <TextField label="Application Deadlines" value={form.application_deadlines} onChange={handleInputChange('application_deadlines')} fullWidth />
                <TextField label="Application Process" value={form.application_process} onChange={handleInputChange('application_process')} fullWidth />
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
            {loading ? <CircularProgress size={24} /> : (mode === 'edit' ? 'Save Changes' : 'Create Degree')}
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
};

export default CreateDegreeDialog;
