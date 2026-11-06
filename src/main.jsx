import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#FFFFFF',
          color: '#101828',
          border: '1px solid #EAECF0',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -4px rgba(16,24,40,0.1), 0 4px 6px -2px rgba(16,24,40,0.05)',
          fontSize: '13px',
          fontWeight: 500,
          padding: '10px 14px',
          fontFamily: "'Inter', system-ui, sans-serif"
        },
        success: {
          iconTheme: { primary: '#0F766E', secondary: '#F0FDFA' },
          style: {
            borderLeft: '4px solid #0F766E'
          }
        },
        error: {
          iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' },
          style: {
            borderLeft: '4px solid #DC2626'
          }
        },
      }}
    />
  </React.StrictMode>
);
