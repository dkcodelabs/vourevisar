# Dashboard Header Orbital Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar somente o primeiro card do Painel, dando prioridade ao nome do concurso, cargo e contagem de dias com um mostrador orbital premium sem inventar progresso.

**Architecture:** O hook continua sendo a fonte do contexto do edital e passa a expor nome e cargo separadamente. O componente do Painel renderiza um mostrador SVG puramente contextual, com texto acessivel e os tres indicadores operacionais existentes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, SVG nativo, Vitest.

---

### Task 1: Separar concurso e cargo no view model

**Files:**
- Modify: `src/types/dashboardDecision.ts`
- Modify: `src/hooks/useDashboardDecisionModel.ts`
- Test: `src/utils/dashboardDecision.test.ts`

- [x] **Step 1: Expor `position` separadamente no contexto**

Adicionar `position: string | null` a `DashboardExamContext` e preencher com `activeEdital.position`. O nome principal deve usar `activeEdital.name`, sem concatenar o cargo.

- [x] **Step 2: Rodar testes e build**

Run: `npm run test:run -- src/utils/dashboardDecision.test.ts && npm run build`
Expected: PASS e build concluido.

### Task 2: Refinar o primeiro card

**Files:**
- Modify: `src/components/dashboard-decision/DashboardDecisionExperience.tsx`

- [x] **Step 1: Remover ruido textual e acao redundante**

Remover o rotulo `Concurso ativo` e o botao `Ver detalhes do edital`. Exibir nome do concurso em primeiro nivel e cargo abaixo; quando o cargo estiver ausente, nao reservar uma linha vazia.

- [x] **Step 2: Criar mostrador orbital acessivel**

Usar SVG com arco luminoso, trilha pontilhada e brilho controlado. O arco e moldura visual e nao representa porcentagem; o `aria-label` deve informar dias restantes e data da prova.

- [x] **Step 3: Preservar estados honestos**

Sem data, mostrar `--`, `defina a data da prova` e manter a chamada textual existente. Data passada deve continuar sendo apresentada sem fabricar contagem positiva.

- [x] **Step 4: Validar responsividade e temas**

Verificar em 1280x720 e 390x844, dark e light, sem overflow, cortes ou sobreposicao. Confirmar console sem erros e manter os indicadores clicaveis.

- [x] **Step 5: Rodar verificacoes finais**

Run: `npm run test:run && npm run build && npx eslint src/components/dashboard-decision/DashboardDecisionExperience.tsx src/hooks/useDashboardDecisionModel.ts src/types/dashboardDecision.ts`
Expected: testes e build aprovados; nenhum erro de lint nos arquivos alterados.

### Task 3: Atualizar memoria do projeto

**Files:**
- Modify: `docs/study-cycle-strategic-page-plan.md`
- Modify: `design-qa.md`

- [x] **Step 1: Registrar o refinamento e a validacao**

Marcar o topo do Painel como refinado e registrar a decisao de nao usar arco como metrica de progresso sem uma base temporal real.

### Task 4: Ajustes responsivos apos validacao

**Files:**
- Modify: `src/utils/dashboardDecision.ts`
- Modify: `src/components/dashboard-decision/DashboardDecisionExperience.tsx`
- Test: `src/utils/dashboardDecision.test.ts`

- [x] **Step 1: Remover repeticao visual de cargo**

Quando o nome do concurso terminar com o mesmo cargo separado por pontuacao, retirar o sufixo somente no view model e manter o cargo na linha secundaria.

- [x] **Step 2: Compactar mobile e tablet**

Exibir mostrador orbital e tres indicadores na mesma faixa de quatro colunas abaixo da identidade do concurso, reduzindo circulo, icones e tipografia proporcionalmente. Preservar a composicao horizontal ampla a partir do desktop.

- [x] **Step 3: Revalidar a interface**

Validar 390x844, 768x900 e 1280x720 em sessao autenticada, sem overflow ou console relevante, e confirmar o clique de revisoes atrasadas para `/revisoes`.
