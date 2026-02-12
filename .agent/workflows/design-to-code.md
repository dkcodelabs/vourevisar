---
description: Como converter HTML de referência (docs/design/) em componentes React no app
---

# Design-to-Code: Regras Obrigatórias

## Contexto Crítico
O app tem `design-system.css` com `body { font-family: 'Plus Jakarta Sans' !important }`.
Os HTMLs de referência em `docs/design/` usam Tailwind CDN isolado com fonte Lexend.
**Os mesmos valores em pixels renderizam DIFERENTE no app vs no HTML de referência.**

## Checklist Obrigatório

### 1. NÃO copie pixels do HTML de referência diretamente
- Os `text-xl` (20px), `text-lg` (18px) etc. do HTML de referência renderizam em contexto isolado
- No app real, com Plus Jakarta Sans + resets globais, eles ficam visualmente maiores

### 2. SEMPRE compare com componentes vizinhos primeiro
- Antes de definir font-sizes, inspecione os componentes vizinhos no browser (ex: StudentHubPanel)
- Use `window.getComputedStyle(el).fontSize` para ver os tamanhos reais renderizados
- Alinhe os tamanhos do novo componente com os existentes

### 3. Para usar fonte diferente da global (Lexend), use `<style>` com `!important`
- Inline styles NÃO vencem `!important` no body (herança CSS)
- Injete `<style>` com classes scoped (prefixo `fbm-`, `xyz-` etc.) com `!important`
- Exemplo:
```tsx
<style>{`
  .meu-componente,
  .meu-componente * {
    font-family: 'Lexend', sans-serif !important;
  }
`}</style>
```

### 4. Escala de referência do Student Hub (padrão atual)
| Elemento           | Tamanho |
|--------------------|---------|
| Título principal   | 14-16px |
| Subtítulos         | 12-13px |
| Texto corpo        | 11-12px |
| Texto pequeno      | 9-10px  |
| Tabs/botões        | 12px    |

### 5. Sempre validar visualmente no browser ANTES de reportar como pronto
- Abrir o componente no browser
- Comparar lado a lado com componentes vizinhos
- Confirmar que os tamanhos estão proporcionais
