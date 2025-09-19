import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: 'student' | 'faculty' | 'office' | 'admin';
  student_id?: string;
  employee_id?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  department?: {
    id: string;
    name: string;
    code: string;
  };
  degree?: {
    id: string;
    name: string;
    code: string;
  };
  is_head_of_department?: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function to determine user's effective role
export const getUserEffectiveRole = (user: User | null): string => {
  if (!user) return '';
  
  // If the user is faculty and is HOD, their effective role is 'hod'
  if (user.user_type === 'faculty' && user.is_head_of_department === true) {
    return 'hod';
  }
  
  // Otherwise, return their regular user_type
  return user.user_type;
};

export interface AuthTokens {
  access: string;
  refresh: string;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const getInitialAuthState = (): AuthState => {
  return {
    user: null,
    tokens: null,
    isAuthenticated: false,
    loading: true, // Start with loading true to prevent immediate redirects
    error: null,
  };
};

const initialState: AuthState = getInitialAuthState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    initializeAuth: (state) => {
      // With cookie-based auth, we don't need to manually restore tokens
      // We'll make an API call to check if the user is authenticated
      state.loading = true;
    },
  // Removed setTokens reducer for cookie-based authentication
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
});

export const { 
  clearError, 
  initializeAuth, 
  setUser, 
  setLoading, 
  setError, 
  logout 
} = authSlice.actions;

export default authSlice.reducer;
