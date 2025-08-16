import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, TextField, Box } from '@mui/material';

interface SubmitForApprovalDialogProps {
  open: boolean;
  title?: string;
  messageLabel?: string;
  messageRequired?: boolean;
  messageValue: string;
  onMessageChange: (msg: string) => void;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  children?: React.ReactNode;
}

const SubmitForApprovalDialog: React.FC<SubmitForApprovalDialogProps> = ({
  open,
  title = 'Submit for Approval',
  messageLabel = 'Message (Optional)',
  messageRequired = false,
  messageValue,
  onMessageChange,
  loading = false,
  onCancel,
  onSubmit,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  children,
}) => (
  <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      {children}
      <Typography variant="body1" sx={{ mb: 2 }}>
        {messageRequired
          ? 'Please enter a message to send with your submission. This will help reviewers understand your intent and any important details.'
          : 'You may enter a message to help reviewers understand your submission (optional).'}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label={messageLabel}
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          value={messageValue}
          onChange={e => onMessageChange(e.target.value)}
          required={messageRequired}
          placeholder={messageRequired ? 'Enter your message here...' : 'Add any additional information or special requests...'}
        />
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
      <Button
        variant="contained"
        disabled={loading || (messageRequired && !messageValue.trim())}
        onClick={onSubmit}
      >
        {submitLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default SubmitForApprovalDialog;
