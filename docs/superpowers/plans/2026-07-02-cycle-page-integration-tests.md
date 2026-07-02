# Cycle Page Integration Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proteger os estados críticos da página de Ciclo de Estudos e impedir que falhas de dados sejam exibidas como ciclo vazio.

**Architecture:** Uma suíte de integração renderizará `Subjects` com Router e mocks tipados apenas nas fronteiras de autenticação, hooks e Supabase. Uma factory de cenários controlará respostas encadeadas do Supabase. A única mudança prevista em produção é um estado explícito de falha de carregamento com retentativa, guiado por teste vermelho.

**Tech Stack:** React 18, TypeScript, React Router, Vitest, Testing Library, Supabase v2.

---

### Task 1: Harness de integração e estados loading/vazio

**Files:**
- Create: `src/pages/Subjects.integration.test.tsx`
- Modify: `src/pages/Subjects.tsx`

- [x] **Step 1: Criar factory tipada de cenário**

No teste, definir `CyclePageScenario` com `subjects`, `cycle`, `originsLoading`, `subjectsDeferred` e `subjectsError`. Mockar `useAuth`, `useEditalOriginsWithMerge`, `useMergeData`, `useTopicReview`, serviços laterais e componentes modais. O mock de Supabase deve devolver builders `thenable` por tabela e registrar chamadas.

```tsx
type CyclePageScenario = {
  subjects: Subject[];
  cycle: UserCycle | null;
  originsLoading?: boolean;
  subjectsDeferred?: Promise<void>;
  subjectsError?: Error;
};

const scenario = vi.hoisted(() => ({ current: null as CyclePageScenario | null }));
```

- [x] **Step 2: Escrever teste de caracterização para loading sem estado vazio**

```tsx
it('keeps the loading state until subjects and origins finish', async () => {
  const pending = createDeferred<void>();
  setScenario({ subjects: [], cycle: null, originsLoading: true, subjectsDeferred: pending.promise });
  renderSubjects();
  expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  expect(screen.queryByText('Nenhuma matéria cadastrada')).not.toBeInTheDocument();
});
```

- [x] **Step 3: Rodar o teste de caracterização**

Run: `npm run test:run -- src/pages/Subjects.integration.test.tsx`

Expected: PASS se o comportamento existente estiver preservado. Este teste documenta uma regra atual e não exige mudança de produção.

- [x] **Step 4: Completar o harness mínimo e validar GREEN**

Implementar apenas os mocks necessários para montar `Subjects`; manter utilitários estratégicos reais. Resolver o deferred e confirmar que o estado vazio aparece somente depois da carga.

Run: `npm run test:run -- src/pages/Subjects.integration.test.tsx`

Expected: PASS para loading e vazio.

- [x] **Step 5: Adicionar navegação do estado vazio**

Renderizar rota `/meus-editais`, clicar em `Ir para Meus Editais` e afirmar a navegação.

```tsx
fireEvent.click(screen.getByRole('button', { name: 'Ir para Meus Editais' }));
expect(screen.getByText('Destino Meus Editais')).toBeInTheDocument();
```

- [x] **Step 6: Commit**

```bash
git add src/pages/Subjects.integration.test.tsx
git commit -m "test: cobre loading e vazio do ciclo"
```

### Task 2: Erro visível e retentativa

**Files:**
- Modify: `src/pages/Subjects.integration.test.tsx`
- Modify: `src/pages/Subjects.tsx`

- [x] **Step 1: Escrever teste vermelho para falha obrigatória**

```tsx
it('shows a retryable error instead of an empty cycle when subjects fail', async () => {
  setScenario({ subjects: [], cycle: null, subjectsError: new Error('Failed to fetch') });
  renderSubjects();
  expect(await screen.findByText('Não foi possível carregar seu ciclo.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  expect(screen.queryByText('Nenhuma matéria cadastrada')).not.toBeInTheDocument();
});
```

- [x] **Step 2: Rodar e confirmar RED**

Run: `npm run test:run -- src/pages/Subjects.integration.test.tsx -t "shows a retryable error"`

Expected: FAIL porque `Subjects` hoje engole a falha e segue para o vazio.

- [x] **Step 3: Implementar estado de erro mínimo**

Em `Subjects.tsx`, adicionar:

```tsx
const [loadError, setLoadError] = useState<string | null>(null);
```

`loadSubjects` deve limpar o erro ao iniciar, definir `Não foi possível carregar seu ciclo.` no `catch` sem cache válido e sempre finalizar loading. Antes de `mainSubjectUI`, renderizar um estado acessível com `AlertCircle`, mensagem e botão que chama uma função `retryInitialLoad` usando `Promise.allSettled([loadSubjects(true), loadUserCycle(), refresh()])`.

- [x] **Step 4: Validar GREEN e retentativa**

No teste, trocar o cenário para sucesso antes do clique, clicar em `Tentar novamente` e afirmar que o conteúdo carregado aparece.

Run: `npm run test:run -- src/pages/Subjects.integration.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/pages/Subjects.tsx src/pages/Subjects.integration.test.tsx
git commit -m "fix: exibe falha de carregamento do ciclo"
```

### Task 3: Estados de fila, revisão e conclusão

**Files:**
- Modify: `src/pages/Subjects.integration.test.tsx`

- [x] **Step 1: Escrever teste de fila com tópico novo**

Usar matéria `Direito Constitucional` e tópico `Controle de Constitucionalidade`, ambos ativos no ciclo. Afirmar que os nomes e a ação de primeiro contato aparecem e que `Começar Novo Ciclo` não aparece.

- [x] **Step 2: Rodar o teste de caracterização da fila**

Run: `npm run test:run -- src/pages/Subjects.integration.test.tsx -t "shows an actionable new topic"`

Expected: PASS depois que a fixture representar corretamente ciclo, visibilidade e origem. Nenhuma mudança de produção deve ser feita para este comportamento já existente.

- [x] **Step 3: Completar somente a fixture e validar GREEN**

Adicionar IDs da matéria em `ciclo_atual` e `disciplinas_do_dia`, `status: 'active'`, tópicos visíveis com contadores zerados e origem de edital válida.

- [x] **Step 4: Escrever teste para prioridade de revisões**

Usar todos os tópicos iniciados, pelo menos um com `review_count: 1`, `review_stage: '24h'` e `next_review`. Afirmar `Ir para Revisões` e ausência de `Começar Novo Ciclo`. Clicar e afirmar navegação para `/revisoes`.

- [x] **Step 5: Escrever teste para conclusão verdadeira**

Usar todos os tópicos com `completed: true`, `review_stage: 'Concluído'` e contagem final. Afirmar que `Ver desempenho` aparece e que `Começar Novo Ciclo` continua ausente.

- [x] **Step 6: Rodar a suíte focada**

Run: `npm run test:run -- src/pages/Subjects.integration.test.tsx`

Expected: seis testes PASS.

- [x] **Step 7: Commit**

```bash
git add src/pages/Subjects.integration.test.tsx
git commit -m "test: protege transições críticas do ciclo"
```

### Task 4: Fechamento do plano e Quality Gate

**Files:**
- Modify: `docs/study-cycle-strategic-page-plan.md`

- [x] **Step 1: Executar verificações**

Run: `npm run typecheck`

Expected: PASS, zero erros.

Run: `npm run lint`

Expected: PASS, zero warnings.

Run: `npm run test:run`

Expected: PASS com a nova suíte incluída.

Run: `VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=ci-publishable-key npm run build`

Expected: PASS.

- [x] **Step 2: Atualizar o plano vivo**

Marcar o item de testes da página de ciclo como `[x]` e registrar exatamente os estados cobertos. Não afirmar cobertura de merges, drag and drop ou responsividade visual.

- [x] **Step 3: Verificar diff e commit final**

```bash
git diff --check
git add docs/study-cycle-strategic-page-plan.md
git commit -m "docs: registra cobertura de integração do ciclo"
```
