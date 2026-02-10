# Contrato de Evento de Erro

**Status:** Congelado ❄️
**Data:** 10/02/2026
**Source of Truth:** `src/lib/errors/errorEvent.contract.ts`

Este documento define o contrato canônico para eventos de erro no sistema. Todos os módulos (Admin e Core) devem aderir a esta estrutura para garantir observabilidade consistente e evitar deriva de schema.

## 1. Definições Principais

### Escopos (Scopes)
- **`core`**: Erros originados nos fluxos principais do usuário (Estudo, Revisão, Matérias).
- **`admin`**: Erros originados no painel administrativo.

### Severidade
- **`low`**: Avisos, UX degradada mas funcional (ex: falha em carregar avatar).
- **`medium`**: Falha em ação específica, recuperável (ex: falha ao salvar matéria).
- **`high`**: Falha impeditiva de fluxo, contornável (ex: login falhou, mas retry funciona).
- **`critical`**: Sistema indisponível ou perda de dados (ex: banco fora do ar).

## 2. Estrutura do Evento (Payload)
Este é o formato persistido no banco de dados (`admin_error_events`) e trafegado via logs.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `error_id` | `string` | **Sim** | Identificador único (ex: `ERR-20260210-9X21`). |
| `scope` | `'admin' \| 'core'` | **Sim** | Origem do erro. Default: `core`. |
| `module` | `string` | **Sim** | Nome do módulo (ex: `Subjects`, `Auth`). |
| `action` | `string` | **Sim** | Ação sendo executada (ex: `createSubject`). |
| `severity` | `enum` | **Sim** | Nível de severidade. Default: `medium`. |
| `user_message` | `string` | **Sim** | Mensagem amigável para o usuário final. |
| `technical_message` | `string` | **Sim** | Detalhes técnicos para debugging. |
| `metadata` | `object` | **Sim** | Dados contextuais (sanitizados). Default: `{}`. |
| `status` | `enum` | **Sim** | Estado do incidente (`new`, `resolved`, etc). |

## 3. Uso do ErrorService

### Interface de Entrada (`ErrorReportInput`)
Utilize esta estrutura ao chamar `errorService.report()`.

```typescript
interface ErrorReportInput {
  module: string;
  action: string;
  userMessage?: string; // Opcional (gerado auto se omitido)
  severity?: 'low' | 'medium' | 'high' | 'critical';
  scope?: 'admin' | 'core';
  metadata?: Record<string, unknown>;
  originalError?: any;
}
```

### Exemplo de Uso (Core)
```typescript
try {
  await createSubject(data);
} catch (error) {
  await errorService.report(error, {
    module: 'Subjects',
    action: 'createSubject',
    userMessage: 'Não foi possível salvar a matéria.',
    severity: 'medium',
    scope: 'core',
    metadata: { subjectName: data.name }
  });
}
```

### Exemplo de Uso (Admin)
```typescript
await errorService.report(error, {
  module: 'UserManagement',
  action: 'promoteUser',
  userMessage: 'Erro ao promover usuário.',
  severity: 'high',
  scope: 'admin',
  userId: targetUserId
});
```

### Anti-Padrão (Payload Inválido)
🚫 **Não fazer:**
```typescript
// Faltam campos obrigatórios (module, action)
errorService.report(error, { 
  userMessage: 'Erro genérico' 
});
```
O sistema irá interceptar payloads inválidos, aplicar defaults (`unknown_module`, `medium` severity) e logar um aviso no console.
