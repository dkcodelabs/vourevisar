# Cycle Merge Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a etapa tecnica de mesclagem por uma comparacao visual entre manter itens individuais e unificar equivalentes no mesmo ciclo.

**Architecture:** Extrair um modelo puro que derive as duas arvores de pre-visualizacao a partir de `Subject` e `CycleUnificationMap`, renderiza-las em um componente responsivo e manter em `Editais.tsx` somente a orquestracao assicrona/persistencia. O caminho neutro persiste um mapa vazio; o caminho verde persiste o mapa completo com topicos.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Vitest e Testing Library.

---

### Task 1: Modelo de comparacao

**Files:**
- Create: `src/components/editais/cycleMergeComparisonModel.ts`
- Test: `src/components/editais/cycleMergeComparisonModel.test.ts`

- [x] Escrever teste em que duas materias de mesmo nome permanecem duplicadas na arvore individual e viram uma entrada na arvore unificada.
- [x] Rodar `npm run test:run -- src/components/editais/cycleMergeComparisonModel.test.ts` e confirmar falha por implementacao ausente.
- [x] Implementar derivacao de materias, topicos mesclados e topicos mantidos.
- [x] Rodar o teste focado e confirmar sucesso.

### Task 2: Componente responsivo

**Files:**
- Create: `src/components/editais/CycleMergeComparison.tsx`
- Test: `src/components/editais/CycleMergeComparison.test.tsx`

- [x] Escrever teste dos dois titulos, legenda acessivel e CTAs explicitos.
- [x] Confirmar que o teste falha antes do componente existir.
- [x] Implementar grade de duas colunas no desktop e uma coluna no mobile, com cor de sucesso apenas nos itens afetados.
- [x] Confirmar o teste focado verde.

### Task 3: Integracao do fluxo

**Files:**
- Modify: `src/pages/Editais.tsx`

- [x] Calcular a pre-visualizacao completa de topicos antes de abrir a escolha.
- [x] Conectar `Manter itens individuais` a um mapa sem unificacoes e `Unificar equivalentes` ao mapa completo.
- [x] Desabilitar a seta superior na etapa de comparacao e remover os CTAs tecnicos antigos.
- [x] Rodar testes focados, lint dos arquivos alterados e `npm run build`.

### Task 4: QA visual e plano vivo

**Files:**
- Modify: `docs/study-cycle-strategic-page-plan.md`

- [ ] Validar `/editais` autenticado em desktop e mobile, incluindo abertura do modal, clique nas alternativas e tela final de nome do ciclo sem concluir operacao destrutiva durante QA. O componente isolado foi validado com os mesmos tokens em 1280x800 e 375x667, sem erro de console ou overflow horizontal; os CTAs ficam sticky no mobile, as duas origens aparecem, as linhas de topicos mesclados ficam destacadas em verde e o controle global recolhe/expande as duas colunas corretamente. Falta o fluxo autenticado real.
- [ ] Marcar o item do plano como concluido somente depois da verificacao visual.
