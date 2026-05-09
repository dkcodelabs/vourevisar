# 📚 Projeto: Revisão Inteligente para Concursos

Você está trabalhando neste repositório específico. Use as informações abaixo para calibrar todas as respostas e geração de código.

---

## 🏗️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | Vite + React 18 + TypeScript 5 |
| Estilização | Tailwind CSS v3 + shadcn/ui + Radix UI |
| Backend / DB | Supabase (PostgreSQL) |
| Estado global | React Context (`AppContext`) |
| Dados assíncronos | TanStack Query v5 |
| Roteamento | React Router DOM v6 |
| Formulários | React Hook Form + Zod |
| Animações | Framer Motion |
| Ícones | Lucide React + Phosphor Icons |
| Testes | Vitest + Testing Library |
| Deploy | Vercel |

---

## 📂 Estrutura de Diretórios

```
src/
├── pages/          # Páginas principais
│   ├── Dashboard.tsx   # Painel inicial
│   ├── Editais.tsx     # Meus Editais
│   ├── Subjects.tsx    # Ciclo de Estudos (Substituiu as antigas páginas de matérias e tópicos)
│   ├── Revisoes.tsx    # Controle de revisões espaçadas
│   ├── Cadernos.tsx    # Cadernos de erros e anotações
│   └── admin/          # Painel administrativo
├── components/     # Componentes reutilizáveis organizados por domínio
│   ├── editais/    # EditalCard, EditalSubjectsModal, SyncReviewModal
│   ├── study-cycle/# Componentes de apoio ao ciclo de estudos
│   ├── subjects/   # Auxiliares para a tabela do ciclo
│   ├── topics/     # Modais de tópicos (TopicsModal, CreateTopicModal)
│   ├── revisoes/   # Componentes do fluxo de revisão
│   ├── modals/     # Modais genéricos do sistema
│   ├── ui/         # Componentes base (shadcn/ui e Radix)
│   └── dashboard/  # Gráficos e indicadores do painel
├── hooks/          # Custom hooks (prefixo `use...`)
├── services/       # Lógica de negócio e integrações
│   ├── mergeService.ts        # Lógica de mescla de editais/ciclos
│   ├── cycleMergeService.ts   # Lógica de mescla de ciclos
│   └── gutCalculator.ts       # Cálculo de prioridade GUT
├── types/          # Interfaces TypeScript centralizadas
│   └── index.ts    # Tipos principais: Topic, Subject, UserCycle, UserEdital
├── contexts/       # React Contexts (AppContext, etc.)
├── integrations/
│   └── supabase/
│       ├── client.ts  # Cliente Supabase singleton
│       └── types.ts   # Tipos gerados do schema do banco
└── utils/          # Funções utilitárias puras
```

---

## 🗄️ Tabelas Principais do Banco (Supabase)

| Tabela | Descrição |
|---|---|
| `subjects` | Matérias do usuário (`name`, `edital_id`, `is_visible`, `origin_id`) |
| `topics` | Tópicos vinculados às matérias (`subject_id`, `edital_id`, `is_completed`, `review_stage`) |
| `user_editais` | Editais do usuário (`name`, `exam_date`, `merged_into_cycle`, `subject_ids`) |
| `user_cycles` | Ciclo de estudos ativo (`ciclo_atual`, `disciplinas_do_dia`, `unification_map`) |
| `pending_cycle_merges` | Rascunhos de mescla de ciclo em andamento |
| `subject_merges` | Mapeamento de unificação de matérias repetidas |
| `topic_merges` | Mapeamento de unificação de tópicos repetidos |
| `topic_review_history` | Histórico de revisões por tópico |
| `user_subscriptions` | Assinaturas dos usuários |

---

## 🔑 Padrões de Código Estabelecidos

### Hooks
- Cada domínio tem seu próprio hook (ex: `useEditalOriginsWithMerge`, `useCycleStatus`, `useStudyCycleData`).
- Dados do Supabase são sempre buscados via custom hooks, nunca diretamente nos componentes de página.

### Componentes
- Páginas grandes (`Editais.tsx`, `Subjects.tsx`) delegam lógica para hooks e subcomponentes.
- Modais usam `Dialog` do Radix via shadcn (`DialogContent`, `DialogHeader`, `DialogTitle`).

### Supabase
- Sempre usar `supabase` do `src/integrations/supabase/client.ts`.
- Operações `.in()` exigem array de strings: validar `Array.isArray()` antes de passar IDs.
- Datas (`exam_date`) devem ser sanitizadas — strings vazias devem virar `null` antes do insert.

### Segurança de Dados
- Nunca apagar `subject_merges` ou `topic_merges` sem reconstruir os registros equivalentes.
- Operações de merge são críticas: ler `mergeService.ts` antes de qualquer alteração nessa área.


---

## 🌐 Ambiente Local

- **URL de Desenvolvimento**: O projeto é acessível em `http://localhost:8080/`.
- **Portas Alternativas**: Caso a porta 8080 esteja ocupada, o Vite poderá usar `http://localhost:8081/` ou `http://localhost:8082/`.

---

## 🚀 Comandos do Projeto

```bash
npm run dev       # Servidor de desenvolvimento (Vite)
npm run build     # Build de produção
npm run test      # Testes com Vitest
npm run lint      # ESLint
```
