# 🚀 Prompt de Implementação: Sistema de Alertas do Mentor IA

> **Instruções:** Cole este prompt inteiro ao iniciar uma nova conversa com a IA para implementar o Mentor IA. Ele é auto-contido e referencia os documentos do projeto.

---

## O Prompt

```
Preciso implementar o sistema de alertas do Mentor IA no meu projeto "vouRevisar".

## Documentos de Referência (LER ANTES DE QUALQUER CÓDIGO)

1. **Requisitos completos:** Ler o arquivo `REQUISITOS_SISTEMA_ALERTAS.md` na raiz do projeto. Ele contém:
   - Seção 1: Dicionário de dados (19 parâmetros)
   - Seção 2: Lógica de disparo dos 4 níveis de alerta
   - Seção 3: Diretrizes de UI/UX
   - Seção 4: Regras de negócio (piso de intervalo SRS)
   - Seção 6: Mapeamento completo de implementação (quais componentes criar/modificar e onde)

2. **Análise de design:** O arquivo `ANALISE_UI_MENTOR_IA.md` (em `.gemini/antigravity/brain/`) contém diagramas ASCII do layout atual e proposto de cada página, hierarquia visual, e ideias de design aprovadas.

## Contexto do Projeto

- Stack: Vite + React 18 + TypeScript + Tailwind + shadcn/ui + Supabase
- O projeto já possui hooks que buscam dados do Supabase (nunca query direto nos componentes)
- Ler os hooks existentes antes de criar novos: `useStudyCycleData`, `useRealStatistics`, `useDashboardStats`, `useCycleStatus`
- Os dados necessários (GUT, trends, memory_stability, review_count, etc.) JÁ EXISTEM no banco — não precisa criar tabelas novas
- Consultar `src/types/index.ts` e `src/types/study-cycle.ts` para tipos existentes

## Estratégia de Execução (OBRIGATÓRIA — Seguir em Fases)

### FASE 1: Hook Central (Backend Lógico)
**Objetivo:** Criar `src/hooks/useMentorInsights.ts`
**Atuando como:** Engenheiro de dados + arquiteto de software

1. Ler os hooks existentes para entender quais dados já estão disponíveis
2. Implementar a lógica dos 4 níveis de alerta conforme Seção 2 do REQUISITOS
3. O hook deve:
   - Consumir dados dos hooks existentes (NÃO criar queries novas ao Supabase)
   - Retornar um objeto tipado: `{ criticalAlerts, gargalos, strategicInsight, consolidatedTopics }`
   - Implementar rate limiting (máximo 3 alertas totais, ordenados por prioridade)
   - Derivar `daysOverdue` a partir de `next_review` vs `today`
   - Cruzar `nota_gut` + `trend_label` + `daysOverdue` para classificar cada tópico/matéria

**Validação antes de avançar:**
- [ ] O hook compila sem erros
- [ ] Os tipos de retorno estão definidos em `src/types/`
- [ ] Testar com `console.log` que os alertas são gerados corretamente baseado nos dados reais
- [ ] O hook NÃO faz nenhuma query direta ao Supabase

### FASE 2: Componentes Visuais (Novos)
**Objetivo:** Criar a pasta `src/components/mentor/` com os componentes puros
**Atuando como:** Engenheiro front-end + designer de UI

1. Criar `MentorCycleBanner.tsx` — Banner para o Ciclo de Estudos
2. Criar `MentorBadge.tsx` — Badge reutilizável (🔥 critical / ⚠️ warning)
3. Criar `TrendIcon.tsx` — Ícone de tendência (TrendingDown/TrendingUp/Minus)

**Regras de design:**
- Seguir as classes CSS do projeto (`glass-card`, `glow-card`, variáveis CSS do dark mode)
- Usar lucide-react para ícones, Tooltip do shadcn para popovers
- Animações com Framer Motion (já instalado no projeto)
- Consultar Seção 6 do REQUISITOS para especificações visuais exatas
- O banner do Ciclo deve ser dismissível via localStorage

**Validação antes de avançar:**
- [ ] Componentes renderizam isoladamente sem erros
- [ ] Dark mode funciona corretamente
- [ ] Responsivo (testar em mobile)

### FASE 3: Integração no Ciclo de Estudos (`/ciclo-estudos`)
**Objetivo:** Conectar o Mentor IA à página onde o aluno estuda
**Atuando como:** Engenheiro de integração + especialista em UX

1. Em `StudyCycleContent.tsx`: Inserir `MentorCycleBanner` ENTRE os chips de edital ativo e a lista de matérias (não no topo absoluto)
2. Em `StudyCycleSubjectCard.tsx`: Adicionar prop `mentorAlert` e renderizar `MentorBadge` ao lado do nome da matéria
3. Em `StudyCycleTopicItem.tsx`: Para tópicos consolidados, trocar "Concluído" por "Consolidado" com `opacity-60`

**Validação antes de avançar:**
- [ ] O banner aparece corretamente quando há alertas
- [ ] O banner NÃO aparece quando não há alertas (sem espaço vazio)
- [ ] Os badges aparecem nos cards corretos
- [ ] Dismiss funciona e persiste entre reloads
- [ ] O layout NÃO quebra em nenhum viewMode (grid/list)
- [ ] Verificar no browser visualmente

### FASE 4: Integração nas Revisões (`/revisoes`)
**Objetivo:** Adicionar indicadores de tendência na lista de revisões
**Atuando como:** Engenheiro front-end + especialista em revisão espaçada

1. Na lista de tópicos (dentro de `Revisoes.tsx`): Renderizar `TrendIcon` antes do nome de cada tópico
2. Adicionar tooltip com mensagem do Mentor ao hover no ícone
3. Tópicos consolidados: badge + opacity reduzida

**Regra crítica:** O botão de "iniciar revisão" ou "marcar como revisado" NUNCA deve ser bloqueado ou desabilitado por causa de um alerta.

**Validação antes de avançar:**
- [ ] Ícones de trend aparecem nos tópicos corretos
- [ ] Tooltip funciona no desktop e tap-to-reveal no mobile
- [ ] O fluxo de revisão NÃO é afetado (testar marcar revisão com alerta ativo)
- [ ] Verificar no browser visualmente

### FASE 5: Integração no Dashboard (`/`)
**Objetivo:** Enriquecer os cards existentes com dados do Mentor
**Atuando como:** Engenheiro front-end + product designer

1. Em `Dashboard.tsx`: Adicionar Smart Summary (frase dinâmica) no Command Center
2. Em `InsightCards.tsx`: Evoluir `NeedsFocusCard` para mostrar até 3 matérias críticas
3. Em `ReviewForecastCard.tsx`: Adicionar "Mentor Whisper" na seção Execução Sugerida

**Validação antes de avançar:**
- [ ] Smart Summary muda de texto baseado no estado real
- [ ] NeedsFocusCard mostra matérias com dados reais do Mentor
- [ ] Verificar no browser visualmente
- [ ] O Dashboard NÃO fica mais lento (sem queries extras)

### FASE 6: Validação Final
**Atuando como:** QA Engineer + Product Owner

1. Navegar por todas as 3 páginas e verificar:
   - Os alertas corretos aparecem nos lugares corretos
   - Dismiss funciona e persiste
   - Dark mode está consistente
   - Mobile está responsivo
   - Performance: nenhuma query extra ao Supabase
2. Testar edge cases:
   - Sem editais no ciclo → nenhum alerta
   - Todos tópicos em dia → mensagem positiva
   - Exam date passada → modo contínuo
   - Exam date < 15 dias → modo reta final

## Restrições Absolutas

- ❌ NÃO criar tabelas novas no Supabase
- ❌ NÃO bloquear nenhuma ação do usuário (revisões, estudos, navegação)
- ❌ NÃO adicionar banners/modais que empurram conteúdo no mobile
- ❌ NÃO duplicar lógica que já existe em hooks existentes
- ✅ Todos os dados do Mentor são DERIVADOS de dados existentes (client-side)
- ✅ Preserve todos os comentários e docstrings existentes nos arquivos modificados
- ✅ Faça um plano antes de começar a codar
```

---

## Dicas de Uso

1. **Uma fase por conversa:** Para projetos grandes, é melhor executar uma fase por sessão para evitar perda de contexto.
2. **Valide antes de avançar:** As checkboxes de validação são gates — se algo falhar, corrija antes de ir para a próxima fase.
3. **Se o contexto for longo demais:** Comece com "Leia o arquivo `REQUISITOS_SISTEMA_ALERTAS.md` e me diga o que entendeu sobre a Fase X" antes de pedir para codar.
