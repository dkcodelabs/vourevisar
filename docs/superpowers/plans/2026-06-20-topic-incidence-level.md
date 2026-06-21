# Topic Incidence Level Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir score e nivel de cobranca por topico, preencher dados existentes e exibir a faixa no modal do edital.

**Architecture:** O banco recebe colunas tipadas para consultas e metricas; o JSON existente permanece como auditoria detalhada. Um helper puro centraliza a conversao 1-5 para baixa/media/alta, enquanto o worker grava o resultado e o frontend apenas apresenta o valor persistido.

**Tech Stack:** PostgreSQL/Supabase, Edge Functions Deno, React 18, TypeScript, Vitest.

---

### Task 1: Regra compartilhada de exibicao

**Files:**
- Create: `src/utils/topicIncidenceLevel.ts`
- Create: `src/utils/topicIncidenceLevel.test.ts`

- [x] Escrever testes que exijam `low` para scores 1-2, `medium` para 3, `high` para 4-5 e `null` para valor invalido.
- [x] Rodar `npm run test:run -- src/utils/topicIncidenceLevel.test.ts` e confirmar falha pela ausencia do helper.
- [x] Implementar `getIncidenceLevelFromScore` e `getIncidenceLevelLabel` com os tres niveis aceitos.
- [x] Repetir o teste e confirmar sucesso.

### Task 2: Schema e backfill

**Files:**
- Create: `supabase/migrations/<timestamp>_persist_topic_incidence_level.sql`

- [x] Criar a migracao com `supabase migration new persist_topic_incidence_level`.
- [x] Adicionar `incidence_score smallint` com check 1-5 e `incidence_level text` com check `low|medium|high`.
- [x] Fazer backfill por `subject_id` usando ranking sobre topicos ativos com `total_volume > 0`, reproduzindo a regua atual e atualizando tambem o contexto JSON.
- [x] Criar indice parcial em `incidence_level` para topicos classificados.
- [x] Aplicar a migracao no projeto `vouRevisar` e consultar contagens por nivel, score e confianca.

### Task 3: Persistencia futura no worker

**Files:**
- Modify: `supabase/functions/process-topic-incidence/index.ts`

- [x] Estender `IncidenceScoreMetadata` com `incidence_level`.
- [x] Na normalizacao, derivar `low|medium|high` do score.
- [x] Atualizar cada topico com `incidence_score`, `incidence_level` e o contexto detalhado.
- [x] Implantar com `supabase functions deploy process-topic-incidence` ou pela integracao Supabase e confirmar a versao ativa.

### Task 4: Contrato frontend e modal

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/contexts/utils/dataTransformers.ts`
- Modify: `src/components/editais/EditalSubjectsModal.tsx`
- Modify: `src/integrations/supabase/types.ts`

- [x] Adicionar os campos opcionais tipados ao topico.
- [x] Preservar score, level e contexto no transformer global.
- [x] Trocar a contagem apresentada no modal pelo rotulo persistido e ocultar quando ausente/invalido.
- [x] Atualizar os tipos gerados para refletir o schema remoto.

### Task 5: Verificacao e plano vivo

**Files:**
- Modify: `docs/study-cycle-strategic-page-plan.md`

- [x] Rodar o teste unitario novo e a suite completa com `npm run test:run`.
- [x] Rodar `npm run lint` e `npm run build`.
- [x] Consultar o Supabase e confirmar que topicos com sinal possuem score e level validos.
- [x] Marcar a pendencia do modal como concluida e registrar o backfill verificado.
- [x] Revisar o diff para garantir que nenhuma mudanca local alheia entrou no escopo.
