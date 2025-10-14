# Correção: Problema "Meta diária concluída!" em Novo Ciclo

## Problema Identificado
Mesmo com um ciclo novo, a página continuava mostrando a mensagem "Meta diária concluída!" como se o usuário tivesse concluído as matérias do dia.

## Causa Raiz
A lógica de detecção de novo ciclo no frontend estava inadequada:
- Só considerava "novo ciclo" se o ciclo fosse antigo (>3 dias) E os dados estivessem vazios
- Não detectava corretamente ciclos iniciados recentemente
- Não resetava adequadamente quando um novo ciclo era criado

## Correções Aplicadas

### 1. Frontend (`useDailyStudyProgress.tsx`)
**Melhorias na detecção de novo ciclo:**
```typescript
// ANTES: Lógica inadequada
const isNewCycle = bankDataIsEmpty && cycleIsOld;

// DEPOIS: Lógica corrigida
const isNewCycle = (
  // Caso 1: Ciclo iniciado hoje ou ontem sem progresso
  (cycleAgeDays <= 1 && bankDataIsEmpty) ||
  // Caso 2: Nunca foi resetado
  (!lastResetDate) ||
  // Caso 3: Ciclo muito antigo sem progresso (backup)
  (cycleAgeDays > 3 && bankDataIsEmpty)
);
```

**Melhorias no sistema de eventos:**
- Substituído `window.location.reload()` por `loadDailyProgress()`
- Adicionado listener para evento `cycleUpdated`
- Melhor logging para debug

### 2. Scripts SQL de Correção

#### `fix-meta-diaria-simples.sql`
Correção imediata que reseta o progresso diário para:
- Ciclos que nunca foram resetados
- Novo dia + meta já cumprida
- Ciclos iniciados recentemente sem progresso
- Ciclos muito antigos sem progresso

#### `fix-meta-diaria-novo-ciclo.sql`
Solução mais robusta com:
- Função `should_reset_daily_progress()` para detecção inteligente
- Função `apply_intelligent_daily_reset()` para aplicar correções
- Lógica mais precisa para diferentes cenários

#### `debug-meta-diaria-problema.sql`
Script de diagnóstico para identificar:
- Estado atual dos ciclos
- Sessões de estudo do dia
- Possíveis inconsistências nos dados

## Como Aplicar a Correção

### Passo 1: Correção Imediata no Banco
```sql
-- Execute o script simples para correção imediata
\i fix-meta-diaria-simples.sql
```

### Passo 2: Verificar Resultado
```sql
-- Execute o script de debug para verificar
\i debug-meta-diaria-problema.sql
```

### Passo 3: Frontend
As correções no frontend já foram aplicadas automaticamente.

## Regras de Reset Implementadas

1. **Novo Ciclo**: Sempre reseta (ciclo ≤ 1 dia + sem progresso)
2. **Novo Dia + Meta Cumprida**: Reseta para novo dia
3. **Novo Dia + Meta Não Cumprida**: Continua progresso
4. **Mesmo Dia**: Mantém estado atual
5. **Nunca Resetado**: Força reset inicial

## Prevenção de Problemas Futuros

- Melhor logging para debug
- Detecção mais precisa de novos ciclos
- Sistema de eventos mais eficiente
- Funções SQL robustas para casos edge

## Teste da Correção

1. Execute o script SQL de correção
2. Recarregue a página do ciclo
3. Verifique se a mensagem "Meta diária concluída!" desapareceu
4. Confirme que o progresso está zerado para novo ciclo