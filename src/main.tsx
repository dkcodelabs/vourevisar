
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyBrowserSpecificStyles, ensureFontLoaded } from './utils/browserCompatibility';

console.log("[Main] Iniciando aplicação...");

// Apply browser compatibility fixes
try {
  applyBrowserSpecificStyles();
} catch (e) {
  console.error("[Main] Erro ao aplicar estilos:", e);
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("[Main] Elemento #root não encontrado!");
} else {
  console.log("[Main] Renderizando root...");
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Ensure fonts are loaded in background
ensureFontLoaded().then(() => {
  console.log("[Main] Fontes carregadas.");
}).catch(err => {
  console.warn("[Main] Aviso de fontes:", err);
});
