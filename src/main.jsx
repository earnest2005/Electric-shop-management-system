import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register PWA Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('⚡ PWA Service Worker registered successfully:', reg.scope))
      .catch((err) => console.warn('PWA Service Worker registration error:', err));
  });
}

// Cloudflare Pages Fresh Build Deployment Trigger: 2026-07-29T13:52:00+05:30

