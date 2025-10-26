import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(() => import('../common/RichTextEditor'), { ssr: false });
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
  faculty_details?: string;
}

const CreateDegreeDialog: React.FC<CreateDegreeDialogProps> = ({
  open,
  onClose,
  onSuccess,
  mode,
  degree,
}) => {
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  // Config-driven validation for all fields (including rich text)
  const fieldValidationConfig: { [key: string]: { required?: boolean; minLength?: number; pattern?: RegExp; message?: string } } = {
  name: { required: true, minLength: 3, message: 'Degree name is required' },
    code: { required: true, minLength: 2, pattern: /^[A-Z0-9-]+$/, message: 'Degree code is required (uppercase letters, numbers, hyphens allowed)' },
    department_code: { required: true, message: 'Department selection is required' },
    degree_type: { required: true, message: 'Degree type is required' },
    total_credits: { required: true, message: 'Total credits must be at least 1' },
    duration_years: { required: true, message: 'Duration must be at least 1 year' },
    description: { required: true, minLength: 10, message: 'Description is required' },
    specializations: { required: true, minLength: 5, message: 'Specializations are required' },
    career_prospects: { required: true, minLength: 5, message: 'Career prospects are required' },
    accreditation: { required: true, minLength: 5, message: 'Accreditation is required' },
    learning_outcomes: { required: true, minLength: 5, message: 'Learning outcomes are required' },
    assessment_methods: { required: true, minLength: 5, message: 'Assessment methods are required' },
    contact_information: { required: true, minLength: 5, message: 'Contact information is required' },
    admission_requirements: { required: true, minLength: 5, message: 'Admission requirements are required' },
    entry_requirements: { required: true, minLength: 5, message: 'Entry requirements are required' },
    fees: { required: true, minLength: 1, message: 'Fees are required' },
    application_deadlines: { required: true, minLength: 5, message: 'Application deadlines are required' },
    application_process: { required: true, minLength: 5, message: 'Application process is required' },
  };

  const validateField = (field: string, value: any): string | undefined => {
    const config = fieldValidationConfig[field];
    if (!config) return undefined;
    if (config.required && (
      value === undefined || value === null || (typeof value === 'string' ? value.trim().length === 0 : false)
    )) return config.message || 'This field is required';
    if (config.minLength && typeof value === 'string' && value.trim().length < config.minLength) return config.message || `Minimum ${config.minLength} characters required`;
    if (config.pattern && typeof value === 'string' && value && !config.pattern.test(value.trim())) {
      return 'Only uppercase letters, numbers, and hyphens allowed';
    }
    if (field === 'total_credits' && (isNaN(Number(value)) || Number(value) < 1)) return config.message;
    if (field === 'duration_years' && (isNaN(Number(value)) || Number(value) < 1)) return config.message;
    return undefined;
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
    faculty_details: '',
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
    event: { target: { value: string } } | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    // Support both standard and RichTextEditor event shape
    const value = (event as any).target?.value;
    setForm((prev: DegreeForm) => ({ ...prev, [field]: value }));
    updateFieldError(field, value);
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

    // Validate all fields in config
    let hasError = false;
    const newErrors: { [key: string]: string } = {};
    Object.keys(fieldValidationConfig).forEach(field => {
      const error = validateField(field, form[field]);
      if (error) {
        newErrors[field] = error;
        hasError = true;
      }
    });
    // Validate at least one semester
    let semesterError = '';
    if (!form.courses_per_semester || Object.keys(form.courses_per_semester).length === 0) {
      semesterError = 'At least one semester must be added to Courses Per Semester.';
      setActiveTab(0);
    }
    setFieldErrors(newErrors);
    if (hasError || semesterError) {
      setError('Please correct the errors before submitting');
      // Tab switching logic: find which tab has the first error
      const tab0Fields = ['name', 'code', 'department_code', 'degree_type', 'total_credits', 'duration_years', 'description'];
      const tab1Fields = ['specializations', 'career_prospects', 'accreditation', 'study_mode', 'learning_outcomes', 'assessment_methods', 'contact_information', 'application_process'];
      const tab2Fields = ['admission_requirements', 'entry_requirements', 'fees', 'location', 'application_deadlines'];
      if (tab0Fields.some(f => newErrors[f]) || semesterError) {
        setActiveTab(0);
      } else if (tab1Fields.some(f => newErrors[f])) {
        setActiveTab(1);
      } else if (tab2Fields.some(f => newErrors[f])) {
        setActiveTab(2);
      }
      // Add semester error to fieldErrors for display
      setFieldErrors(prev => ({ ...prev, _semester: semesterError }));
      return;
    }

    setLoading(true);
    setError('');

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

    let result;
    if (mode === 'edit' && degree && degree.id) {
      result = await degreesAPI.updateDegree(degree.id, payload);
      if (result.error) {
        enqueueSnackbar(result.error, { variant: 'error' });
        setError(result.error);
        setLoading(false);
        return;
      }
      enqueueSnackbar('Degree updated successfully!', { variant: 'success' });
    } else {
      result = await degreesAPI.createDegree(payload);
      if (result.error) {
        enqueueSnackbar(result.error, { variant: 'error' });
        setError(result.error);
        setLoading(false);
        return;
      }
      enqueueSnackbar('Degree created successfully!', { variant: 'success' });
    }
    onSuccess();
    handleClose();
    setLoading(false);
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
        <DialogContent dividers sx={{ height: '70vh', overflowY: 'auto', p: 0 }}>
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
                          <li key={field}>{field === '_semester' ? msg : msg}</li>
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
                    <RichTextEditor
                      label="Program Description"
                      value={form.description}
                      onChange={handleInputChange('description')}
                      width={"100%"}
                      height={120}
                      error={fieldErrors.description}
                    />
                  </Box>
                )}
            {activeTab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <RichTextEditor label="Specializations" value={form.specializations} onChange={handleInputChange('specializations')} width={"100%"} height={120} error={fieldErrors.specializations} />
                </Box>
                <Box>
                  <RichTextEditor label="Career Prospects" value={form.career_prospects} onChange={handleInputChange('career_prospects')} width={"100%"} height={120} error={fieldErrors.career_prospects} />
                </Box>
                <Box>
                  <RichTextEditor label="Accreditation" value={form.accreditation} onChange={handleInputChange('accreditation')} width={"100%"} height={120} error={fieldErrors.accreditation} />
                </Box>
                <Box>
                  <RichTextEditor label="Learning Outcomes" value={form.learning_outcomes} onChange={handleInputChange('learning_outcomes')} width={"100%"} height={120} error={fieldErrors.learning_outcomes} />
                </Box>
                <Box>
                  <RichTextEditor label="Assessment Methods" value={form.assessment_methods} onChange={handleInputChange('assessment_methods')} width={"100%"} height={120} error={fieldErrors.assessment_methods} />
                </Box>
                <Box>
                  <RichTextEditor label="Contact Information" value={form.contact_information} onChange={handleInputChange('contact_information')} width={"100%"} height={120} error={fieldErrors.contact_information} />
                </Box>
                <Box>
                  <RichTextEditor label="Faculty Details" value={form.faculty_details} onChange={handleInputChange('faculty_details')} width={"100%"} height={120} error={fieldErrors.faculty_details} />
                </Box>
              </Box>
            )}
            {/* Tab 2: Admission & Fees */}
            {activeTab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <RichTextEditor label="Admission Requirements" value={form.admission_requirements} onChange={handleInputChange('admission_requirements')} width={"100%"} height={120} error={fieldErrors.admission_requirements} />
                </Box>
                <Box>
                  <RichTextEditor label="Entry Requirements" value={form.entry_requirements} onChange={handleInputChange('entry_requirements')} width={"100%"} height={120} error={fieldErrors.entry_requirements} />
                </Box>
                <Box>
                  <RichTextEditor label="Fees" value={form.fees} onChange={handleInputChange('fees')} width={"100%"} height={120} error={fieldErrors.fees} />
                </Box>
                <Box>
                  <RichTextEditor label="Application Deadlines" value={form.application_deadlines} onChange={handleInputChange('application_deadlines')} width={"100%"} height={120} error={fieldErrors.application_deadlines} />
                </Box>
                <Box>
                  <RichTextEditor label="Application Process" value={form.application_process} onChange={handleInputChange('application_process')} width={"100%"} height={120} error={fieldErrors.application_process} />
                </Box>
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
