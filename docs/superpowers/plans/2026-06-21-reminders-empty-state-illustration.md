# Reminders Empty State Illustration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar e integrar uma ilustração compacta de bloco de notas com lápis no estado vazio de `Últimos lembretes`.

**Architecture:** Um PNG transparente ficará em `public/images/dashboard/` e será renderizado diretamente pelo componente existente. A mudança ficará limitada à apresentação do estado vazio; inclusão, conclusão, histórico e persistência dos lembretes não serão alterados.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, Testing Library, imagegen.

---

### Task 1: Gerar o asset

**Files:**
- Create: `public/images/dashboard/reminders-empty-state.png`

- [x] Gerar bloco de notas vazio com lápis em repouso sobre chroma key uniforme.
- [x] Remover o chroma key para produzir PNG com alpha.
- [x] Validar dimensões, transparência, bordas e leitura em tamanho reduzido.

### Task 2: Cobrir e implementar o estado vazio

**Files:**
- Modify: `src/components/dashboard-decision/DashboardDecisionExperience.tsx`
- Test: teste de componente existente ou novo teste focado no card de lembretes

- [x] Criar teste que espera o título `Sua lista está livre`, o complemento e a imagem quando a lista visível está vazia.
- [x] Rodar o teste e confirmar falha pela ausência do novo estado.
- [x] Integrar a imagem com tamanho responsivo e fallback simples.
- [x] Rodar o teste e confirmar aprovação.

### Task 3: Verificar e fechar o plano vivo

**Files:**
- Modify: `docs/study-cycle-strategic-page-plan.md`

- [x] Validar light e dark em desktop e mobile no navegador.
- [x] Confirmar pelo teste e pela condição de renderização que lembretes visíveis substituem o estado vazio pela lista real.
- [x] Rodar lint focado e build.
- [x] Marcar o item do plano vivo como concluído somente após a verificação.
