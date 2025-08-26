# Padronização de Fontes - Projeto Principal

## Fonte Principal (Aplicada em todo o site)
```css
font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
```

## Nomes das Matérias
```css
/* Para o modo claro (light mode) */
.subject-title {
  font-size: 0.85rem; /* 20px, ou 1.125rem (18px) na visualização de lista */
  line-height: 1rem; /* 28px */
  font-weight: 700; /* bold */
  color: rgb(24 30 27); /* #18181b */
}

/* Para o modo escuro (dark mode) */
.dark .subject-title {
  color: rgb(244 244 245); /* #f4f4f5 */
}
```

## Nomes dos Tópicos
```css
/* O tamanho e o peso são herdados da fonte principal */

/* Para o modo claro (light mode) */
.topic-name {
  font-size: 1rem; /* 16px (padrão) */
  font-weight: 400; /* normal (padrão) */
  color: rgb(39 39 42); /* #27272a */
}

/* Para o modo escuro (dark mode) */
.dark .topic-name {
  color: rgb(228 228 231); /* #e4e4e7 */
}
```

## Resumo das Especificações

### Matérias
- **Fonte:** Sistema (ui-sans-serif, system-ui, sans-serif)
- **Tamanho:** 18px (1.125rem)
- **Peso:** Negrito (700)
- **Cor:** Cinza bem escura (#18181b no claro, #f4f4f5 no escuro)

### Tópicos
- **Fonte:** Sistema (ui-sans-serif, system-ui, sans-serif)
- **Tamanho:** 16px (1rem)
- **Peso:** Normal (400)
- **Cor:** Cinza escura (#27272a no claro, #e4e4e7 no escuro)

## Implementação

### 1. Configuração Base (tailwind.config.ts)
```typescript
fontFamily: {
  sans: [
    'ui-sans-serif', 
    'system-ui', 
    'sans-serif', 
    '"Apple Color Emoji"', 
    '"Segoe UI Emoji"', 
    '"Segoe UI Symbol"', 
    '"Noto Color Emoji"'
  ],
}
```

### 2. Aplicação Global (src/index.css)
```css
body {
  @apply bg-background text-foreground font-sans;
}
```

### 3. Componentes
Todos os componentes devem usar as classes Tailwind padronizadas:
- `font-sans` para fonte base
- `text-xl font-bold text-zinc-900 dark:text-zinc-100` para títulos de matérias
- `text-zinc-800 dark:text-zinc-200` para nomes de tópicos

## Resolução de Problemas de Sessão

Para evitar problemas de "Session Too Long", certifique-se de que:

1. **Consistência de Fontes:** Todos os componentes usam `font-sans`
2. **Renderização Otimizada:** Evite re-renderizações desnecessárias com fontes inconsistentes
3. **Carregamento de Fontes:** Use fontes do sistema para carregamento instantâneo
4. **Compatibilidade:** A pilha de fontes garante compatibilidade cross-browser

## Verificação

Para verificar se a padronização está correta:

1. Inspecione elementos no navegador
2. Confirme que `font-family` mostra a pilha correta
3. Verifique se não há fontes customizadas sendo carregadas desnecessariamente
4. Teste em diferentes navegadores e sistemas operacionais