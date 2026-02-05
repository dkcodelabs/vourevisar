
# Plano: Correção do Conflito de Versões React no esm.sh

## Problema Identificado

Os logs mostram claramente o erro:
```
Error: Objects are not valid as a React child (found: object with keys {$$typeof, type, key, ref, props, _owner})
    at a (https://esm.sh/react@19.3.0-canary-fd524fe0-20251121/es2022/react.mjs:2:3624)
```

O esm.sh está carregando **React 19 (canary)** como dependência transitiva do `@react-email/components`, enquanto nosso código importa **React 18.3.1**. Isso causa incompatibilidade na renderização dos componentes.

---

## Solução

Usar o recurso de **pinning de dependências** do esm.sh com o parâmetro `?deps=react@18.3.1` para forçar todas as dependências a usarem a mesma versão do React.

---

## Alterações Necessárias

### 1. Edge Function - index.ts

```typescript
// Linha 1 - Manter
import * as React from 'https://esm.sh/react@18.3.1'

// Linha 4 - Adicionar deps para pinear React
import { renderAsync } from 'https://esm.sh/@react-email/render@0.0.12?deps=react@18.3.1'
```

### 2. Todos os 4 Templates (_templates/*.tsx)

Cada template precisa adicionar o parâmetro `?deps=react@18.3.1`:

```typescript
// Linha 1 - Manter igual
import * as React from 'https://esm.sh/react@18.3.1'

// Linha 2-14 - Adicionar ?deps=react@18.3.1
import {
  Body,
  Button,
  Container,
  // ... outros componentes
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `send-auth-email/index.ts` | Adicionar `?deps=react@18.3.1` no import do `@react-email/render` |
| `_templates/confirmation.tsx` | Adicionar `?deps=react@18.3.1` no import do `@react-email/components` |
| `_templates/recovery.tsx` | Adicionar `?deps=react@18.3.1` no import do `@react-email/components` |
| `_templates/magic-link.tsx` | Adicionar `?deps=react@18.3.1` no import do `@react-email/components` |
| `_templates/email-change.tsx` | Adicionar `?deps=react@18.3.1` no import do `@react-email/components` |

---

## Seção Técnica

### Por que isso acontece?

O esm.sh resolve automaticamente dependências transitivas. Quando você importa `@react-email/components`, ele também importa suas dependências (incluindo React). Por padrão, o esm.sh pode resolver para a versão mais recente do React (19 canary neste caso).

### Como o parâmetro deps funciona

O parâmetro `?deps=react@18.3.1` instrui o esm.sh a:
1. Usar React 18.3.1 como dependência do pacote
2. Garantir que todos os componentes sejam renderizados com a mesma versão do React
3. Evitar conflitos de "multiple React instances"

### Exemplo completo de import corrigido

```typescript
import * as React from 'https://esm.sh/react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'
```

---

## Após Implementação

1. Reimplantar a Edge Function `send-auth-email`
2. Testar novamente o fluxo de recuperação de senha
3. Os emails devem ser enviados corretamente
