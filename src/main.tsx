import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyBrowserSpecificStyles, ensureFontLoaded } from './utils/browserCompatibility';

// A tab can keep an older Vite entrypoint while a new deployment removes its
// hashed chunks. Reload once when Vite reports that stale-chunk condition so a
// user does not get a blank screen after a deploy.
const staleChunkReloadKey = 'vourevisar:stale-chunk-reload-at';
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();

  const now = Date.now();
  const lastReload = Number(sessionStorage.getItem(staleChunkReloadKey) || 0);
  if (!lastReload || now - lastReload > 30_000) {
    sessionStorage.setItem(staleChunkReloadKey, String(now));
    window.location.reload();
    return;
  }

  console.error('[Main] O deploy atual nao conseguiu carregar um modulo atualizado.', event);
});

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
