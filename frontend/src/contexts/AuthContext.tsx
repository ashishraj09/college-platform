import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setUser, logout, setLoading, setError } from '../store/slices/authSlice';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const { user, loading, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));
      await authAPI.login({ email, password });
      // After login, fetch user profile
      const profile = await authAPI.getProfile();
      dispatch(setUser(profile));
    } catch (error) {
      console.error('Login error:', error);
      dispatch(setError('Login failed'));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const logoutUser = async (): Promise<void> => {
    try {
      // Call backend logout API first
      await authAPI.logout();
      // Then clear local state
      dispatch(logout());
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if API call fails
      dispatch(logout());
    }
  };

  // Fetch latest user profile on page refresh
  useEffect(() => {
    if (isAuthenticated) {
      authAPI.getProfile()
        .then(profile => {
          dispatch(setUser(profile));
        })
        .catch(err => {
          console.error('Failed to refresh user profile:', err);
        });
    }
  }, [isAuthenticated, dispatch]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout: logoutUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
