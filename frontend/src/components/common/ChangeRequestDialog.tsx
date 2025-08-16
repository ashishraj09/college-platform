import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, TextField, Box } from '@mui/material';

interface ChangeRequestDialogProps {
  open: boolean;
  title?: string;
  feedbackLabel?: string;
  feedbackRequired?: boolean;
  feedbackValue: string;
  onFeedbackChange: (msg: string) => void;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  minLength?: number;
  maxLength?: number;
  children?: React.ReactNode;
}

const ChangeRequestDialog: React.FC<ChangeRequestDialogProps> = ({
  open,
  title = 'Request Changes',
  feedbackLabel = 'Change Request (Required)',
  feedbackRequired = true,
  feedbackValue,
  onFeedbackChange,
  loading = false,
  onCancel,
  onSubmit,
  submitLabel = 'Send Request',
  cancelLabel = 'Cancel',
  minLength = 10,
  maxLength = 500,
  children,
}) => {
  const trimmed = feedbackValue.trim();
  const error = feedbackRequired && (trimmed.length < minLength || trimmed.length > maxLength);
  const helperText =
    !feedbackRequired
      ? `${trimmed.length}/${maxLength} characters`
      : trimmed.length < minLength && trimmed.length > 0
      ? `Minimum ${minLength} characters required (${trimmed.length}/${minLength})`
      : `${trimmed.length}/${maxLength} characters - Please provide clear feedback for the requester`;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {children}
        <Typography variant="body1" sx={{ mb: 2 }}>
          Please provide specific feedback or requested changes. This will help the submitter improve their submission.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={feedbackLabel}
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={feedbackValue}
            onChange={e => onFeedbackChange(e.target.value)}
            required={feedbackRequired}
            error={error}
            helperText={helperText}
            inputProps={{ maxLength }}
            placeholder="Describe the requested changes or feedback..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button
          variant="contained"
          color="error"
          disabled={loading || error}
          onClick={onSubmit}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangeRequestDialog;
