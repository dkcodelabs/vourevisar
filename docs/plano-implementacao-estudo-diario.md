# 📋 Plano de Implementação: Sistema "Estudo do Dia"

## 🎯 **OBJETIVO GERAL**
Implementar sistema híbrido de acompanhamento diário de estudos com:
- Sequência numerada sugerida (mas flexível)
- Tracking de sessões com horários
- Analytics e insights comportamentais
- Gamificação inteligente

## 🚀 **VERSÃO HÍBRIDA CONFIRMADA**
```
📚 Estudo do Dia: 1 de 3 matérias (33%)
▓▓▓░░░░░░ 

🎯 Sequência de hoje:
✅ #1 Matemática (15:30 - concluída)
⏳ #2 Português (próxima sugerida)  
⏸️ #3 Direito Civil (pendente)

💡 Dica: Você pode estudar fora da ordem se preferir
```

---

## 📊 **FASE 1: ESTRUTURA DE BANCO DE DADOS**

### **1.1 Nova Tabela: study_sessions**
```sql
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  subject_id UUID REFERENCES subjects(id),
  subject_name TEXT NOT NULL,
  
  -- Dados temporais
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL,
  study_date DATE NOT NULL,
  duration_minutes INTEGER,
  
  -- Contexto do estudo
  cycle_position INTEGER, -- posição no ciclo (#1, #2, #3)
  topics_studied TEXT[], -- IDs dos tópicos estudados
  topics_count INTEGER,
  
  -- Dados comportamentais
  hour_of_day INTEGER, -- 0-23 (para análise de padrões)
  day_of_week INTEGER, -- 1-7 (segunda=1, domingo=7)
  is_weekend BOOLEAN,
  
  -- Qualidade percebida (futuro)
  focus_rating INTEGER, -- 1-5 (opcional, aluno avalia)
  difficulty_rating INTEGER, -- 1-5 (opcional)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```###
 **1.2 Atualizar Tabela: user_cycles**
```sql
ALTER TABLE user_cycles ADD COLUMN IF NOT EXISTS
  materias_por_dia INTEGER DEFAULT 2,
  materias_estudadas_hoje TEXT[] DEFAULT '{}',
  data_ultimo_reset DATE DEFAULT CURRENT_DATE,
  streak_dias_consecutivos INTEGER DEFAULT 0;
```

### **1.3 Nova Tabela: user_study_analytics**
```sql
CREATE TABLE user_study_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Padrões temporais
  melhor_horario_inicio TIME,
  melhor_horario_fim TIME,
  media_sessoes_por_dia DECIMAL(3,1),
  
  -- Padrões semanais
  dias_mais_produtivos INTEGER[],
  horarios_pico INTEGER[],
  
  -- Métricas de consistência
  streak_atual INTEGER DEFAULT 0,
  maior_streak INTEGER DEFAULT 0,
  total_sessoes INTEGER DEFAULT 0,
  
  calculado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### **1.4 Índices para Performance**
```sql
CREATE INDEX idx_study_sessions_user_date ON study_sessions(user_id, study_date);
CREATE INDEX idx_study_sessions_hour ON study_sessions(user_id, hour_of_day);
CREATE INDEX idx_study_sessions_subject ON study_sessions(user_id, subject_id);
```

---

## 🎨 **FASE 2: COMPONENTES FRONTEND**

### **2.1 Componente Principal: DailyStudyProgress**
**Arquivo:** `src/components/study-cycle/DailyStudyProgress.tsx`

**Props:**
- `userCycle: UserCycle`
- `studiedToday: string[]`
- `dailyGoal: number`
- `onSubjectClick?: (subjectId: string) => void`

**Funcionalidades:**
- Mostrar progresso "X de Y matérias"
- Barra de progresso visual
- Lista de matérias com status (✅ ⏳ ⏸️)
- Horário de conclusão
- Próxima sugerida destacada### 
**2.2 Hook: useDailyStudyProgress**
**Arquivo:** `src/hooks/useDailyStudyProgress.tsx`

**Responsabilidades:**
- Carregar matérias estudadas hoje
- Calcular progresso (X/Y)
- Identificar próxima sugerida
- Resetar progresso diário
- Salvar sessão de estudo

### **2.3 Integração no StudyCycleContent**
**Arquivo:** `src/components/study-cycle/StudyCycleContent.tsx`

**Modificações:**
- Adicionar `<DailyStudyProgress />` no topo
- Integrar com `handleCompleteSession`
- Passar dados do ciclo atual

---

## ⚙️ **FASE 3: LÓGICA DE NEGÓCIO**

### **3.1 Função: saveStudySession**
```typescript
const saveStudySession = async (
  userId: string,
  subjectId: string,
  subjectName: string,
  cyclePosition: number,
  topicsStudied: string[],
  startedAt?: Date
) => {
  const completedAt = new Date();
  const studyDate = completedAt.toDateString();
  const hourOfDay = completedAt.getHours();
  const dayOfWeek = completedAt.getDay() || 7; // domingo = 7
  const isWeekend = dayOfWeek >= 6;
  
  // Calcular duração se startedAt fornecido
  const duration = startedAt 
    ? Math.round((completedAt.getTime() - startedAt.getTime()) / 60000)
    : null;

  return await supabase.from('study_sessions').insert({
    user_id: userId,
    subject_id: subjectId,
    subject_name: subjectName,
    completed_at: completedAt.toISOString(),
    study_date: studyDate,
    duration_minutes: duration,
    cycle_position: cyclePosition,
    topics_studied: topicsStudied,
    topics_count: topicsStudied.length,
    hour_of_day: hourOfDay,
    day_of_week: dayOfWeek,
    is_weekend: isWeekend
  });
};
```

### **3.2 Função: updateDailyProgress**
```typescript
const updateDailyProgress = async (userId: string, subjectId: string) => {
  // Adicionar matéria à lista de estudadas hoje
  const { data: cycle } = await supabase
    .from('user_cycles')
    .select('materias_estudadas_hoje')
    .eq('user_id', userId)
    .single();
  
  const estudadasHoje = cycle?.materias_estudadas_hoje || [];
  if (!estudadasHoje.includes(subjectId)) {
    estudadasHoje.push(subjectId);
    
    await supabase
      .from('user_cycles')
      .update({ 
        materias_estudadas_hoje: estudadasHoje,
        atualizado_em: new Date().toISOString()
      })
      .eq('user_id', userId);
  }
};
```### **3.3 
Função: resetDailyProgress**
```typescript
const resetDailyProgress = async () => {
  // Job que roda todo dia às 00:00
  const hoje = new Date().toDateString();
  
  await supabase
    .from('user_cycles')
    .update({ 
      materias_estudadas_hoje: [],
      data_ultimo_reset: hoje
    })
    .neq('data_ultimo_reset', hoje);
};
```

### **3.4 Função: getNextSuggestedSubject**
```typescript
const getNextSuggestedSubject = (
  cicloAtual: string[],
  estudadasHoje: string[]
) => {
  // Encontrar primeira matéria não estudada hoje
  for (let i = 0; i < cicloAtual.length; i++) {
    const subjectId = cicloAtual[i];
    if (!estudadasHoje.includes(subjectId)) {
      return {
        subjectId,
        position: i + 1,
        isNext: true
      };
    }
  }
  
  // Se todas foram estudadas, sugerir primeira do ciclo
  return {
    subjectId: cicloAtual[0],
    position: 1,
    isNext: false
  };
};
```

---

## 📊 **FASE 4: CONFIGURAÇÕES**

### **4.1 Configuração de Meta Diária**
**Arquivo:** `src/pages/Settings.tsx`

**Seção:** "Preferências de Estudo"
- Slider: 1-6 matérias por dia
- Valor padrão: 2
- Salvar em `user_cycles.materias_por_dia`

### **4.2 Interface de Configuração**
```tsx
<SettingsSection title="Estudo Diário">
  <div className="space-y-4">
    <div>
      <Label>Meta de matérias por dia: {metaDiaria}</Label>
      <Slider
        value={[metaDiaria]}
        onValueChange={([value]) => setMetaDiaria(value)}
        min={1}
        max={6}
        step={1}
        className="mt-2"
      />
      <p className="text-sm text-muted-foreground mt-1">
        Quantas matérias você pretende estudar por dia
      </p>
    </div>
    
    <div className="flex items-center space-x-2">
      <Switch
        checked={sugestoesAutomaticas}
        onCheckedChange={setSugestoesAutomaticas}
      />
      <Label>Receber sugestões automáticas de horário</Label>
    </div>
  </div>
</SettingsSection>
```

---

## 🔄 **FASE 5: INTEGRAÇÃO COM SISTEMA EXISTENTE**

### **5.1 Modificar handleCompleteSession**
**Arquivo:** `src/hooks/useStudyCycleData.tsx`

```typescript
const handleCompleteSession = async (subjectId: string) => {
  // 1. Lógica existente (marcar tópicos como revisados)
  // ... código atual ...
  
  // 2. NOVO: Salvar sessão de estudo
  const subject = subjects.find(s => s.id === subjectId);
  const cyclePosition = getCyclePosition(subjectId);
  const topicsStudied = Array.from(sessionMarks[subjectId] || []);
  
  await saveStudySession(
    user.id,
    subjectId,
    subject.name,
    cyclePosition,
    topicsStudied
  );
  
  // 3. NOVO: Atualizar progresso diário
  await updateDailyProgress(user.id, subjectId);
  
  // 4. Disparar eventos de atualização
  window.dispatchEvent(new CustomEvent('dailyProgressUpdated'));
};
```---

## 📈
 **FASE 6: ANALYTICS E INSIGHTS (FUTURO)**

### **6.1 Página Estatísticas**
**Arquivo:** `src/pages/Statistics.tsx`

**Seções:**
- Visão Geral (métricas do mês)
- Padrões Temporais (melhores horários)
- Performance por Matéria
- Evolução Temporal

### **6.2 Widgets no Dashboard**
**Arquivo:** `src/pages/Dashboard.tsx`

**Novos widgets:**
- Insight do Dia
- Streak Atual
- Próxima Sugestão
- Progresso Semanal

### **6.3 Análises Automáticas**
**Job diário para calcular:**
- Melhores horários de estudo
- Dias mais produtivos
- Streaks e consistência
- Sugestões personalizadas

---

## ✅ **CHECKLIST DE IMPLEMENTAÇÃO**

### **FASE 1: Banco de Dados**
- [ ] Criar migration para `study_sessions`
- [ ] Atualizar `user_cycles` com novos campos
- [ ] Criar `user_study_analytics`
- [ ] Adicionar índices de performance
- [ ] Testar queries básicas

### **FASE 2: Componentes**
- [ ] Criar `DailyStudyProgress.tsx`
- [ ] Criar `useDailyStudyProgress.tsx`
- [ ] Integrar no `StudyCycleContent.tsx`
- [ ] Testar interface visual

### **FASE 3: Lógica**
- [ ] Implementar `saveStudySession`
- [ ] Implementar `updateDailyProgress`
- [ ] Implementar `resetDailyProgress`
- [ ] Implementar `getNextSuggestedSubject`
- [ ] Testar fluxo completo

### **FASE 4: Configurações**
- [ ] Adicionar seção em Settings
- [ ] Implementar slider de meta diária
- [ ] Salvar/carregar configurações
- [ ] Testar persistência

### **FASE 5: Integração**
- [ ] Modificar `handleCompleteSession`
- [ ] Testar com sistema existente
- [ ] Verificar compatibilidade
- [ ] Ajustar eventos e atualizações

### **FASE 6: Analytics (Futuro)**
- [ ] Criar página Statistics
- [ ] Implementar widgets Dashboard
- [ ] Criar jobs de análise
- [ ] Implementar sugestões IA

---

## 🎯 **PRIORIDADES DE IMPLEMENTAÇÃO**

### **ALTA PRIORIDADE (Implementar primeiro):**
1. ✅ Estrutura de banco (Fase 1)
2. ✅ Componente DailyStudyProgress (Fase 2)
3. ✅ Lógica de sessões (Fase 3)
4. ✅ Integração com sistema atual (Fase 5)

### **MÉDIA PRIORIDADE:**
5. ⏳ Configurações de meta (Fase 4)
6. ⏳ Testes e ajustes

### **BAIXA PRIORIDADE (Futuro):**
7. 📊 Analytics completos (Fase 6)
8. 🤖 IA e sugestões avançadas

---

## 📝 **NOTAS IMPORTANTES**

- **Flexibilidade:** Sistema deve sugerir, nunca obrigar
- **Performance:** Queries otimizadas com índices
- **UX:** Interface limpa e intuitiva
- **Compatibilidade:** Não quebrar funcionalidades existentes
- **Escalabilidade:** Preparado para futuras melhorias

**Status:** 📋 Planejamento completo - Pronto para implementação