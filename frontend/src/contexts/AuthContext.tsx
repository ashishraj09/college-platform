import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setUser, logout, setLoading, setError, getUserEffectiveRole } from '../store/slices/authSlice';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  effectiveRole: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const { user, loading, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const effectiveRole = getUserEffectiveRole(user);

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
    // Try to get user profile on initial load
    authAPI.getProfile()
      .then(profile => {
        if (profile && profile.id) {
          dispatch(setUser(profile));
        } else {
          // If profile has no ID, treat as not authenticated
          dispatch(logout());
        }
      })
      .catch(err => {
        // Not authenticated or error fetching profile
        console.error('Failed to refresh user profile:', err);
        dispatch(logout());
      })
      .finally(() => {
        dispatch(setLoading(false));
      });
  }, [dispatch]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout: logoutUser,
    loading,
    effectiveRole
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
