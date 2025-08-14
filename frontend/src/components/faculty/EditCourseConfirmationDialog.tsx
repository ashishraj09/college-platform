import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
} from '@mui/material';

interface Course {
  id: string;
  name: string;
  code: string; // Base course code (e.g., "76Y67Y767")
  version_code?: string; // Virtual field for display - versioned code (e.g., "76Y67Y767_V2")
  version: number;
  status: string;
}

interface EditCourseConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  course: Course | null;
  loading: boolean;
}

const EditCourseConfirmationDialog: React.FC<EditCourseConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  course,
  loading,
}) => {
  if (!course) return null;

  const isApprovedOrActive = ['approved', 'active'].includes(course.status);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          📝 Edit Course Version
          <Chip 
            label={`v${course.version}`} 
            size="small" 
            color="primary" 
            variant="outlined" 
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box mb={2}>
          <Typography variant="h6" gutterBottom>
            {course.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Course Code: {course.code}{course.version > 1 ? ` (v${course.version})` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            Current Status: <Chip label={course.status} size="small" color="info" />
          </Typography>
        </Box>

        {isApprovedOrActive && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              🔄 <strong>Creating New Version</strong>
            </Typography>
            <Typography variant="body2" mb={2}>
              Since this course is {course.status}, editing it will create a new version that follows the complete approval workflow:
            </Typography>
            <Box component="ol" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2">
                <strong>Current version</strong> remains {course.status} and continues to be available
              </Typography>
              <Typography component="li" variant="body2">
                <strong>New version {course.version + 1}</strong> will be created in draft status
              </Typography>
              <Typography component="li" variant="body2">
                You can edit the new version and submit it for approval
              </Typography>
              <Typography component="li" variant="body2">
                Once approved and published, the new version becomes active and the old version is archived
              </Typography>
            </Box>
          </Alert>
        )}

        {!isApprovedOrActive && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              ✏️ <strong>Direct Edit</strong>
            </Typography>
            <Typography variant="body2">
              Since this course is in {course.status} status, you can edit it directly without creating a new version.
            </Typography>
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary">
          Do you want to continue?
        </Typography>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Processing...' : isApprovedOrActive ? `Create Version ${course.version + 1}` : 'Edit Course'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditCourseConfirmationDialog;
