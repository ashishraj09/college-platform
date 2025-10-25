import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
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
  initialized: boolean;
  effectiveRole: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const { user, loading, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const effectiveRole = getUserEffectiveRole(user);
  const [initialized, setInitialized] = useState(false);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));
      
      const loginResponse = await authAPI.login({ email, password });
      if (loginResponse.error) {
        dispatch(setError(loginResponse.error));
        throw new Error(loginResponse.error);
      }
      
      // After login, fetch user profile
      const profile = await authAPI.getProfile();
      if (profile.error) {
        dispatch(setError(profile.error));
        throw new Error(profile.error);
      }
      // Normalize profile - some endpoints return { user: {...} }
      const userObj = profile.user ? profile.user : profile;
      if (userObj && userObj.id) {
        dispatch(setUser(userObj));
          setInitialized(true);
      } else {
        throw new Error('Invalid user profile returned from server');
      }
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
      setInitialized(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if API call fails
      dispatch(logout());
      setInitialized(false);
    }
  };

  // Fetch latest user profile on page refresh
  useEffect(() => {
    // If we already have a user in the store (e.g. restored from SSR or a previous action),
    // don't call the profile endpoint again. This prevents unnecessary /auth/me calls on
    // client-side navigations where AuthProvider remains mounted.
    if (user && user.id) {
      // Ensure loading is false and mark initialized
      dispatch(setLoading(false));
      setInitialized(true);
      return;
    }

    // Try to get user profile on initial load
    let mounted = true;
    authAPI.getProfile()
      .then(profile => {
        if (!mounted) return;
        console.log('AuthProvider: profile fetched', profile);
        // Some APIs return { user: {...} }, others just {...}
        const userObj = profile.user ? profile.user : profile;
        if (userObj && userObj.id) {
          console.log('AuthProvider: dispatching setUser', userObj.id);
          dispatch(setUser(userObj));
        } else {
          // If profile has no ID, treat as not authenticated
          console.log('AuthProvider: no user id in profile, logging out');
          dispatch(logout());
        }
      })
      .catch(err => {
        if (!mounted) return;
        // Not authenticated or error fetching profile
        console.error('Failed to refresh user profile:', err);
        dispatch(logout());
      })
      .finally(() => {
        if (!mounted) return;
        console.log('AuthProvider: finished profile refresh - setting loading=false');
        dispatch(setLoading(false));
        setInitialized(true);
      });
    return () => { mounted = false; };
  }, [dispatch, user]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout: logoutUser,
    loading,
    initialized,
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
