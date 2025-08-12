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
} from '@mui/material';
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

  const [form, setForm] = useState<DegreeForm>({
    name: '',
    code: '',
    description: '',
    duration_years: 4,
    department_id: '',
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
    if (!form.name || !form.code || !form.department_id) {
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
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Degree</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            required
            fullWidth
            label="Degree Name"
            value={form.name}
            onChange={handleInputChange('name')}
            placeholder="e.g., Bachelor of Computer Science"
          />
          
          <TextField
            required
            fullWidth
            label="Degree Code"
            value={form.code}
            onChange={handleInputChange('code')}
            inputProps={{ style: { textTransform: 'uppercase' } }}
            placeholder="e.g., BCS"
          />

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
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={form.description}
            onChange={handleInputChange('description')}
            placeholder="Brief description of the degree program"
          />
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
