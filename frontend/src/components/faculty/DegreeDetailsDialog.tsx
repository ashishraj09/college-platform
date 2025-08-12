import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import {
  School as SchoolIcon,
  Business as DepartmentIcon,
  Schedule as DurationIcon,
} from '@mui/icons-material';

interface DegreeDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  degree: any | null;
  onEdit?: () => void;
  onDelete?: () => void;
}

const DegreeDetailsDialog: React.FC<DegreeDetailsDialogProps> = ({
  open,
  onClose,
  degree,
  onEdit,
  onDelete,
}) => {
  if (!degree) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'submitted': return 'warning';
      case 'rejected': return 'error';
      case 'active': return 'primary';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'submitted': return 'Submitted for Approval';
      case 'approved': return 'Approved';
      case 'active': return 'Active';
      case 'archived': return 'Archived';
      default: return status;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="degree-details-title"
    >
      <DialogTitle id="degree-details-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Degree Program Details</Typography>
          <Chip
            label={getStatusText(degree.status)}
            color={getStatusColor(degree.status) as any}
            size="small"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Basic Information */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
              <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Basic Information
            </Typography>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={2}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Degree Name</Typography>
                <Typography variant="body1">{degree.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Degree Code</Typography>
                <Typography variant="body1">{degree.code}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Duration</Typography>
                <Typography variant="body1">{degree.duration_years} years</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Typography variant="body1">{getStatusText(degree.status)}</Typography>
              </Box>
            </Box>
            
            {degree.description && (
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Description</Typography>
                <Typography variant="body2">{degree.description}</Typography>
              </Box>
            )}
          </Paper>

          {/* Department Information */}
          {degree.department && (
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                <DepartmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Department Information
              </Typography>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Department</Typography>
                <Typography variant="body2">
                  {degree.department.name} ({degree.department.code})
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Timestamps */}
          <Box>
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="textSecondary">
                Created: {new Date(degree.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Updated: {new Date(degree.updatedAt).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        {degree.status === 'draft' && onEdit && (
          <Button onClick={onEdit} color="primary">
            Edit Degree
          </Button>
        )}
        {degree.status === 'draft' && onDelete && (
          <Button onClick={onDelete} color="error">
            Delete Degree
          </Button>
        )}
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DegreeDetailsDialog;
