import { useEffect } from 'react';
import { applyBrowserSpecificStyles, addResponsiveClasses, detectBrowser } from '../utils/browserCompatibility';

export const useBrowserCompatibility = () => {
  useEffect(() => {
    // Apply browser-specific styles on mount
    applyBrowserSpecificStyles();
    
    // Add responsive classes to elements
    const addClasses = () => {
      addResponsiveClasses();
    };
    
    // Apply classes after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addClasses);
    } else {
      addClasses();
    }
    
    // Re-apply classes when new content is added
    const observer = new MutationObserver(() => {
      addClasses();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Font loading detection
    if (document.fonts) {
      document.fonts.ready.then(() => {
        document.body.classList.add('font-loaded');
        document.body.classList.remove('font-loading');
      });
    }
    
    return () => {
      document.removeEventListener('DOMContentLoaded', addClasses);
      observer.disconnect();
    };
  }, []);
  
  return {
    browser: detectBrowser()
  };
};