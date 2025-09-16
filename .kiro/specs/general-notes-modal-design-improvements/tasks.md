# Implementation Plan

- [ ] 1. Create CSS variables system for modal theming
  - Define CSS variables in index.css for modal-specific styling
  - Create variables for borders, backgrounds, text colors, and scrollbars
  - Ensure variables automatically adapt to light/dark themes
  - _Requirements: 3.1, 3.2, 4.1, 5.2_

- [ ] 2. Create dedicated CSS file for GeneralNotesModal styles
  - Extract inline styles from GeneralNotesModal.tsx to separate CSS file
  - Organize CSS into logical sections (base, theme, components, states)
  - Implement proper CSS class structure for maintainability
  - _Requirements: 5.1, 5.3, 5.4_

- [ ] 3. Implement consistent ReactQuill border system
  - Remove default Quill borders and apply custom unified borders
  - Fix border inconsistencies (faded bottom, disappearing left, blue top artifacts)
  - Ensure borders maintain consistency across all states (normal, focus, hover)
  - Apply consistent border radius to toolbar and editor container
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4. Fix ReactQuill focus states and visual artifacts
  - Eliminate unwanted blue line appearing on top when focused
  - Prevent border fading and disappearing effects
  - Implement clean focus indicators without visual artifacts
  - Maintain proper focus behavior for accessibility
  - _Requirements: 1.2, 1.3, 1.4_

- [ ] 5. Implement consistent button styling system
  - Style the "Fechar" button with proper normal state appearance
  - Create consistent hover and focus states for both buttons
  - Establish clear visual hierarchy (Save = primary, Close = secondary)
  - Ensure buttons follow the same design system patterns
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 6. Implement dark mode support for ReactQuill
  - Ensure text has adequate contrast in dark mode
  - Adapt background colors appropriately for dark theme
  - Make borders visible and well-defined in dark mode
  - Style toolbar with appropriate dark mode colors
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 7. Implement dark mode support for scrollbars
  - Style webkit scrollbars for dark mode compatibility
  - Ensure scrollbar visibility in both light and dark themes
  - Apply consistent scrollbar styling across the modal
  - _Requirements: 3.1, 3.3_

- [ ] 8. Create smooth theme transition system
  - Implement CSS transitions for theme switching
  - Ensure smooth color transitions when toggling between light/dark
  - Maintain editor state and scroll position during theme changes
  - _Requirements: 3.5, 4.4_

- [ ] 9. Implement visual consistency improvements
  - Apply harmonious color palette across all modal elements
  - Ensure consistent spacing between all elements
  - Standardize border colors, thickness, and radius throughout
  - Create clear visual feedback for all interactive states
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 10. Update GeneralNotesModal component integration
  - Remove inline styles from the React component
  - Import and apply the new CSS classes
  - Update button components to use consistent styling
  - Ensure proper CSS class application to ReactQuill wrapper
  - _Requirements: 5.1, 5.4_

- [ ] 11. Add CSS fallbacks and browser compatibility
  - Implement fallback colors for browsers without CSS variable support
  - Add vendor prefixes where necessary for cross-browser compatibility
  - Test and fix any browser-specific styling issues
  - _Requirements: 5.5_

- [ ] 12. Create comprehensive test coverage for styling
  - Write tests to verify correct CSS class application
  - Test theme switching functionality and visual consistency
  - Verify button states and ReactQuill styling in both themes
  - Ensure accessibility standards are maintained (contrast ratios, focus indicators)
  - _Requirements: 1.5, 2.5, 3.5, 4.4_