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
  let user = null;
  let tokens = null;
  let isAuthenticated = false;
  try {
    const savedUser = localStorage.getItem('user');
    const savedTokens = localStorage.getItem('tokens');
    if (savedUser && savedTokens) {
      user = JSON.parse(savedUser);
      tokens = JSON.parse(savedTokens);
      isAuthenticated = true;
    }
  } catch (e) {
    // ignore
  }
  return {
    user,
    tokens,
    isAuthenticated,
    loading: false,
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
      const savedTokens = localStorage.getItem('tokens');
      const savedUser = localStorage.getItem('user');
      if (savedTokens && savedUser) {
        try {
          state.tokens = JSON.parse(savedTokens);
          state.user = JSON.parse(savedUser);
          state.isAuthenticated = true;
        } catch (error) {
          localStorage.removeItem('tokens');
          localStorage.removeItem('user');
          state.tokens = null;
          state.user = null;
          state.isAuthenticated = false;
        }
      } else {
        state.tokens = null;
        state.user = null;
        state.isAuthenticated = false;
      }
    },
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem('tokens', JSON.stringify(action.payload));
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('tokens');
      localStorage.removeItem('user');
    },
  },
});

export const { 
  clearError, 
  initializeAuth, 
  setTokens, 
  setUser, 
  setLoading, 
  setError, 
  logout 
} = authSlice.actions;

export default authSlice.reducer;
