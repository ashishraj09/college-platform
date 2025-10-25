import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAppDispatch } from '../hooks/redux';
import { setUser } from '../store/slices/authSlice';
import { authAPI } from '../services/api';

const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login(data);
      if (response.error) {
        setError(response.error);
        setLoading(false);
        return;
      }
      
      const profile = await authAPI.getProfile();
      if (profile.error) {
        setError(profile.error);
        setLoading(false);
        return;
      }
      
    const userObj = profile.user ? profile.user : profile;
    dispatch(setUser(userObj));
  const dashboardRoute = getDashboardRoute(userObj.user_type, userObj.is_head_of_department);
  router.push(dashboardRoute);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getDashboardRoute = (userType: string, isHOD: any = false): string => {
    if (userType === 'faculty' && (isHOD === true || isHOD === 'true' || isHOD === 1)) {
      return '/hod';
    }
    switch (userType) {
      case 'admin':
        return '/admin';
      case 'faculty':
        return '/faculty';
      case 'office':
        return '/office';
      case 'student':
        return '/student';
      default:
        return '/';
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Card 
          sx={{ 
            width: '100%', 
            maxWidth: 400,
            boxShadow: 3,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={4}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  mb: 3 
                }}
              >
                <Image
                  src="/static/college-logo.png"
                  alt="College Logo"
                  width={120}
                  height={120}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </Box>
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                College Platform
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in to your account
              </Typography>
            </Box>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Email Address"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    sx={{ mb: 2 }}
                  />
                )}
              />
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={togglePasswordVisibility}
                            edge="end"
                            aria-label="toggle password visibility"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 3 }}
                  />
                )}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading ? (
                  <>
                    <Box component="span" display="flex" alignItems="center">
                      <Box component="span" mr={1} display="inline-flex">
                        <Box 
                          component="span" 
                          sx={{ 
                            width: 20, 
                            height: 20, 
                            borderRadius: '50%', 
                            border: '2px solid currentColor',
                            borderTopColor: 'transparent',
                            animation: 'spin 1s linear infinite',
                            display: 'inline-block',
                            '@keyframes spin': {
                              '0%': { transform: 'rotate(0deg)' },
                              '100%': { transform: 'rotate(360deg)' }
                            }
                          }}
                        />
                      </Box>
                      Signing in...
                    </Box>
                  </>
                ) : 'Sign In'}
              </Button>
              <Box textAlign="center">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => router.push('/forgot-password')}
                >
                  Forgot your password?
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

// Ensure login page is not wrapped in DashboardLayout
// @ts-expect-error: Next.js custom property
LoginPage.getLayout = (page: React.ReactNode) => page;
export default LoginPage;
