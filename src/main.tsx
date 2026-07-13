import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyBrowserSpecificStyles, ensureFontLoaded } from './utils/browserCompatibility';

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
  createRoot(rootElement).render(
    <App />
  );
}

// Ensure fonts are loaded in background
ensureFontLoaded().catch(err => {
  console.warn("[Main] Aviso de fontes:", err);
});
