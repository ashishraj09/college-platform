
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

interface Entity {
  id: string;
  name: string;
  code: string;
  version_code?: string;
  version: number;
  status: string;
  entityType: 'course' | 'degree';
}

interface EditEntityConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  entity: Entity | null;
  loading: boolean;
}

const EditEntityConfirmationDialog: React.FC<EditEntityConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  entity,
  loading,
}) => {
  if (!entity) return null;

  const isApproved = entity.status === 'approved';
  const isActive = entity.status === 'active';
  const label = entity.entityType === 'course' ? 'Course' : 'Degree';

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          📝 Edit {label} Version
          <Chip 
            label={`v${entity.version}`} 
            size="small" 
            color="primary" 
            variant="outlined" 
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <Typography variant="h6" gutterBottom>
            {entity.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {label} Code: {entity.code}{entity.version > 1 ? ` (v${entity.version})` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            Current Status: <Chip label={entity.status} size="small" color="info" />
          </Typography>
        </Box>


        {isApproved && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              This {label.toLowerCase()} is <strong>approved</strong>.<br />
              Are you sure you want to modify it? This will set its status to <strong>draft</strong> and require re-approval.
            </Typography>
          </Alert>
        )}

        {!isApproved && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              ✏️ <strong>Direct Edit</strong>
            </Typography>
            <Typography variant="body2">
              Since this {label.toLowerCase()} is in {entity.status} status, you can edit it directly.
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
          {loading ? 'Processing...' : isApproved ? `Modify Approved ${label}` : `Edit ${label}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditEntityConfirmationDialog;
