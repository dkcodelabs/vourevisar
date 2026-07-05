# Cycle Exam Date Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o aluno edite diretamente a data da prova do ciclo ativo sem alterar editais individuais.

**Architecture:** Um service tipado persiste a data no ciclo ativo com filtro de ownership. Um hook com TanStack Query coordena estado, cache, feedback e eventos; um dialogo isolado apresenta a edicao e a pagina apenas conecta o CTA do alerta.

**Tech Stack:** React 18, TypeScript, TanStack Query, Supabase v2, shadcn/ui, Tailwind CSS, Vitest e Testing Library.

---

### Task 1: Contrato do alerta

**Files:**
- Modify: `src/utils/studyCycleAlerts.ts`
- Test: `src/utils/studyCycleAlerts.test.ts`

- [x] Escrever teste esperando `actionType: 'edit_cycle_exam_date'` no alerta vencido.
- [x] Rodar `npm run test:run -- src/utils/studyCycleAlerts.test.ts` e confirmar falha pelo tipo antigo.
- [x] Trocar o contrato e confirmar o teste verde.

### Task 2: Persistencia e mutation

**Files:**
- Create: `src/services/cycleExamDateService.ts`
- Create: `src/services/cycleExamDateService.test.ts`
- Create: `src/hooks/useCycleExamDateEditor.ts`
- Create: `src/hooks/useCycleExamDateEditor.test.tsx`

- [x] Escrever testes para sanitizar data vazia como `null`, filtrar usuario/ciclo ativo e rejeitar update sem retorno.
- [x] Rodar os testes e confirmar falha por modulos inexistentes.
- [x] Implementar o service minimo.
- [x] Escrever teste do hook para sucesso, evento, cache e preservacao do estado em erro.
- [x] Implementar a mutation com `useMutation` e confirmar os testes verdes.

### Task 3: Dialogo e integracao

**Files:**
- Create: `src/components/study-cycle/CycleExamDateDialog.tsx`
- Modify: `src/pages/Subjects.tsx`

- [x] Compor dialogo acessivel com input de data e estados de salvar/erro.
- [x] Integrar o hook e abrir o dialogo no novo tipo de acao.
- [x] Manter a pagina como orquestradora, sem chamada Supabase direta.

### Task 4: Fechamento

**Files:**
- Modify: `docs/study-cycle-strategic-page-plan.md`

- [x] Rodar testes focados, `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` e `git diff --check`.
- [x] Validar desktop/mobile no navegador autenticado.
- [x] Marcar o debito como concluido somente apos todas as verificacoes.
- [x] Commitar, enviar branch, abrir PR, mergear e confirmar Vercel/Quality Gate em producao. Concluido no PR #23, commit `d74d395b`.
