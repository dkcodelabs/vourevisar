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
├── pages/          # Páginas principais (Editais.tsx, Subjects.tsx, Topics.tsx, Dashboard.tsx...)
├── components/     # Componentes reutilizáveis
│   ├── editais/    # EditalCard, EditalSubjectsModal, SyncReviewModal, EditEditalModal
│   ├── study-cycle/# Componentes do ciclo de estudos
│   ├── subjects/   # Componentes de matérias
│   ├── topics/     # Componentes de tópicos
│   ├── modals/     # Modais genéricos
│   ├── ui/         # Componentes base shadcn/ui
│   └── dashboard/  # Componentes do dashboard
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

## 🎨 Convenções de UI/UX

- **`glass-card`**: classe CSS customizada para cards com efeito glassmorphism (backdrop-filter). Use para modais e cards destaque.
- **`glow-card`**: classe para cards com borda luminosa sutil. Use em cards interativos.
- **`dark` mode**: O projeto usa `next-themes`. Evitar cores hard-coded; usar variáveis CSS (`--background`, `--foreground`, etc.).
- **Ícones**: Preferir `lucide-react` para ícones genéricos. `@phosphor-icons/react` para ícones especializados.
- **Chips/Badges**: Usar `rounded-md` (não `rounded-full`) para chips de matérias e tags. Casing normal (não ALL CAPS).
- **Botões destrutivos**: Sempre usar `variant="destructive"` do shadcn. Nunca vermelho inline.
- **Toasts**: Usar `react-toastify` (não `toast` do shadcn) para feedback de ações.

---

## 🖼️ Padrão de Modais Premium (Guidelines)

Sempre aplicar estas regras em novos modais para manter a consistência de elite:

### 📐 Estrutura e Dimensões
- **Margem Externa (Segurança)**: **1cm (16px)**. O modal nunca toca as bordas da tela (`p-4` no wrapper).
- **Raio da Borda**: **32px** (`rounded-[32px]`) para um visual suave e moderno.
- **Altura Máxima**: `max-h-[calc(100vh-32px)]` para garantir o respiro externo.

### 🛡️ Espaçamentos Internos (Paddings)
- **Laterais (Lado a Lado)**: **2cm (32px)** de recuo (`px-8`).
- **Verticais (Respiro)**: **1cm (16px)** entre texto e bordas laterais/divisores (`py-4`).
- **Entre Seções (Divisores)**: Distância total de **2cm (32px)** entre o texto de uma seção e a próxima através da linha divisória (`pb-4` + `pt-4` ou similar).
- **Entre Blocos de Card**: **2.5cm (40px)** de gap (`gap-10`).

### 🔘 Rodapé e Ações
- **Alinhamento**: Todos os botões agrupados na **direita** (`justify-end gap-3`).
- **Simetria**: Botões de ação devem ter **largura e altura idênticas** (ex: `w-[180px] h-[48px]`).
- **Tipografia**: Botões em caixa alta, `font-black` (negrito extra) e labels complementares pequenos (`text-[9px]`).

### ⚓ Elementos Fixos
- **Sticky Header/Footer**: Cabeçalho e Rodapé devem ser `sticky`, com background sólido para cobrir o scroll do conteúdo.

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

## ⚡ Regras de Negócio Críticas (Merge & Unificação)

### Lógica de Merge
- **Impacto no Ciclo**: Antes de alterar o `mergeService.ts`, verifique sempre o impacto no `UserCycle` e no `unification_map`. A quebra dessa lógica desalinha os estudos do usuário.
- **Auditoria**: Nunca remova logs de auditoria durante o processo de merge; eles são a única trilha para suporte em caso de bugs.
- **Atomicidade**: Operações de banco no fluxo de unificação devem ser tratadas como atômicas. Se possível, usar RPCs do Postgres.
- **Mapeamento**: O `unification_map` é a "fonte da verdade" para saber quais matérias de editais diferentes são a mesma coisa. Proteja a integridade desse JSONB.
- **Materia e topico Orfao**: O sistema não faz CRUD e deixa materia e topico orfao, sempre tem que esta dentro de algum edital.

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
