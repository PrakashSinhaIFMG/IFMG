import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/main.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Unregister all old service workers, then register fresh
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    Promise.all(registrations.map((reg) => reg.unregister())).then(() => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(() => console.log('SW registered'))
        .catch((err) => console.log('SW error:', err));
    });
  });
}