import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
} from '@mui/material';
import { departmentsAPI } from '../../services/api';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(() => import('../../components/common/RichTextEditor'), { ssr: false });

interface CreateDepartmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateDepartmentDialog: React.FC<CreateDepartmentDialogProps> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await departmentsAPI.createDepartment({
        name: formData.name,
        description: formData.description,
        code: formData.code.toUpperCase(),
      });
      
      onSuccess();
      onClose();
      setFormData({
        name: '',
        description: '',
        code: '',
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Department</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Department Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            margin="normal"
            required
            placeholder="e.g., Computer Science"
          />

          <TextField
            fullWidth
            label="Department Code"
            value={formData.code}
            onChange={(e) => handleChange('code', e.target.value)}
            margin="normal"
            required
            placeholder="e.g., CS"
            helperText="Short code for the department (will be converted to uppercase)"
          />

          <Box sx={{ mt: 1 }}>
            <RichTextEditor
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              height={160}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Department'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateDepartmentDialog;
