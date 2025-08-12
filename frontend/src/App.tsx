import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { store } from './store/store';
import { theme } from './theme/theme';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { SnackbarProvider, closeSnackbar } from 'notistack';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider 
          maxSnack={3}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          autoHideDuration={6000}
          preventDuplicate
          dense
          action={(key) => (
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={() => closeSnackbar(key)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        >
          <AuthProvider>
            <Router>
              <div className="App">
                <AppRoutes />
              </div>
            </Router>
          </AuthProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
