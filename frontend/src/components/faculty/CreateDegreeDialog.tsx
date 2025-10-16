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
  IconButton,
} from '@mui/material';
import { School as SchoolIcon, Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { degreesAPI, departmentsAPI } from '../../services/api';

interface CreateDegreeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  degree?: Partial<DegreeForm> & { 
    id?: string;
    department_code?: string;
    department?: { code: string; name: string };
  };
}

interface DegreeForm {
  name: string;
  code: string;
  description: string;
  duration_years: number;
  department_code: string;
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
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const validateField = (field: string, value: any): string | undefined => {
    switch (field) {
      case 'name':
        if (!value?.trim()) return 'Degree name is required';
        if (value.trim().length < 3) return 'Degree name must be at least 3 characters';
        break;
      case 'code':
        if (!value?.trim()) return 'Degree code is required';
        if (!/^[A-Z0-9]+$/.test(value.trim())) return 'Only uppercase letters and numbers allowed';
        break;
      case 'department_code':
        if (!value) return 'Department selection is required';
        break;
      case 'degree_type':
        if (!value) return 'Degree type is required';
        break;
      case 'total_credits':
        if (!value || isNaN(Number(value)) || Number(value) < 1) return 'Total credits must be at least 1';
        break;
      case 'duration_years':
        if (!value || isNaN(Number(value)) || Number(value) < 1) return 'Duration must be at least 1 year';
        break;
      case 'description':
        if (!value?.trim()) return 'Description is required';
        if (value.trim().length < 10) return 'Description must be at least 10 characters';
        break;
      default:
        return undefined;
    }
  };
  const updateFieldError = (field: string, value: any) => {
    setFieldErrors(prev => ({ ...prev, [field]: validateField(field, value) || '' }));
  };
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const defaultForm = {
    name: '',
    code: '',
    description: '',
    duration_years: 4,
    department_code: '',
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
      // Always use the user's department code (faculty can only create/edit for their department)
      const departmentCode = user?.department?.code || '';
      
      if (mode === 'edit' && degree) {
        setInitialLoading(true);
        // Simulate a small delay to show loader (or if fetching degree data)
        setTimeout(() => {
          setForm({ ...defaultForm, ...degree, department_code: departmentCode });
          setInitialLoading(false);
        }, 300);
      } else {
        setForm({ ...defaultForm, department_code: departmentCode });
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
      setInitialLoading(true);
      loadDepartments().finally(() => {
        setInitialLoading(false);
      });
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
    updateFieldError(field, event.target.value);
    setError('');
  };

  // Select field change handler
  const handleSelectChange = (field: keyof DegreeForm) => (
    event: any
  ) => {
    setForm((prev: DegreeForm) => ({ ...prev, [field]: event.target.value }));
    updateFieldError(field, event.target.value);
    setError('');
  };

  const handleSubmit = async () => {

    // Validate all required fields
    const requiredFields = ['name', 'code', 'department_code', 'degree_type', 'total_credits', 'duration_years', 'description'];
    let hasError = false;
    const newErrors: { [key: string]: string } = {};
    requiredFields.forEach(field => {
      const error = validateField(field, form[field]);
      if (error) {
        newErrors[field] = error;
        hasError = true;
      }
    });
    setFieldErrors(newErrors);
    if (hasError) {
      setError('Please correct the errors before submitting');
      // Tab switching logic: find which tab has the first error
      const tab0Fields = ['name', 'code', 'department_code', 'degree_type', 'total_credits', 'duration_years', 'description'];
      const tab1Fields = ['specializations', 'career_prospects', 'accreditation', 'study_mode', 'learning_outcomes', 'assessment_methods', 'contact_information', 'application_process'];
      const tab2Fields = ['admission_requirements', 'entry_requirements', 'fees', 'location', 'application_deadlines'];
      if (tab0Fields.some(f => newErrors[f])) {
        setActiveTab(0);
      } else if (tab1Fields.some(f => fieldErrors[f])) {
        setActiveTab(1);
      } else if (tab2Fields.some(f => fieldErrors[f])) {
        setActiveTab(2);
      }
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate courses_per_semester values
      if (form.courses_per_semester && Object.keys(form.courses_per_semester).length > 0) {
        for (const [semester, data] of Object.entries(form.courses_per_semester)) {
          const count = Number((data as any).count);
          if (isNaN(count) || count < 0 || !Number.isInteger(count)) {
            setError(`Semester ${semester}: Courses per semester must be a non-negative integer`);
            setLoading(false);
            return;
          }
        }
      }
      
      // Remove department object from payload if present, department_code is already in form
      const { department, ...restForm } = form as any;
      const payload = {
        ...restForm,
        department_code: user?.department?.code,
      };
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
          {initialLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
              <CircularProgress size={60} />
              <Typography variant="body1" color="text.secondary">
                {mode === 'edit' ? 'Loading degree...' : 'Loading form...'}
              </Typography>
            </Box>
          ) : (
            <>
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
                  error={!!fieldErrors.name}
                  helperText={fieldErrors.name ? fieldErrors.name : "e.g., Master of Commerce"}
                  placeholder="e.g., Master of Commerce"
                />
                <TextField
                  required
                  fullWidth
                  label="Degree Code"
                  value={form.code}
                  onChange={handleInputChange('code')}
                  error={!!fieldErrors.code}
                  helperText={fieldErrors.code ? fieldErrors.code : "e.g., MCOM (uppercase letters and numbers only)"}
                  slotProps={{ 
                    htmlInput: { style: { textTransform: 'uppercase' } }
                  }}
                  placeholder="e.g., MCOM"
                />
                <FormControl fullWidth required error={!!fieldErrors.degree_type}>
                  <InputLabel>Degree Type</InputLabel>
                  <Select
                    value={form.degree_type}
                    label="Degree Type"
                    onChange={handleSelectChange('degree_type')}
                    error={!!fieldErrors.degree_type}
                    sx={fieldErrors.degree_type ? { border: '1px solid #d32f2f' } : {}}
                  >
                    <MenuItem value="Certificate">Certificate</MenuItem>
                    <MenuItem value="Diploma">Diploma</MenuItem>
                    <MenuItem value="Associate">Associate Degree</MenuItem>
                    <MenuItem value="Bachelor">Bachelor's Degree</MenuItem>
                    <MenuItem value="Master">Master's Degree</MenuItem>
                    <MenuItem value="Doctoral">Doctoral Degree</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth required error={!!fieldErrors.department_code}>
                  <TextField
                    fullWidth
                    label="Department"
                    value={user?.department ? `${user.department.name} (${user.department.code})` : ''}
                    disabled
                    helperText="Degrees are automatically assigned to your department"
                    variant="filled"
                  />
                </FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    required
                    fullWidth
                    label="Duration (Years)"
                    type="number"
                    value={form.duration_years}
                    onChange={handleInputChange('duration_years')}
                    error={!!fieldErrors.duration_years}
                    helperText={fieldErrors.duration_years ? fieldErrors.duration_years : "1+ years"}
                    slotProps={{ 
                      htmlInput: { min: 1, max: 10 }
                    }}
                  />
                  <TextField
                    required
                    fullWidth
                    label="Total Credits"
                    type="number"
                    value={form.total_credits}
                    onChange={handleInputChange('total_credits')}
                    error={!!fieldErrors.total_credits}
                    helperText={fieldErrors.total_credits ? fieldErrors.total_credits : "1+ credits"}
                    slotProps={{ 
                      htmlInput: { min: 1, max: 300 }
                    }}
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const currentValue = Number((value as any).count) || 0;
                            const newValue = Math.max(0, currentValue - 1);
                            setForm((prev: any) => ({
                              ...prev,
                              courses_per_semester: {
                                ...prev.courses_per_semester,
                                [semester]: {
                                  ...(value as { count: string | number; enrollment_start: string; enrollment_end: string }),
                                  count: String(newValue)
                                }
                              }
                            }));
                          }}
                          disabled={Number((value as any).count) <= 0}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <TextField
                          label="Courses"
                          type="number"
                          value={String((value as { count: string | number; enrollment_start: string; enrollment_end: string }).count)}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const numValue = Number(inputValue);
                            
                            // Prevent negative values
                            if (inputValue !== '' && (numValue < 0 || !Number.isInteger(numValue))) {
                              return; // Don't update if negative or not an integer
                            }
                            
                            setForm((prev: any) => ({
                              ...prev,
                              courses_per_semester: {
                                ...prev.courses_per_semester,
                                [semester]: {
                                  ...(value as { count: string | number; enrollment_start: string; enrollment_end: string }),
                                  count: inputValue
                                }
                              }
                            }));
                          }}
                          slotProps={{ 
                            htmlInput: { min: 0, step: 1 } 
                          }}
                          sx={{ width: 100 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            const currentValue = Number((value as any).count) || 0;
                            const newValue = currentValue + 1;
                            setForm((prev: any) => ({
                              ...prev,
                              courses_per_semester: {
                                ...prev.courses_per_semester,
                                [semester]: {
                                  ...(value as { count: string | number; enrollment_start: string; enrollment_end: string }),
                                  count: String(newValue)
                                }
                              }
                            }));
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
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
                        slotProps={{ 
                          inputLabel: { shrink: true }
                        }}
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
                        slotProps={{ 
                          inputLabel: { shrink: true }
                        }}
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
                  error={!!fieldErrors.description}
                  helperText={fieldErrors.description ? fieldErrors.description : "Comprehensive overview of the degree program"}
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
            </>
          )}
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
