
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

  const isApprovedOrActive = ['approved', 'active'].includes(entity.status);
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

        {isApprovedOrActive && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              🔄 <strong>Creating New Version</strong>
            </Typography>
            <Typography variant="body2" mb={2}>
              Since this {label.toLowerCase()} is {entity.status}, editing it will create a new version that follows the complete approval workflow:
            </Typography>
            <Box component="ol" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2">
                <strong>Current version</strong> remains {entity.status} and continues to be available
              </Typography>
              <Typography component="li" variant="body2">
                <strong>New version {entity.version + 1}</strong> will be created in draft status
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
              Since this {label.toLowerCase()} is in {entity.status} status, you can edit it directly without creating a new version.
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
          {loading ? 'Processing...' : isApprovedOrActive ? `Create Version ${entity.version + 1}` : `Edit ${label}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditEntityConfirmationDialog;
