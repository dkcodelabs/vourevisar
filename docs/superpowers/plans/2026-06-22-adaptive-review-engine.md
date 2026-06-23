# Motor de Revisao Adaptativa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar o fluxo ativo em quatro revisoes adaptativas, usar a data do edital como fonte correta e reparar estados inconsistentes sem inventar historico.

**Architecture:** A regra pura fica em `calculateNextReview.ts`, sem acesso ao banco. Servicos pequenos resolvem a data do edital e recalculam agendas pendentes; o hook apenas orquestra persistencia e UI. Uma migration idempotente corrige somente estados comprovadamente divergentes.

**Tech Stack:** React 18, TypeScript, Vitest, TanStack Query, Supabase/PostgreSQL.

---

### Task 1: Regra pura das quatro revisoes

**Files:**
- Create: `src/utils/calculateNextReview.test.ts`
- Modify: `src/utils/calculateNextReview.ts`

- [ ] **Step 1: Escrever testes que falham para os marcos e conclusao**

```ts
it.each([
  [0, 2, 1],
  [1, 2, 7],
  [2, 3, 15],
  [2, 2, 22],
  [2, 1, 30],
  [3, 3, 60],
  [3, 2, 75],
  [3, 1, 90],
])('agenda etapa %s com dificuldade %s', (reviewCount, difficulty, interval) => {
  const result = calculateNextReview({ today, difficulty, metrics: baseMetrics(reviewCount) });
  expect(result.newInterval).toBe(interval);
});

it('encerra depois da quarta revisao sem criar proxima data', () => {
  const result = calculateNextReview({ today, difficulty: 2, metrics: baseMetrics(4) });
  expect(result.isProgramCompleted).toBe(true);
  expect(result.nextReviewDate).toBeNull();
});
```

- [ ] **Step 2: Rodar o teste e confirmar falha pela regra ausente**

Run: `npm run test:run -- src/utils/calculateNextReview.test.ts`

Expected: FAIL porque o motor atual usa crescimento livre e sempre devolve uma data.

- [ ] **Step 3: Implementar as janelas adaptativas**

```ts
export const PROGRAMMED_REVIEW_COUNT = 4;
export const COMPLETION_CONTACT_COUNT = 5;

const REVIEW_INTERVALS = {
  0: { 1: 1, 2: 1, 3: 1 },
  1: { 1: 10, 2: 7, 3: 5 },
  2: { 1: 30, 2: 22, 3: 15 },
  3: { 1: 90, 2: 75, 3: 60 },
} as const;
```

Aplicar tendencia, atraso e incidencia apenas dentro dos limites da etapa. A data da prova pode comprimir a data, nunca alonga-la. Para `reviewCount >= 4`, retornar conclusao e `nextReviewDate: null`.

- [ ] **Step 4: Cobrir incidencia, tendencia, atraso e prova**

Adicionar testes independentes garantindo que cada sinal respeita a janela, que ausencia de prova nao comprime e que prova invalida/passada nao agenda revisao depois da prova.

- [ ] **Step 5: Rodar o teste focado ate ficar verde**

Run: `npm run test:run -- src/utils/calculateNextReview.test.ts`

Expected: PASS.

### Task 2: Fonte correta da data da prova

**Files:**
- Create: `src/services/topicReviewScheduleService.ts`
- Create: `src/services/topicReviewScheduleService.test.ts`
- Modify: `src/hooks/useTopicReview.tsx`

- [ ] **Step 1: Escrever teste que exige o edital do topico**

```ts
it('le a data da prova pelo edital pertencente ao usuario', async () => {
  const result = await fetchTopicExamDate('edital-1', 'user-1');
  expect(result).toBe('2026-10-18');
  expect(editalQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
});
```

- [ ] **Step 2: Confirmar falha antes do servico existir**

Run: `npm run test:run -- src/services/topicReviewScheduleService.test.ts`

Expected: FAIL por modulo/funcao ausente.

- [ ] **Step 3: Implementar resolver seguro**

```ts
export async function fetchTopicExamDate(editalId: string | null, userId: string) {
  if (!editalId) return null;
  const { data, error } = await supabase
    .from('user_editais')
    .select('exam_date')
    .eq('id', editalId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.exam_date ?? null;
}
```

- [ ] **Step 4: Trocar `user_settings.data_prova_meta` pelo resolver**

O hook deve usar `topic.edital_id`; se nao houver edital ou data, passa `null` ao motor. Remover importacoes e comentarios que indiquem sistema perpetuo ou limite de oito contatos.

- [ ] **Step 5: Rodar testes do servico e do motor**

Run: `npm run test:run -- src/services/topicReviewScheduleService.test.ts src/utils/calculateNextReview.test.ts`

Expected: PASS.

### Task 3: Persistencia coerente de etapa e conclusao

**Files:**
- Modify: `src/hooks/useTopicReview.tsx`
- Create: `src/utils/reviewStage.test.ts`
- Create: `src/utils/reviewStage.ts`

- [ ] **Step 1: Escrever testes para nomes e conclusao**

```ts
expect(getReviewStage(1)).toBe('Primeiro contato');
expect(getReviewStage(2)).toBe('Revisao 1');
expect(getReviewStage(5)).toBe('Concluido');
```

- [ ] **Step 2: Confirmar falha e implementar o helper puro**

Run: `npm run test:run -- src/utils/reviewStage.test.ts`

Expected antes: FAIL. Expected depois: PASS.

- [ ] **Step 3: Persistir a saida do motor sem data ficticia**

```ts
const isCycleCompleted = calcResult.isProgramCompleted;
const updateData = {
  review_count: newReviewCount,
  next_review: calcResult.nextReviewDate ? formatDateForDB(calcResult.nextReviewDate) : null,
  review_stage: getReviewStage(newReviewCount),
  completed: isCycleCompleted,
};
```

- [ ] **Step 4: Manter historico, duracao e dificuldade existentes**

O historico continua recebendo dificuldade 1-3, estabilidade, intervalo, tendencia e duracao real. Nenhuma dificuldade bloqueia o avanco.

### Task 4: Recalculo ao alterar a data da prova

**Files:**
- Modify: `src/services/topicReviewScheduleService.ts`
- Modify: `src/services/topicReviewScheduleService.test.ts`
- Modify: `src/pages/Editais.tsx`

- [ ] **Step 1: Escrever testes para adicionar, alterar e remover a data**

```ts
it('recalcula somente topicos ativos do edital e preserva historico', async () => {
  const result = await recalculatePendingReviewsForEdital({ editalId: 'e1', userId: 'u1', examDate: '2026-10-18' });
  expect(result.adjustedCount).toBe(2);
  expect(historyTable).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Confirmar falha antes da implementacao**

Run: `npm run test:run -- src/services/topicReviewScheduleService.test.ts`

Expected: FAIL porque o recalculo nao existe.

- [ ] **Step 3: Recalcular a agenda a partir dos dados persistidos**

Buscar apenas `completed = false`, `review_count > 0` e topicos do edital. A data-base normal e `last_reviewed_at + current_interval`; a prova somente comprime essa data. Atualizar apenas linhas cuja `next_review` realmente mudou.

- [ ] **Step 4: Integrar depois de salvar o edital**

Depois do update bem-sucedido, chamar o servico e mostrar `Plano de revisoes ajustado para a nova data da prova: N topicos.` somente quando `adjustedCount > 0`.

- [ ] **Step 5: Rodar testes focados**

Run: `npm run test:run -- src/services/topicReviewScheduleService.test.ts`

Expected: PASS.

### Task 5: Reparar estados antigos sem fabricar desempenho

**Files:**
- Create: `supabase/migrations/<timestamp>_repair_adaptive_review_states.sql`

- [ ] **Step 1: Criar a migration com a CLI**

Run: `supabase migration new repair_adaptive_review_states`

Expected: arquivo SQL novo com timestamp gerado pela CLI.

- [ ] **Step 2: Escrever SQL idempotente e restrito**

```sql
update public.topics
set completed = false,
    review_stage = 'Revisao 4 pendente',
    next_review = current_date
where completed = true
  and review_count = 4
  and next_review is null;

update public.topics
set next_review = current_date
where completed = false
  and review_count > 0
  and next_review is null;
```

Nao preencher estabilidade, dificuldade, intervalo ou historico ausente.

- [ ] **Step 3: Aplicar a migration somente apos testes locais**

Usar Supabase MCP `apply_migration`, conferir as quantidades antes/depois e executar advisors de seguranca e desempenho.

- [ ] **Step 4: Verificar os invariantes no banco**

```sql
select count(*) from public.topics
where completed = false and review_count > 0 and next_review is null;
```

Expected: `0` para os estados cobertos pela migration.

### Task 6: Compatibilidade e retirada do legado

**Files:**
- Modify: `docs/study-cycle-strategic-page-plan.md`
- Audit later: `src/utils/sessionUtils.ts`, `src/hooks/useSessionCompletion.tsx`, `src/hooks/useTopicActions.tsx`, `src/hooks/useStudyCycle.tsx`, `src/types/study.ts`

- [ ] **Step 1: Procurar consumidores reais dos motores antigos**

Run: `rg -n "sessionUtils|useSessionCompletion|useTopicActions|useStudyCycle|REVIEW_PROFILES" src`

- [ ] **Step 2: Remover apenas caminhos comprovadamente sem consumidores**

Nao misturar essa retirada com a mudanca funcional se houver importacao ativa. Registrar cada consumidor remanescente no plano vivo.

- [ ] **Step 3: Alinhar textos e contagens das telas ativas**

Revisoes, Painel, Ciclo, calendario e cards de edital devem entender `review_count = 1` como primeiro contato e `review_count = 5` como programa concluido.

### Task 7: Verificacao final

**Files:**
- Modify: `docs/study-cycle-strategic-page-plan.md`

- [ ] **Step 1: Rodar testes focados e suite completa**

Run: `npm run test:run`

Expected: PASS.

- [ ] **Step 2: Rodar lint e build**

Run: `npm run lint`

Run: `npm run build`

Expected: ambos concluem sem erro novo.

- [ ] **Step 3: Validar no navegador**

Testar primeiro contato, R1-R4, conclusao sem `next_review`, edital sem data, data adicionada/alterada/removida e light/dark em desktop e mobile.

- [ ] **Step 4: Atualizar o plano vivo**

Marcar `[x]` apenas nos itens implementados e verificados; manter limpeza legada e reinsercao manual como `[ ]` enquanto ainda forem futuras.
