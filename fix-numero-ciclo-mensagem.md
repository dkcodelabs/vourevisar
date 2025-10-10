# Correção - Número do Ciclo na Mensagem

## 🎯 **Problema Identificado:**
- **Estatísticas:** Mostravam corretamente "Ciclo #2" 
- **Mensagem:** Mostrava incorretamente "Ciclo #1"
- **Causa:** Mensagem usava dados antigos do `userCycle`

## 🔧 **Solução Implementada:**

### 1. **Passar Número Correto no Evento**
```typescript
// No useCycleStatus - evento cycleUpdated
window.dispatchEvent(new CustomEvent('cycleUpdated', {
  detail: { 
    isNewCycle: isLastActiveSubject,
    newCycleNumber: updatedCycle?.ciclos_realizados || 0, // ← NOVO
    // ... outros dados
  }
}));
```

### 2. **Capturar Número Correto no Componente**
```typescript
// No StudyCycleContent
const [newCycleNumber, setNewCycleNumber] = useState<number | null>(null);

// No evento handler
if (event.detail?.isNewCycle) {
  const cycleNumber = event.detail?.newCycleNumber || userCycle?.ciclos_realizados || 0;
  setNewCycleNumber(cycleNumber); // ← Salvar número correto
  setShowNewCycleMessage(true);
}
```

### 3. **Usar Número Correto na Mensagem**
```typescript
// Na mensagem
<p className="text-blue-600 text-sm">
  Ciclo #{newCycleNumber || userCycle?.ciclos_realizados || 0} foi iniciado com sucesso.
</p>
```

## 🎯 **Como Funciona Agora:**

### **Sequência Correta:**
1. **Usuário completa última matéria do ciclo**
2. **useCycleStatus atualiza:** `ciclos_realizados: 2`
3. **Evento é disparado com:** `newCycleNumber: 2`
4. **Mensagem mostra:** "Ciclo #2 foi iniciado"
5. **Estatísticas mostram:** "Ciclo: #2"

### **Antes vs Depois:**
- ❌ **Antes:** Estatísticas "Ciclo #2" | Mensagem "Ciclo #1"
- ✅ **Agora:** Estatísticas "Ciclo #2" | Mensagem "Ciclo #2"

## ✅ **Resultado:**
- ✅ **Sincronização perfeita** entre estatísticas e mensagem
- ✅ **Número correto** do ciclo em ambos os lugares
- ✅ **Dados atualizados** passados via evento
- ✅ **Fallback** para casos edge

## 🧪 **Como Testar:**
1. Complete um ciclo inteiro
2. Verifique que **estatísticas** e **mensagem** mostram o **mesmo número**
3. **Esperado:** Ambos mostram o novo número do ciclo (ex: #2)