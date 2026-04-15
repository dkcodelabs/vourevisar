# 🚨 Requisitos: Sistema de Alertas Inteligentes (Mentor IA) - V4 (Final)

Este documento atua como o Epic central para a implementação do Mentor IA no **vouRevisar**. O objetivo do sistema é atuar de forma consultiva e preditiva, utilizando os 19 parâmetros nativos do motor SRS e da IA de Tendência para guiar os estudos do aluno, substituir funções mecânicas e evitar o acúmulo de gargalos sem gerar atrito.

---

## 🎯 1. Dicionário de Dados (Inputs do Mentor IA)

O motor de decisão consumirá exclusivamente os seguintes parâmetros já consolidados no banco de dados:

* **Inteligência e Priorização:** `nota_gut` (1-5), `total_volume`, `difficulty_level` (1-3), `trend_label` (Melhorando/Estável/Piorando), `trend_delta`.
* **Motor SRS Nativo:** `memory_stability`, `current_interval`, `review_count`, `review_stage`, `review_profile` (Beginner/Intermediate/Advanced).
* **Datas e Tempos:** `next_review`, `last_reviewed_at`, `first_studied_at`, `study_duration_minutes`, `daysOverdue`.
* **Progressão e Estrutura:** `Total de tópicos por matéria`, `Total concluído`, `ciclos_realizados`, `exam_date`.

---

## 🧠 2. Lógica de Disparo e Níveis de Alerta

O Mentor IA cruza as variáveis acima para exibir alertas no Dashboard. A exibição segue uma regra de **Rate Limiting** (máximo de 3 alertas ativos por vez, ordenados por prioridade).

### 🔴 Nível 1: Risco de Esquecimento Crítico (Prioridade Máxima)
* **Objetivo:** Proteger os tópicos que mais caem na prova e que estão sendo esquecidos.
* **Condição de Disparo:** `nota_gut` >= 4 **E** `daysOverdue` > 0.
* **Regra de Desempate:** Maior `total_volume` em ordem decrescente.
* **Ação (UI):** Destaque vermelho no card da matéria. Botão de Call-to-Action: `[Revisar Agora]`.
* **Mensagem do Mentor:** *"Alerta de Perda: [Tópico] tem altíssima incidência em provas e está atrasado há [X] dias. Priorize esta revisão hoje para não comprometer sua pontuação."*

### 🟡 Nível 2: Gargalo de Desempenho (Consultivo)
* **Objetivo:** Identificar ineficiência de aprendizado sem bloquear o fluxo de revisões do sistema.
* **Condição de Disparo:**
    * A) O `trend_label` do tópico alterou para `"Piorando"` (o que reflete marcações repetidas de `difficulty_level = 3` e queda na `memory_stability`).
    * B) O `study_duration_minutes` na última revisão foi atipicamente alto para o padrão daquele conteúdo.
* **Ação (UI):** O card aparece na fila diária de revisões com um ícone de `Atenção` amarelo. **O fluxo não é bloqueado.** O aluno revisa e avança normalmente.
* **Mensagem do Mentor:** *"Mentor IA: O diagnóstico deste assunto está como 'Piorando'. Antes de iniciar esta revisão, sugerimos consultar seu material de base ou resumo para fortalecer a teoria."*

### 🔵 Nível 3: Alerta Estratégico de Edital e Compressão
* **Objetivo:** Ajustar o ritmo de estudos e ativar protocolos de reta final.
* **Condições e Comportamentos:**
    * **Ritmo Abaixo do Necessário:** Se a projeção de `Total concluído` vs. `exam_date` indicar que o aluno não fechará o edital, o Mentor avisa: *"Ajuste de Rota: No ritmo atual, você precisará aumentar as horas em [Matéria] para fechar o edital até a prova."*
    * **Gatilho "Semana Zero":** Quando a data atual estiver muito próxima ao `exam_date`, o Mentor IA anuncia o modo de compressão: *"Modo Reta Final Ativado: Iniciando compressão da Semana Zero. O foco agora será exclusivo em retenção de curto prazo e revisão de alto GUT."*
    * **Modo Contínuo (Sem Edital):** Se `exam_date` for `null` ou data passada, o sistema avalia apenas a fluidez dos `ciclos_realizados`, mantendo foco na consistência de longo prazo.

### 🟢 Nível 4: Consolidação Silenciosa
* **Objetivo:** Limpar o Dashboard de assuntos dominados.
* **Condição de Disparo:** Tópico atingiu o teto máximo do `current_interval` permitido pelo `review_profile` (ex: 45d, 60d ou 90d) e possui `trend_label` = `"Melhorando"` ou `"Estável"`.
* **Ação:** O `review_stage` é marcado como "Consolidado". O Mentor não exibe alerta, atuando silenciosamente para empurrar a revisão para o limite do espaçamento, otimizando o tempo do aluno.

---

## 🎨 3. Interface e Experiência do Usuário (UI/UX)

Para garantir fluidez e evitar fadiga visual, a interface obedecerá às seguintes diretrizes:

### Painel de Insights (Novo Componente)
- Um slider ou banner no topo do Dashboard exibindo exclusivamente os alertas ativos gerados pela IA, respeitando o limite (Rate Limiting) de no máximo 3 alertas simultâneos.

### No Dashboard (Cards de Matéria)
- **Badge de Alerta:** Ícones minimalistas (`Yellow` para atenção, `Red` para crítico) no canto do card, sem quebrar o layout.
- **Micro-interação:** Ao passar o mouse (hover) ou clicar no badge, abrir um popover/tooltip com o insight escrito pela IA e o botão de ação rápida (quando aplicável).
- **Sem Bloqueios:** Nenhuma trava ou passo extra será imposto para realizar uma revisão. A mentoria é 100% consultiva.

---

## ⚙️ 4. Regras de Negócio e Proteção do Motor SRS

Para garantir que o fluxo de revisões não seja quebrado pelo comportamento do usuário em tópicos difíceis:

* **Piso de Intervalo (Minimum Floor):** Independentemente das penalidades de redução aplicadas quando o aluno marca `difficulty_level = 3` (Difícil), o motor SRS garantirá via código (`Math.max(2, ...)`) que o `current_interval` de um tópico (após o primeiro contato de 1 dia) nunca seja inferior a **2 dias**.
* **Objetivo:** Evitar loops infinitos de repetição diária que causam sobrecarga no banco de dados e desmotivam o aluno.

---

## 🛠️ 5. Fluxo de Dados e Processamento (Backend / Supabase)
- **Tabelas Envolvidas:** `subjects`, `topics`, `user_editais`, `topic_review_history`, `study_sessions`.

---

## 🗺️ 6. Mapeamento de Implementação (UI/UX → Código)

> **Documento de referência:** A análise detalhada de design, com diagramas ASCII do "antes e depois" de cada página, está em:
> `ANALISE_UI_MENTOR_IA.md` (artefato gerado na conversa de design — verificar em `.gemini/antigravity/brain/`)

### 📌 Fluxo Real do Aluno (3 Contextos)

| Contexto | Página | Rota | Função |
|---|---|---|---|
| **ESTUDAR** | Ciclo de Estudos | `/ciclo-estudos` | Onde o aluno marca os primeiros estudos e vê a fila de matérias do dia |
| **REVISAR** | Revisões | `/revisoes` | Onde o aluno vê revisões pendentes/atrasadas, marca revisões feitas |
| **VISÃO GERAL** | Dashboard | `/` | Panorama rápido: countdown, progresso, pendências |

> ⚠️ **Páginas de Matérias (`/materias`) e Tópicos (`/topicos`) são apenas de gerenciamento/CRUD. Os alertas do Mentor NÃO devem aparecer nelas.**

### 📍 Onde Cada Nível de Alerta Aparece

| Nível | Tipo | Página Alvo | Componente Alvo | Tipo de UI |
|---|---|---|---|---|
| **Nível 1** (Crítico) | GUT ≥ 4 + Atraso | **Ciclo** (`/ciclo-estudos`) | `StudyCycleSubjectCard.tsx` | Badge 🔥/⚠️ inline ao lado do nome da matéria |
| **Nível 1** (Resumo) | Top 3 matérias críticas | **Dashboard** (`/`) | `InsightCards.tsx` → `NeedsFocusCard` | Evolução do card para listar até 3 matérias |
| **Nível 2** (Gargalo) | Tendência Piorando | **Revisões** (`/revisoes`) | `RevisoesList.tsx` (itens de tópico) | Ícone `TrendingDown` vermelho antes do nome |
| **Nível 3** (Estratégico) | Projeção/Reta Final | **Dashboard** (`/`) | `Dashboard.tsx` (Command Center) | Smart Summary: frase dinâmica sob o nome do edital |
| **Nível 3** (Contexto) | Insight do dia | **Ciclo** (`/ciclo-estudos`) | Novo: `MentorCycleBanner` | Banner contextual entre chips de edital e lista |
| **Nível 4** (Consolidado) | Tópico consolidado | **Ciclo** + **Revisões** | `StudyCycleTopicItem.tsx` + `RevisoesList.tsx` | Badge "Consolidado" + `opacity-60` |

### 🔩 Componentes a CRIAR

| Componente | Caminho Sugerido | Usado em | Descrição |
|---|---|---|---|
| `useMentorInsights()` | `src/hooks/useMentorInsights.ts` | Todas as páginas | Hook que centraliza a lógica de decisão dos 4 níveis |
| `MentorCycleBanner` | `src/components/study-cycle/MentorCycleBanner.tsx` | Ciclo | Banner de 1 insight crítico no topo da lista |
| `MentorBadge` | `src/components/ui/MentorBadge.tsx` | Ciclo | Badge reutilizável (🔥/⚠️) para cards de matéria |
| `TrendIcon` | `src/components/ui/TrendIcon.tsx` | Revisões | Ícone de tendência (⬆️/⬇️) para itens de tópico |

### 🔧 Componentes a MODIFICAR

| Componente | Arquivo | Modificação |
|---|---|---|
| `StudyCycleContent` | `src/components/study-cycle/StudyCycleContent.tsx` | Inserir `MentorCycleBanner` entre chips de edital ativo e lista de matérias |
| `StudyCycleSubjectCard` | `src/components/study-cycle/StudyCycleSubjectCard.tsx` | Nova prop `mentorAlert` → ícone 🔥/⚠️ inline + tooltip |
| `StudyCycleTopicItem` | `src/components/study-cycle/StudyCycleTopicItem.tsx` | Badge "Consolidado" + `opacity-60` para tópicos consolidados |
| `RevisoesList` | `src/components/revisoes/RevisoesList.tsx` (ou equivalente em `Revisoes.tsx`) | Ícone de trend + tooltip por tópico |
| `NeedsFocusCard` | `src/components/dashboard-v2/InsightCards.tsx` | Evoluir para listar até 3 matérias críticas com badges |
| `ReviewForecastCard` | `src/components/dashboard-v2/ReviewForecastCard.tsx` | Adicionar "Mentor Whisper" na seção Execução Sugerida |
| `Dashboard.tsx` | `src/pages/Dashboard.tsx` | Smart Summary no Command Center |

### 🎨 Regras Visuais

- **Hierarquia de cores:** 🔴 Vermelho = Crítico, 🟠 Âmbar = Atenção, 🟢 Verde = Consolidado, 🔵 Azul = Estratégico
- **Zero bloqueio:** Nenhum alerta impede o aluno de agir — são 100% consultivos
- **Rate Limiting visual:** Máximo 1 insight no Ciclo, 3 no Dashboard, ícones livres nas Revisões
- **Dismiss inteligente:** `localStorage` com chave `mentor-{type}-dismissed-{date}` — não volta até próximo dia ou mudança de contexto
- **Mobile:** Banners viram linha compacta, tooltips viram tap-to-reveal