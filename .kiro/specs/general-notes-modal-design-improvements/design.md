# Design Document

## Overview

Este documento detalha o design técnico para implementar melhorias visuais abrangentes no GeneralNotesModal, focando na correção de problemas identificados nas bordas do ReactQuill, consistência dos botões, suporte adequado ao modo escuro e harmonia visual geral. A solução utiliza CSS customizado com variáveis CSS para suporte a temas, mantendo compatibilidade com o sistema de design existente baseado em Tailwind CSS.

## Architecture

### Current State Analysis

O GeneralNotesModal atual possui:
- ReactQuill integrado com estilos inline no componente
- Sistema de temas baseado em CSS variables (--background, --foreground, etc.)
- Botões usando componentes UI do shadcn/ui
- Estilos CSS inline dentro de uma tag `<style>` no componente

### Proposed Architecture

1. **CSS Module Approach**: Extrair estilos inline para um arquivo CSS dedicado
2. **Theme-Aware Variables**: Utilizar variáveis CSS que respondem automaticamente ao tema
3. **Component Styling**: Aplicar classes CSS consistentes aos botões
4. **ReactQuill Customization**: Sobrescrever estilos padrão do Quill de forma controlada

## Components and Interfaces

### 1. CSS Variables System

Definir variáveis específicas para o modal que se adaptam aos temas:

```css
:root {
  /* Light theme variables */
  --modal-quill-border: hsl(var(--border));
  --modal-quill-border-focus: hsl(var(--ring));
  --modal-quill-bg: hsl(var(--background));
  --modal-quill-text: hsl(var(--foreground));
  --modal-quill-toolbar-bg: hsl(var(--muted));
  --modal-quill-scrollbar-track: hsl(var(--muted));
  --modal-quill-scrollbar-thumb: hsl(var(--muted-foreground) / 0.3);
  --modal-quill-scrollbar-thumb-hover: hsl(var(--muted-foreground) / 0.5);
  --modal-quill-fade-overlay: linear-gradient(transparent, hsl(var(--background) / 0.95));
}

.dark {
  /* Dark theme automatically inherits from CSS variables */
  --modal-quill-fade-overlay: linear-gradient(transparent, hsl(var(--background) / 0.95));
}
```

### 2. ReactQuill Styling Architecture

#### Border System
- **Unified Border Strategy**: Aplicar bordas consistentes usando `border: 1px solid var(--modal-quill-border)`
- **Focus State Management**: Controlar estados de foco sem artefatos visuais
- **Border Radius Consistency**: Manter raio de borda uniforme (6px) em toolbar e editor

#### Layout Structure
```
┌─────────────────────────────────────┐
│ .ql-toolbar (top border radius)     │ ← Toolbar com bordas superiores
├─────────────────────────────────────┤
│                                     │
│ .ql-container                       │ ← Container principal
│   └── .ql-editor                    │ ← Área de edição com scroll
│                                     │
└─────────────────────────────────────┘ ← Bordas inferiores com radius
```

### 3. Button Consistency System

#### Button Hierarchy
- **Primary Button (Salvar)**: Mantém estilo atual com `Button` padrão
- **Secondary Button (Fechar)**: Aplicar `variant="outline"` com estilos consistentes

#### Button States
```css
.modal-button-secondary {
  /* Normal state - visible styling */
  border: 1px solid var(--modal-quill-border);
  background: transparent;
  color: var(--modal-quill-text);
}

.modal-button-secondary:hover {
  /* Hover state */
  background: var(--modal-quill-toolbar-bg);
  border-color: var(--modal-quill-border-focus);
}

.modal-button-secondary:focus-visible {
  /* Focus state for accessibility */
  outline: 2px solid var(--modal-quill-border-focus);
  outline-offset: 2px;
}
```

## Data Models

### CSS Class Structure

```typescript
interface ModalStyles {
  container: string;           // .general-notes-modal
  quillWrapper: string;        // .modal-quill-wrapper
  quillToolbar: string;        // .modal-quill-toolbar
  quillContainer: string;      // .modal-quill-container
  quillEditor: string;         // .modal-quill-editor
  buttonSecondary: string;     // .modal-button-secondary
  fadeOverlay: string;         // .modal-fade-overlay
}
```

### Theme Integration

```typescript
interface ThemeAwareStyles {
  lightTheme: CSSProperties;
  darkTheme: CSSProperties;
  transitions: {
    duration: string;
    easing: string;
    properties: string[];
  };
}
```

## Error Handling

### CSS Fallbacks

1. **Variable Fallbacks**: Cada variável CSS terá fallback para cores sólidas
```css
border: 1px solid var(--modal-quill-border, #e2e8f0);
```

2. **Browser Compatibility**: Estilos alternativos para navegadores que não suportam CSS variables
```css
.modal-quill-container {
  border: 1px solid #e2e8f0; /* Fallback */
  border: 1px solid var(--modal-quill-border); /* Modern browsers */
}
```

### Theme Switching

1. **Transition Management**: Suavizar mudanças de tema com transições CSS
2. **State Preservation**: Manter estado do editor durante mudanças de tema
3. **Scroll Position**: Preservar posição de scroll ao alternar temas

## Testing Strategy

### Visual Regression Testing

1. **Theme Switching Tests**
   - Verificar aparência em modo claro
   - Verificar aparência em modo escuro
   - Testar transição entre temas

2. **Component State Tests**
   - Estados normal, hover, focus dos botões
   - Estados normal, focus, typing do editor
   - Comportamento de scroll e overflow

3. **Cross-Browser Testing**
   - Chrome/Safari (webkit scrollbars)
   - Firefox (scrollbar-width)
   - Edge compatibility

### Accessibility Testing

1. **Contrast Ratios**
   - Texto vs background ≥ 4.5:1
   - Botões vs background ≥ 3:1
   - Bordas vs background ≥ 3:1

2. **Keyboard Navigation**
   - Tab order correto
   - Focus indicators visíveis
   - Escape key functionality

3. **Screen Reader Compatibility**
   - Semantic HTML preservation
   - ARIA labels onde necessário
   - Content structure maintenance

### Implementation Testing

1. **CSS Variable Resolution**
   - Verificar se variáveis são resolvidas corretamente
   - Testar fallbacks em navegadores antigos
   - Validar herança de temas

2. **ReactQuill Integration**
   - Verificar se customizações não quebram funcionalidade
   - Testar toolbar responsiveness
   - Validar scroll behavior

3. **Performance Testing**
   - Tempo de renderização inicial
   - Performance de scroll
   - Impacto de transições CSS

## Implementation Details

### File Structure

```
src/
├── components/
│   ├── GeneralNotesModal.tsx (updated)
│   └── styles/
│       └── GeneralNotesModal.css (new)
└── styles/
    └── modal-themes.css (new - optional)
```

### CSS Organization

1. **Base Styles**: Estrutura fundamental do modal
2. **Theme Variables**: Variáveis que mudam com o tema
3. **Component Styles**: Estilos específicos de cada elemento
4. **State Styles**: Hover, focus, active states
5. **Responsive Styles**: Adaptações para diferentes tamanhos

### Integration Points

1. **Theme Context**: Integração com `useTheme()` existente
2. **Tailwind CSS**: Compatibilidade com classes utilitárias
3. **shadcn/ui**: Manutenção de compatibilidade com componentes UI
4. **ReactQuill**: Customização sem quebrar funcionalidade core

### Performance Considerations

1. **CSS Variables**: Uso eficiente para evitar recálculos desnecessários
2. **Transition Optimization**: Transições apenas em propriedades necessárias
3. **Selector Specificity**: Evitar seletores muito específicos que impactam performance
4. **Bundle Size**: Manter CSS adicional mínimo e otimizado