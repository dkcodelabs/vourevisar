# Correção do Reset Contínuo do Progresso Diário

## Problema Identificado
O sistema estava detectando incorretamente "novo ciclo" e resetando o progresso diário continuamente, causando:
1. Progresso mostrando "0 de 2 matérias" em vez do valor correto
2. Componente não expandindo para mostrar mensagens de meta concluída
3. Loop de reset automático impedindo a contabilização correta das sessões

## Causa Raiz
A condição `(cycleAgeDays <= 1)` na detecção de novo ciclo estava sempre sendo verdadeira para ciclos do mesmo dia, forçando reset contínuo.

## Correções Implementadas

### 1. Correção da Lógica de Detecção de Novo Ciclo
**Arquivo:** `src/hooks/useDailyStudyProgress.tsx`

**Antes:**
```typescript
const isNewCycle = (
  // Caso 1: Ciclo muito recente (pode ser novo)
  (cycleAgeDays <= 1) ||
  // Caso 2: Nunca foi resetado
  (!lastResetDate) ||
  // Caso 3: Ciclo muito antigo sem progresso (backup)
  (cycleAgeDays > 3 && bankDataIsEmpty)
);
```

**Depois:**
```typescript
const isNewCycle = (
  // Caso 1: Nunca foi resetado (primeiro uso)
  (!lastResetDate) ||
  // Caso 2: Ciclo muito antigo sem progresso (backup)
  (cycleAgeDays > 3 && bankDataIsEmpty) ||
  // Caso 3: Ciclo iniciado hoje E sem dados no banco E nunca teve progresso
  (cycleAgeDays === 0 && bankDataIsEmpty && currentStudiedCount === 0)
);
```

### 2. Correção da Expansão do Componente
**Arquivo:** `src/components/study-cycle/DailyStudyProgress.tsx`

**Antes:**
```typescript
if (resetReason === 'new_cycle' || 
    resetReason === 'new_day' || 
    dailyProgress.progressPercentage >= 100) {
```

**Depois:**
```typescript
if (resetReason === 'new_cycle' || 
    resetReason === 'new_day' || 
    (dailyProgress.progressPercentage >= 100 && resetReason === 'continue')) {
```

### 3. Adição de Listener para Meta Atingida
Adicionado um `useEffect` que escuta o evento `dailyProgressUpdated` e expande o componente quando a meta é atingida durante o uso normal.

## Scripts de Correção

### 1. Debug do Estado Atual
Execute `debug-progresso-atual.sql` para verificar o estado dos dados.

### 2. Correção dos Dados
Execute `fix-deteccao-novo-ciclo.sql` para corrigir os dados existentes.

## Comportamento Esperado Após Correção

1. **Primeira sessão do dia:** Progresso vai de "0 de 2" para "1 de 2"
2. **Segunda sessão do dia:** Progresso vai de "1 de 2" para "2 de 2" e componente expande automaticamente
3. **Componente expandido:** Mostra mensagem "Meta diária concluída!" por 5 segundos
4. **Próximo dia:** Reset automático apenas se meta foi cumprida no dia anterior
5. **Novo ciclo real:** Reset automático apenas quando realmente há um novo ciclo

## Teste de Validação

1. Execute os scripts SQL de correção
2. Recarregue a aplicação
3. Complete uma sessão de estudo
4. Verifique se progresso mostra "1 de 2 matérias"
5. Complete segunda sessão
6. Verifique se progresso mostra "2 de 2 matérias" e componente expande
7. Verifique se mensagem "Meta diária concluída!" aparece

## Logs de Debug
Os logs agora mostram claramente:
- `🔍 Detecção de novo ciclo CORRIGIDA:` com condições detalhadas
- `🔄 Primeira sessão concluída - mudando resetReason para continue`
- `📊 Progresso carregado:` com valores corretos