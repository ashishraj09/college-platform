import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress ResizeObserver loop completed with undelivered notifications error
// This is a known issue with Material-UI components and doesn't affect functionality
const resizeObserverErrorFilter = (error: ErrorEvent) => {
  if (error.message && error.message.includes('ResizeObserver loop completed with undelivered notifications')) {
    return true; // Suppress this specific error
  }
  return false;
};

window.addEventListener('error', (event) => {
  if (resizeObserverErrorFilter(event)) {
    event.preventDefault();
    event.stopPropagation();
  }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
