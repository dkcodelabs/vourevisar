
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyBrowserSpecificStyles, ensureFontLoaded } from './utils/browserCompatibility';

// Apply browser compatibility fixes
applyBrowserSpecificStyles();

// Ensure fonts are loaded before rendering
ensureFontLoaded().then(() => {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
