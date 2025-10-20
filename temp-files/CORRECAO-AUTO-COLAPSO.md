# Correção do Auto-Colapso do Componente

## Problema
O componente "Estudo do Dia" estava mostrando a mensagem "Novo ciclo iniciado!" mas não estava recolhendo automaticamente após o tempo definido.

## Correções Implementadas

### 1. **Correção do Timer de Auto-Colapso**
**Arquivo:** `src/components/study-cycle/DailyStudyProgress.tsx`

**Antes:**
```typescript
const timer = setTimeout(() => {
  if (expandMode === 'auto') {  // ❌ Verificação problemática
    setIsExpanded(false);
    setExpandMode(null);
  }
}, collapseTime);
```

**Depois:**
```typescript
const timer = setTimeout(() => {
  setIsExpanded(false);        // ✅ Sempre colapsa
  setExpandMode(null);
  setAutoCollapseTimer(null);  // ✅ Limpa referência
}, collapseTime);
```

### 2. **Remoção de useEffect Duplicado**
Removido o segundo `useEffect` que estava duplicando a lógica de expansão e causando conflitos.

### 3. **Adição de Logs de Debug**
```typescript
console.log(`🔄 Auto-expandindo por ${collapseTime}ms devido a: ${resetReason}`);
console.log('⏰ Auto-colapsando componente');
```

### 4. **Correção da Detecção de Novo Ciclo**
**Arquivo:** `src/hooks/useDailyStudyProgress.tsx`

```typescript
const isNewCycle = (
  // Primeiro ciclo E sem progresso
  (data.ciclos_realizados === 1 && bankDataIsEmpty) ||
  // Nunca foi resetado
  (!lastResetDate) ||
  // Ciclo muito antigo sem progresso
  (cycleAgeDays > 3 && bankDataIsEmpty)
);
```

## Comportamento Esperado

### Para Novo Ciclo:
1. **Detecção:** Sistema detecta `ciclos_realizados = 1` E sem progresso
2. **Expansão:** Componente expande automaticamente
3. **Mensagem:** Mostra "Novo ciclo iniciado!" 
4. **Auto-colapso:** Recolhe após 8 segundos
5. **Logs:** 
   ```
   🔄 Auto-expandindo por 8000ms devido a: new_cycle
   ⏰ Auto-colapsando componente
   ```

### Tempos de Auto-Colapso:
- **Novo ciclo:** 8 segundos
- **Novo dia:** 6 segundos  
- **Meta atingida:** 5 segundos
- **Outros:** 4 segundos

## Script de Verificação
Execute `verificar-novo-ciclo.sql` para confirmar se o sistema deve detectar novo ciclo baseado nos dados do banco.

## Status: ✅ CORRIGIDO
- ✅ Timer de auto-colapso corrigido
- ✅ Lógica duplicada removida
- ✅ Logs de debug adicionados
- ✅ Detecção de novo ciclo baseada em dados reais do banco