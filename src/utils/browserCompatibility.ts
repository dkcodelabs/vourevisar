/**
 * Browser compatibility utilities for consistent rendering
 */

export const detectBrowser = () => {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    return 'chrome';
  } else if (userAgent.includes('Firefox')) {
    return 'firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'safari';
  } else if (userAgent.includes('Edg')) {
    return 'edge';
  } else if (userAgent.includes('Trident') || userAgent.includes('MSIE')) {
    return 'ie';
  }
  
  return 'unknown';
};

export const applyBrowserSpecificStyles = () => {
  const browser = detectBrowser();
  const body = document.body;
  
  // Remove existing browser classes
  body.classList.remove('browser-chrome', 'browser-firefox', 'browser-safari', 'browser-edge', 'browser-ie');
  
  // Add browser-specific class
  body.classList.add(`browser-${browser}`);
  
  // Apply browser-specific font fixes
  const style = document.createElement('style');
  
  switch (browser) {
    case 'edge':
      style.textContent = `
        * {
          font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }
        
        .title-card, .title-section, .title-page {
          font-weight: 700 !important;
          letter-spacing: -0.025em !important;
        }
      `;
      break;
      
    case 'firefox':
      style.textContent = `
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          -moz-osx-font-smoothing: grayscale !important;
        }
      `;
      break;
      
    case 'safari':
      style.textContent = `
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          -webkit-font-smoothing: antialiased !important;
        }
      `;
      break;
      
    default:
      style.textContent = `
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }
      `;
  }
  
  document.head.appendChild(style);
};

export const ensureFontLoaded = () => {
  return new Promise<void>((resolve) => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        // Force re-render after fonts are loaded
        document.body.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        resolve();
      });
    } else {
      // Fallback for older browsers
      setTimeout(() => {
        document.body.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        resolve();
      }, 100);
    }
  });
};

export const addResponsiveClasses = () => {
  const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div');
  
  elements.forEach(element => {
    if (!element.className.includes('title-') && !element.className.includes('text-')) {
      element.classList.add('font-consistent');
    }
  });
};