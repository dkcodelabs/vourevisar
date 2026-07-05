# Study Session Duration Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover a coluna fantasma `duration_minutes` dos calculos de estatistica e consolidar `study_sessions.session_duration_minutes` como fonte unica.

**Architecture:** Um utilitario puro normaliza a duracao persistida e o hook de estatisticas o reutiliza em todos os agregados. Nenhuma migration e necessaria porque schema gerado, migration de criacao e consumidores de escrita ja convergem na coluna correta.

**Tech Stack:** TypeScript, Supabase generated types e Vitest.

---

### Task 1: Fixar a fonte de duracao

**Files:**
- Create: `src/utils/studySessionDuration.ts`
- Test: `src/utils/studySessionDuration.test.ts`
- Modify: `src/hooks/useRealStatistics.tsx`

- [x] Escrever teste para duracao ausente, real e negativa.
- [x] Confirmar RED por modulo inexistente.
- [x] Implementar normalizacao minima sobre `session_duration_minutes`.
- [x] Remover `duration_minutes` do tipo local e de todos os agregados.
- [x] Confirmar testes, typecheck, lint e build.

### Task 2: Fechar o debito e publicar

**Files:**
- Modify: `docs/study-cycle-strategic-page-plan.md`

- [x] Registrar schema confirmado e marcar o item concluido.
- [ ] Criar PR, mergear e confirmar Quality Gate/Vercel em producao.
