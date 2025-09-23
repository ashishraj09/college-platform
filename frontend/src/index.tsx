import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress ResizeObserver loop completed with undelivered notifications error
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('ResizeObserver loop completed with undelivered notifications')) {
    // console.log('ResizeObserver warning intercepted:', {
    //   message: event.message,
    //   filename: event.filename,
    //   lineno: event.lineno,
    //   colno: event.colno,
    //   error: event.error,
    //   stack: event.error?.stack
    // });
    event.preventDefault();
    event.stopPropagation();
  } else {
    console.log('Other error captured:', event);
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
