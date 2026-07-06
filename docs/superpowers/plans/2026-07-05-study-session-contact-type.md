# Study Session Contact Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classificar novas sessoes de estudo sem inventar classificacao para o historico existente.

**Architecture:** Uma coluna aditiva com default conservador recebe um tipo fechado por `CHECK`. Uma funcao pura decide primeiro contato versus revisao; os escritores ativos enviam a classificacao e fluxos agregados usam `mixed` ou `subject_session`.

**Tech Stack:** Supabase PostgreSQL/RLS, TypeScript, React hooks e Vitest.

---

### Task 1: Contrato do banco

**Files:**
- Modify: `supabase/migrations/20260705221040_add_study_session_contact_type.sql`
- Create: `src/services/studySessionContactTypeMigration.test.ts`

- [x] Escrever teste que exige coluna `contact_type`, default `unclassified`, `NOT NULL`, `CHECK` com os seis valores e preservacao do RLS existente.
- [x] Rodar o teste e confirmar falha porque a migration esta vazia.
- [x] Implementar SQL aditivo:

```sql
alter table public.study_sessions
  add column if not exists contact_type text not null default 'unclassified';

alter table public.study_sessions
  drop constraint if exists study_sessions_contact_type_check;

alter table public.study_sessions
  add constraint study_sessions_contact_type_check
  check (contact_type in ('first_contact', 'review', 'continuation', 'mixed', 'subject_session', 'unclassified'));
```

- [x] Rodar o teste e confirmar verde.

### Task 2: Classificacao e persistencia

**Files:**
- Create: `src/utils/studySessionContactType.ts`
- Create: `src/utils/studySessionContactType.test.ts`
- Modify: `src/hooks/useStudySessionTracking.tsx`
- Test: `src/hooks/useStudySessionTracking.test.tsx`

- [x] Escrever teste para `first_contact` sem contato anterior e `review` com contato anterior.
- [x] Escrever teste do hook exigindo `contact_type` no insert.
- [x] Confirmar RED por funcoes/prop ausentes.
- [x] Implementar `getTopicStudySessionContactType` e aceitar `contactType` no payload central.
- [x] Confirmar os testes verdes.

### Task 3: Escritores e publicacao

**Files:**
- Modify: `src/hooks/useTopicReview.tsx`
- Modify: `src/hooks/useStudyCycle.tsx`
- Modify: `src/hooks/useDailyStudyProgress.tsx`
- Modify: `src/utils/sessionUtils.ts`
- Modify: `src/integrations/supabase/types.ts`
- Modify: `docs/study-cycle-strategic-page-plan.md`

- [x] Enviar `first_contact`/`review` nos contatos de topico e tipos agregados nos demais escritores.
- [x] Aplicar migration linked, regenerar tipos e verificar schema/RLS por consulta read-only.
- [x] Rodar typecheck, lint, suite completa, build e `git diff --check`.
- [ ] Publicar PR, mergear e confirmar Quality Gate/Vercel em producao.

### Task 4: Advisor de seguranca e performance da tabela

**Files:**
- Create: `supabase/migrations/20260705221633_secure_study_session_access_and_indexes.sql`
- Create: `src/services/studySessionSecurityAndIndexMigration.test.ts`

- [x] Escrever teste exigindo revogacao de `anon`, grants explicitos para `authenticated`/`service_role`, indices para `cycle_id` e `edital_id` e preservacao de RLS/policies.
- [x] Confirmar RED com migration vazia.
- [x] Implementar migration que revoga acesso anonimo, mantem acesso autenticado sob RLS e cria indices parciais nos FKs nao nulos.
- [x] Aplicar migration linked no Supabase.
- [x] Verificar no banco remoto: `anon_select=false`, `authenticated_select/insert/update/delete=true`, RLS ativo, policy `study_sessions_all_policy` preservada e indices `idx_study_sessions_cycle_id`/`idx_study_sessions_edital_id` presentes.
- [x] Rodar advisors filtrados para `study_sessions`: alertas de performance zerados; alerta `anon` removido; permanece apenas exposicao para `authenticated`, aceita porque o frontend usa a Data API e a RLS controla ownership.
