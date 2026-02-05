
# Plano: Correção do Domínio de Email e Erros de Build

## Problemas Identificados

| Problema | Local | Causa |
|----------|-------|-------|
| Domínio errado | `index.ts` linha 218 | Usa `vourevisarbrasil.com.br` em vez de `vourevisar.com.br` |
| Erro de import npm: | `index.ts` linha 4 | Deno não consegue resolver `npm:@react-email/components` |
| Erro de import npm: | Todos os 4 templates | Mesmo problema de import |
| Erro de tipo TS | `RevisoesChartsWrapper.tsx` | `RevisionItem[]` não tem `first_studied_at` |

---

## Alterações Necessárias

### 1. Edge Function - index.ts

**Linha 4**: Trocar import do `renderAsync`
```typescript
// De:
import { renderAsync } from 'npm:@react-email/components@0.0.22'

// Para:
import { renderAsync } from 'https://esm.sh/@react-email/render@0.0.12'
```

**Linha 218**: Corrigir domínio do remetente
```typescript
// De:
from: 'vouRevisar <noreply@vourevisarbrasil.com.br>',

// Para:
from: 'vouRevisar <noreply@vourevisar.com.br>',
```

### 2. Template confirmation.tsx

**Linhas 1-14**: Atualizar imports para esm.sh
```typescript
// De:
import { Body, Button, ... } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

// Para:
import * as React from 'https://esm.sh/react@18.3.1'
import { Body, Button, ... } from 'https://esm.sh/@react-email/components@0.0.22'
```

### 3. Template recovery.tsx

Mesma alteração de imports (linhas 1-14)

### 4. Template magic-link.tsx

Mesma alteração de imports (linhas 1-14)

### 5. Template email-change.tsx

Mesma alteração de imports (linhas 1-14)

### 6. RevisoesChartsWrapper.tsx

**Linha 76**: Fazer cast para o tipo esperado pelo componente

O componente `ReviewsTrendChart` espera um array com objetos que tenham `first_studied_at`. O `RevisionItem` não tem essa propriedade, mas os dados reais vêm do banco e contêm esse campo.

```typescript
// De:
<ReviewsTrendChart topics={topics} reviewData={reviewData || []} viewMode={trendViewMode} />

// Para:
<ReviewsTrendChart 
  topics={topics as unknown as Array<{ first_studied_at: string | null; [key: string]: any }>} 
  reviewData={reviewData || []} 
  viewMode={trendViewMode} 
/>
```

---

## Resumo das Correções

| Arquivo | Linha(s) | Alteração |
|---------|----------|-----------|
| `send-auth-email/index.ts` | 4 | Import `renderAsync` via esm.sh |
| `send-auth-email/index.ts` | 218 | Domínio corrigido para `vourevisar.com.br` |
| `_templates/confirmation.tsx` | 1-14 | Imports via esm.sh |
| `_templates/recovery.tsx` | 1-14 | Imports via esm.sh |
| `_templates/magic-link.tsx` | 1-14 | Imports via esm.sh |
| `_templates/email-change.tsx` | 1-14 | Imports via esm.sh |
| `RevisoesChartsWrapper.tsx` | 76 | Cast de tipo para compatibilidade |

---

## Seção Técnica

### Por que usar esm.sh em vez de npm:

O Deno Edge Functions tem dificuldade em resolver pacotes `npm:` que não estão no `deno.json`. O esm.sh é um CDN que converte pacotes npm para ESM, funcionando perfeitamente no ambiente Deno sem configuração adicional.

### Ordem dos imports em esm.sh

É importante que o React seja importado antes dos componentes que o usam:
```typescript
import * as React from 'https://esm.sh/react@18.3.1'
import { ... } from 'https://esm.sh/@react-email/components@0.0.22'
```

### Após implementação

Será necessário reimplantar a Edge Function para aplicar as correções.
