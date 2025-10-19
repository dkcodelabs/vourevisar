/**
 * HTML Sanitization Utilities
 * 
 * SECURITY NOTE: This file provides utilities for sanitizing HTML content
 * if it ever needs to be rendered outside of ReactQuill or React components.
 * 
 * Currently, all rich text content is displayed only through ReactQuill,
 * which provides built-in XSS protection. These utilities are provided
 * as a defensive measure for future use cases.
 */

/**
 * Basic HTML sanitization using browser's DOMParser
 * For production use, consider using DOMPurify library for more robust sanitization
 * 
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export const sanitizeHtml = (html: string): string => {
  // Create a temporary DOM element
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  // Remove potentially dangerous elements
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'link', 'style'];
  dangerousTags.forEach(tag => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach(el => el.remove());
  });
  
  // Remove event handlers
  const allElements = doc.body.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove all event handler attributes (onclick, onload, etc.)
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
    
    // Remove javascript: protocol from href and src
    ['href', 'src'].forEach(attr => {
      const value = el.getAttribute(attr);
      if (value && value.toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr);
      }
    });
  });
  
  return doc.body.innerHTML;
};

/**
 * Strip all HTML tags, returning only text content
 * Useful when you need plain text version of rich content
 * 
 * @param html - HTML string to convert to plain text
 * @returns Plain text without HTML tags
 */
export const stripHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};
