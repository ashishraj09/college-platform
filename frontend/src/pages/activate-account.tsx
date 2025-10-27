import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { authAPI } from '../services/api';
import { useRouter } from 'next/router';

interface PasswordForm {
  password: string;
  confirmPassword: string;
}

const ActivateAccountPage: React.FC = () => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<PasswordForm>({
    password: '',
    confirmPassword: '',
  });

  const token = router.query.token as string | undefined;
  const isPasswordReset = router.pathname === '/reset-password';

  useEffect(() => {
    if (!token) {
      const message = isPasswordReset 
        ? 'Invalid password reset link. Please request a new password reset.' 
        : 'Invalid activation link. Please contact your administrator.';
      setError(message);
    }
  }, [token, isPasswordReset]);

  const handleInputChange = (field: keyof PasswordForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({
      ...form,
      [field]: event.target.value,
    });
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!token) {
      const message = isPasswordReset 
        ? 'Invalid password reset link. Please request a new password reset.' 
        : 'Invalid activation link. Please contact your administrator.';
      setError(message);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.resetPassword({
        token,
        password: form.password,
      });

      const successMessage = isPasswordReset 
        ? 'Password reset successfully! You can now log in with your new password.'
        : 'Account activated successfully! You can now log in.';
      
      enqueueSnackbar(successMessage, { 
        variant: 'success',
        persist: false
      });
      
      // Redirect to login page
  router.push('/login');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 
        (isPasswordReset ? 'Failed to reset password. Please try again.' : 'Failed to activate account. Please try again.');
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        persist: true
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              Invalid Activation Link
            </Typography>
            <Alert severity="error" sx={{ mb: 2 }}>
              The activation link is invalid or missing. Please contact your administrator for assistance.
            </Alert>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => router.push('/login')}
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            {isPasswordReset ? 'Reset Your Password' : 'Activate Your Account'}
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" gutterBottom>
            {isPasswordReset 
              ? 'Please enter your new password below.' 
              : 'Please set your password to activate your account.'
            }
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              required
              fullWidth
              name="password"
              label="New Password"
              type="password"
              id="password"
              autoComplete="new-password"
              margin="normal"
              value={form.password}
              onChange={handleInputChange('password')}
              helperText="Password must be at least 6 characters long"
            />
            <TextField
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              margin="normal"
              value={form.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || !form.password || !form.confirmPassword}
            >
              {loading ? <CircularProgress size={24} /> : (isPasswordReset ? 'Reset Password' : 'Activate Account')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ActivateAccountPage;
