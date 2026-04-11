# 📋 vouRevisar — Registro de Alterações

> Este documento é alimentado automaticamente pelas IAs que auxiliam no desenvolvimento do projeto **vouRevisar**.
> Cada seção representa uma sessão de trabalho com data, resumo e detalhes técnicos.

---

## 🗂️ Índice

- [2026-04-10 09:00 — Correção de Sintaxe e Polimento de UI](#2026-04-10-0900--correção-de-sintaxe-e-polimento-de-ui)
- [2026-04-10 08:43 — Refinamento de Cores e UI (Minimalist Dark)](#2026-04-10-0843--refinamento-de-cores-e-ui-minimalist-dark)
- [2026-04-10 08:35 — Redesign e Correção do Sistema de Changelog](#2026-04-10-0835--redesign-e-correção-do-sistema-de-changelog)
- [2026-04-10 — Otimização de Performance e Segurança do Banco de Dados](#2026-04-10--otimização-de-performance-e-segurança-do-banco-de-dados)
- [2026-04-10 — Recuperação de Dados de Merge](#2026-04-10--recuperação-de-dados-de-merge)
- [2026-04-10 — Correção do Import de Edital (Datas)](#2026-04-10--correção-do-import-de-edital-datas)
- [2026-04-09 — Correção de Visibilidade de Editais](#2026-04-09--correção-de-visibilidade-de-editais)
- [2026-04-09 — Correção de Erros de Query Supabase](#2026-04-09--correção-de-erros-de-query-supabase)
- [2026-04-08 — Correção de Integridade de Subjects Órfãos](#2026-04-08--correção-de-integridade-de-subjects-órfãos)
- [2026-04-07 — Workflow de Import e Merge de Editais](#2026-04-07--workflow-de-import-e-merge-de-editais)

---

## 2026-04-10 09:00 — Correção de Sintaxe e Polimento de UI

**IA:** Antigravity (Gemini)  
**Tipo:** 🐛 Correção / ✨ Feature  
**Status:** ✅ Concluído

### Resumo
Resolução de erro de compilação em `Editais.tsx` e refinamento final da interface "Minimalist Dark" do Changelog.

### Alterações
- **Correção Crítica**: Resolvido erro `Expected '</', got ')'` no modal de conflito de ciclos em `Editais.tsx` (tags mal fechadas).
- **Consistência Visual**: Unificação de cores residuais (azuis antigos) para o novo padrão **Emerald/Zinc**.
- **Melhoria de UX**: Adição de botão **"Voltar ao Topo"** flutuante e responsivo no visualizador de changelog.
- **Refinamento do Parser**: Ajuste na captura de termos com e sem acentuação (correcao/otimizacao) para filtros precisos.

### Arquivos Afetados
- `src/pages/Editais.tsx`
- `changelog.html`
- `CHANGELOG.md`

---

## 2026-04-10 08:43 — Refinamento de Cores e UI (Minimalist Dark)

**IA:** Antigravity (Gemini)  
**Tipo:** 🔧 Otimização / ✨ Feature  
**Status:** ✅ Concluído

### Resumo
Refinamento estético do changelog para melhorar a acessibilidade e legibilidade, com foco em cores menos saturadas e layout mais compacto.

### Alterações
- Ajuste da paleta de cores para **Zinc 950/900** (mais suave que o preto puro)
- Otimização do tamanho dos botões de filtro (mais compactos e profissionais)
- Implementação de exibição de **hora** (`HH:mm`) junto às datas
- Melhoria no contraste do texto "Prose" para leitura técnica facilitada

### Arquivos Afetados
- `changelog.html`
- `CHANGELOG.md`

---

## 2026-04-10 08:35 — Redesign e Correção do Sistema de Changelog

**IA:** Antigravity (Gemini)  
**Tipo:** ✨ Feature / 🔧 Otimização / 🐛 Correção  
**Status:** ✅ Concluído

### Resumo
Redesign completo do visualizador de changelog para um formato de Timeline profissional, resolvendo falhas na lógica de filtragem e implementando melhorias de legibilidade inspiradas no padrão "Prose".

### Alterações
- Implementação de layout **Timeline** com indicadores visuais cronológicos
- Correção da lógica de parsing de metadados (IA, Tipo) que causava falha nos filtros
- Adição de suporte a **Alertas estilo GitHub** (`[!IMPORTANT]`, `[!NOTE]`, etc.)
- Sistema de **Busca em tempo real** com destaque (highlight) dos termos encontrados
- Estilização premium com efeitos de glassmorphism e animações de entrada
- Otimização para leitura técnica (padrão Prose) e total responsividade mobile

### Arquivos Afetados
- `changelog.html`
- `CHANGELOG.md`


## 2026-04-10 08:30 — Otimização de Performance e Segurança do Banco de Dados

**IA:** Antigravity (Gemini)  
**Tipo:** 🔧 Otimização / 🔒 Segurança  
**Status:** ✅ Concluído

### Resumo
Eliminação de erros 502 Bad Gateway e degradação de performance causados por loops recursivos em políticas RLS (Row Level Security).

### Alterações
- Refatoração de políticas RLS com `SECURITY DEFINER` functions para evitar loops recursivos
- Otimização de RLS usando padrão `InitPlan` (sub-select) para minimizar checagens redundantes de autenticação
- Implementação de indexação abrangente no banco de dados para queries de alta performance

### Arquivos Afetados
- Migrations SQL (Supabase)
- Políticas RLS refatoradas

---

## 2026-04-10 08:15 — Recuperação de Dados de Merge

**IA:** Antigravity (Gemini)  
**Tipo:** 🐛 Correção  
**Status:** ✅ Concluído

### Resumo
Recuperação de dados de merge de matérias e tópicos que foram perdidos durante limpeza de integridade.

### Alterações
- Identificação dos mapeamentos de unificação ausentes
- Reconstrução dos registros `subject_merges` e `topic_merges`
- Reaplicação das unificações no banco de dados

---

## 2026-04-10 08:00 — Correção do Import de Edital (Datas)

**IA:** Antigravity (Gemini)  
**Tipo:** 🐛 Correção  
**Status:** ✅ Concluído

### Resumo
Correção do erro "400 Bad Request" durante importação de editais causado por datas vazias ou inválidas.

### Alterações
- Sanitização de datas em `ImportEditalModal.tsx` — conversão de strings vazias para `null`
- Propagação correta de `subject IDs` para a UI após criação de edital
- Binding estrito de foreign keys para subjects e topics

### Arquivos Afetados
- `src/components/ImportEditalModal.tsx`

---

## 2026-04-09 — Correção de Visibilidade de Editais

**IA:** Antigravity (Gemini)  
**Tipo:** 🐛 Correção  
**Status:** ✅ Concluído

### Resumo
Correção do banner "Definir data da prova" que não aparecia em certos editais, como o PRF.

### Alterações
- Debug da lógica de detecção de datas ausentes/inválidas
- Ajuste na UI para detecção robusta de `exam_date` nulo

### Arquivos Afetados
- `src/components/EditalCard.tsx`

---

## 2026-04-09 — Correção de Erros de Query Supabase

**IA:** Antigravity (Gemini)  
**Tipo:** 🐛 Correção  
**Status:** ✅ Concluído

### Resumo
Resolução de erros 400 Bad Request no cliente Supabase causados por passagem de objeto ao invés de array para o filtro `.in()`.

### Alterações
- Sanitização de `subject_id` e identificadores similares antes de envio ao banco
- Validação como arrays de strings antes da execução de queries

---

## 2026-04-08 — Correção de Integridade de Subjects Órfãos

**IA:** Antigravity (Gemini)  
**Tipo:** 🔧 Refatoração / 🐛 Correção  
**Status:** ✅ Concluído

### Resumo
Eliminação de subjects órfãos (sem `edital_id`) no banco de dados.

### Alterações
- Criação de utilitário server-side `repairOrphanedSubjects`
- Atualização de `Subjects.tsx` e `EditalSubjectsModal.tsx` para vincular `edital_id` obrigatoriamente
- Validação preventiva em todos os workflows de criação

### Arquivos Afetados
- `src/components/Subjects.tsx`
- `src/components/EditalSubjectsModal.tsx`
- Service de reparo server-side

---

## 2026-04-07 — Workflow de Import e Merge de Editais

**IA:** Antigravity (Gemini)  
**Tipo:** ✨ Feature / 🔧 Melhoria  
**Status:** ✅ Concluído

### Resumo
Aprimoramento do workflow de importação e merge de editais com feedback detalhado ao usuário.

### Alterações
- Modal de resumo detalhado pós-importação com métricas comparativas
- Listas expansíveis/colapsáveis de matérias no preview de merge
- Tratamento de erros robusto com logging informativo
- Validação de estado de merge recuperado para evitar corrupção de dados

### Arquivos Afetados
- Componentes de Import/Merge
- Services relacionados

---

## 2026-04-10 — Criação do Sistema de Changelog

**IA:** Antigravity (Claude Opus 4.6)
**Tipo:** 📝 Documentação
**Status:** ✅ Concluído

### Resumo
Criação de sistema de changelog centralizado com página HTML elegante que renderiza este arquivo `.md`.

### Alterações
- Criação de `CHANGELOG.md` na raiz do projeto
- Criação de `changelog.html` — página standalone com Marked.js para renderização

### Arquivos Criados
- `CHANGELOG.md`
- `changelog.html`

---

> **📌 Instruções para IAs:**
> Ao concluir uma sessão de trabalho, adicione uma nova seção **no topo** (antes das existentes, após o índice) seguindo o template abaixo:
>
> ```markdown
> ## YYYY-MM-DD — Título Descritivo
> 
> **IA:** Nome da IA
> **Tipo:** 🐛 Correção | ✨ Feature | 🔧 Otimização | 📝 Documentação | 🔒 Segurança
> **Status:** ✅ Concluído | 🔄 Em Progresso | ⏳ Pendente
> 
> ### Resumo
> Descrição concisa do que foi feito.
> 
> ### Alterações
> - Item 1
> - Item 2
> 
> ### Arquivos Afetados
> - `caminho/do/arquivo.ts`
> ```
