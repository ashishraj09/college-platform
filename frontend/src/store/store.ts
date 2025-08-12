import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import courseReducer from './slices/courseSlice';
import departmentReducer from './slices/departmentSlice';
import degreeReducer from './slices/degreeSlice';
import enrollmentReducer from './slices/enrollmentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    courses: courseReducer,
    departments: departmentReducer,
    degrees: degreeReducer,
    enrollments: enrollmentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
