import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  Tabs,
  Tab,
  Typography,
} from '@mui/material';
import { DEGREE_STATUS_OPTIONS } from '../../constants/degreeStatus';
import { School as SchoolIcon } from '@mui/icons-material';
import { degreesAPI } from '../../services/api';

interface DegreeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
  mode?: 'create' | 'edit';
}

const defaultForm = {
  name: '',
  code: '',
  description: '',
  duration_years: 4,
  department_id: '',
  degree_type: 'Bachelor',
  total_credits: 120,
  courses_per_semester: {}, // { [semester: string]: { count: number, enrollment_start: string, enrollment_end: string } }
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

const DegreeDialog: React.FC<DegreeDialogProps> = ({
  open,
  onClose,
  onSuccess,
  initialData = {},
  mode = 'create',
}) => {
  const [loading, setLoading] = useState(false);
  // Removed unused departments state
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState<any>(defaultForm);
  // Helper to add a new semester
  const handleAddSemester = () => {
    const semesters = Object.keys(form.courses_per_semester).map(Number);
    const nextSemester = semesters.length > 0 ? Math.max(...semesters) + 1 : 1;
    setForm((prev: any) => ({
      ...prev,
      courses_per_semester: {
        ...prev.courses_per_semester,
        [nextSemester]: { count: '', enrollment_start: '', enrollment_end: '' }
      }
    }));
  };

  // Helper to remove a semester
  const handleRemoveSemester = (semester: string) => {
    setForm((prev: any) => {
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
      // Always set department_id to user's department
      const userDeptId = initialData?.userDepartmentId || initialData?.department_id;
      let formData = mode === 'edit' ? { ...defaultForm, ...initialData, department_id: userDeptId } : { ...defaultForm, department_id: userDeptId };
      // If editing and initialData has courses_per_semester, use it
      if (mode === 'edit' && initialData?.courses_per_semester) {
        formData.courses_per_semester = initialData.courses_per_semester;
      }
      setForm(formData);
    }
  }, [open, initialData, mode]);

  // Removed unused loadDepartments

  const handleInputChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [field]: event.target.value,
    });
    setError('');
  };

  // Removed unused handleSelectChange

  const handleSubmit = async () => {
    if (!form.name || !form.code || !form.department_id || !form.degree_type || !form.total_credits) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = { ...form };
      // Ensure courses_per_semester is included
      if (form.courses_per_semester && Object.keys(form.courses_per_semester).length > 0) {
        payload.courses_per_semester = form.courses_per_semester;
      }
      if (mode === 'edit' && initialData?.id) {
        await degreesAPI.updateDegree(initialData.id, payload);
      } else {
        await degreesAPI.createDegree(payload);
      }
      onSuccess();
      handleClose();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save degree');
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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <SchoolIcon color="primary" />
        {mode === 'edit' ? 'Edit Degree Program' : 'Create New Degree Program'}
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto', p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Basic Info" />
          <Tab label="Details" />
        </Tabs>
        <Box sx={{ p: 2, pt: 0 }}>
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Name" value={form.name} onChange={handleInputChange('name')} fullWidth required />
              <TextField label="Code" value={form.code} onChange={handleInputChange('code')} fullWidth required />
              <TextField label="Description" value={form.description} onChange={handleInputChange('description')} fullWidth multiline rows={3} />
              <TextField label="Duration (years)" type="number" value={form.duration_years} onChange={handleInputChange('duration_years')} fullWidth />
              <TextField
                label="Department"
                value={initialData?.userDepartmentName || initialData?.department_name || ''}
                fullWidth
                disabled
              />
              <TextField label="Degree Type" value={form.degree_type} onChange={handleInputChange('degree_type')} fullWidth />
              <TextField label="Total Credits" type="number" value={form.total_credits} onChange={handleInputChange('total_credits')} fullWidth />
              {/* Status dropdown for HODs only */}
              {(initialData?.is_head_of_department || initialData?.user_type === 'hod') && (
                <TextField
                  select
                  label="Status"
                  value={form.status || ''}
                  onChange={handleInputChange('status')}
                  fullWidth
                  SelectProps={{ native: true }}
                  sx={{ mt: 1 }}
                >
                  {DEGREE_STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </TextField>
              )}
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
          {mode === 'edit' ? 'Save Changes' : 'Create Degree'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DegreeDialog;
