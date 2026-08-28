# Plano vivo — quality gates arquiteturais

## Objetivo

Transformar fronteiras arquiteturais já definidas no `AGENTS.md` em verificações
automáticas, sem misturar a adoção dos gates com uma refatoração massiva do
legado e sem enfraquecer o Quality Gate atual.

## Diagnóstico inicial — 2026-08-26

- [x] Confirmar o gate atual: `npm run lint` executa
  `eslint . --max-warnings=0`, portanto qualquer regra nova em `warn` já é
  bloqueante.
- [x] Confirmar o CI atual: `.github/workflows/quality-gate.yml` já executa
  audit de dependências, typecheck, testes, lint e build.
- [x] Medir referências ao cliente Supabase: a busca bruta encontrou 47
  arquivos em `src/pages`/`src/components`, mas 6 são testes que apenas
  referenciam ou mockam o módulo. O código de produção possui 41 imports
  diretos nessas duas árvores. Fora delas, há 47 arquivos em `src/hooks`, 34
  em `src/services`, 7 em `src/contexts` e 4 em `src/utils`.
- [x] Medir páginas acima da referência de aproximadamente 700 linhas do
  `AGENTS.md`: 9 páginas, incluindo `Editais.tsx` com 3.887 linhas.
- [x] Medir componentes acima de 700 linhas: 9 componentes, incluindo
  `EditalSubjectsModal.tsx` com 2.129 linhas.
- [x] Confirmar que não há hoje plugin de fronteiras arquiteturais instalado.
- [x] Classificar os 41 imports diretos de Supabase em páginas/componentes
  entre acesso de apresentação indevido, componente-contêiner transitório,
  fluxo de autenticação e exceção arquitetural legítima.

## Classificação do baseline de UI

### Camada de dados legítima co-localizada — 2

São hooks, não componentes de apresentação. O gate deve classificá-los pela
responsabilidade/nome do módulo, não apenas pela pasta:

- `src/components/subjects/import-edital/useAiEditalExtraction.ts`
- `src/components/subjects/import-edital/useCatalogEditais.ts`

### Fronteira sensível de autenticação/infraestrutura — 5

Continuam no baseline até uma extração dedicada. Não devem ser movidos
mecanicamente porque mudanças de ownership de sessão já causaram regressões:

- `src/components/AppLayout.tsx`
- `src/components/AuthCallback.tsx`
- `src/pages/ConfirmEmail.tsx`
- `src/pages/Login.tsx`
- `src/pages/ResetPassword.tsx`

### Import morto — 1

- `src/components/study-cycle/StudyCycleSubjectCard.tsx` importa o cliente sem
  utilizá-lo. Removido na entrega do gate e não incluído no baseline.

### Dívida de alto risco — 22

Misturam UI com operação destrutiva, administração, múltiplas tabelas, Edge
Function ou regra crítica de domínio. Devem entrar no baseline, mas têm
prioridade de extração quando a respectiva área voltar a ser alterada:

- `src/components/AutomationSimulator.tsx`
- `src/components/GeneralNotesModal.tsx`
- `src/components/ImportadorQuestoes.tsx`
- `src/components/ResetCycleConfirmDialog.tsx`
- `src/components/admin/AdminAddEditalModal.tsx`
- `src/components/admin/AdminEditalSubjectsModal.tsx`
- `src/components/admin/EditRoleModal.tsx`
- `src/components/admin/UserActivityList.tsx`
- `src/components/editais/EditalSubjectsModal.tsx`
- `src/components/study-cycle/AllStudiesCompletedBanner.tsx`
- `src/components/study-cycle/StudyCycleContent.tsx`
- `src/components/study-plan/SubjectReactivationModal.tsx`
- `src/components/subjects/ImportEditalModal.tsx`
- `src/pages/Editais.tsx`
- `src/pages/Settings.tsx`
- `src/pages/admin/AISettings.tsx`
- `src/pages/admin/AdminEditais.tsx`
- `src/pages/admin/AdminFeedback.tsx`
- `src/pages/admin/AuditLogs.tsx`
- `src/pages/admin/PlanCouponManager.tsx`
- `src/pages/admin/UserManagement.tsx`
- `src/pages/admin/system/SystemErrors.tsx`

### Dívida de CRUD/consulta comum — 11

Também viola a separação de camadas, mas possui menor risco imediato que o
grupo anterior:

- `src/components/ContentUploadModal.tsx`
- `src/components/EditableTopicName.tsx`
- `src/components/dashboard-v2/DifficultyEvolutionWidget.tsx`
- `src/components/dashboard/CompactSubjectAccordion.tsx`
- `src/components/reviews/NotesModal.tsx`
- `src/components/reviews/SubjectNotesModal.tsx`
- `src/components/study-cycle/StudyCycleTopicNotesModal.tsx`
- `src/components/topics/CreateTopicModal.tsx`
- `src/components/topics/InlineTopicCreator.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Revisoes.tsx`

Resumo do baseline de produção: 2 módulos de dados legítimos, 5 fronteiras
sensíveis transitórias, 1 import morto, 22 dívidas de alto risco e 11 dívidas
comuns. Após remover o import morto e liberar os 2 hooks, o baseline inicial do
gate deve conter 38 arquivos.

## Decisão arquitetural

Não adicionar Biome nem outro linter nesta etapa. O ESLint atual já é gate
obrigatório e está sem warnings. O primeiro mecanismo deve usar baseline
explícito do legado e falhar somente quando uma violação nova for introduzida.

Não usar `warn` dentro do comando atual: com `--max-warnings=0`, isso seria uma
quebra imediata disfarçada de migração gradual.

## Primeira entrega proposta

### Regra 1 — impedir novo acesso Supabase na camada de UI

- [x] Criar verificação `no-new-direct-supabase-in-ui` para novos imports de
  `@/integrations/supabase/client` em `src/components/**/*.tsx` e
  `src/pages/**/*.tsx`.
- [x] Registrar os usos atuais em baseline revisável, sem considerar que todo
  item do baseline é uma exceção permanente.
- [x] Permitir hooks co-localizados (`use*.ts`/`use*.tsx`) somente quando forem
  explicitamente classificados como camada de dados, não pela pasta em que
  estão.
- [x] Exigir que novos acessos passem por hook, context ou service existente,
  conforme o domínio.

### Regra 2 — preservar pureza de `utils`

- [x] Impedir novos imports do cliente Supabase em `src/utils/**`.
- [x] Manter os 4 usos atuais no baseline até migração dedicada para
  hooks/services.

### Regra 3 — impedir novos monólitos

- [x] Rejeitar nova página acima de 700 linhas.
- [x] Não bloquear edição legítima nos 9 arquivos legados apenas por já serem
  grandes; impedir crescimento relevante deve ser avaliado separadamente para
  não criar falso positivo em correções pequenas.
- [x] Produzir relatório dos monólitos atuais, sem refatorá-los junto com a
  implantação do gate.

## Forma de implementação

- [x] Preferir script local pequeno, determinístico e testável, sem dependência
  nova, caso o ESLint não consiga representar o baseline por caminho sem uma
  lista frágil de overrides.
- [x] Adicionar comandos separados `architecture:report` e
  `architecture:check`.
- [x] Fazer `architecture:check` falhar apenas para regressões em relação ao
  baseline; `architecture:report` deve mostrar o passivo completo.
- [x] Adicionar testes com fixtures para import permitido, import proibido,
  alias relativo equivalente e nova página acima do limite.
- [x] Integrar `architecture:check` ao Quality Gate somente depois que os testes
  do verificador estiverem verdes.

## Migração posterior do legado

- [ ] Priorizar remoção de acesso direto ao Supabase em componentes puramente
  visuais tocados por features futuras; não abrir uma refatoração global.
- [ ] Extrair páginas acima de 700 linhas quando a próxima feature relevante
  tocar cada área, começando pela página que estiver na prioridade corrente do
  produto.
- [ ] Reduzir o baseline a cada extração e proibir reentrada do caminho
  removido.
- [ ] Avaliar regra de complexidade apenas depois das fronteiras de camada;
  complexidade genérica agora teria mais ruído do que sinal.

## Verificação da entrega

- [x] Testes do verificador arquitetural: 4 testes aprovados.
- [x] `npm run architecture:report` com contagens reproduzíveis: 2 módulos de
  dados permitidos, 38 dívidas de UI, 4 dívidas em utils e 9 páginas acima do
  limite.
- [x] `npm run architecture:check` sem regressões novas.
- [x] `npm run lint`.
- [ ] `npm run typecheck`: bloqueado por erros já presentes nas alterações
  locais de edital, ciclo e testes, fora deste recorte. O verificador não é
  referenciado pelo projeto TypeScript da aplicação.
- [x] `npm run test:run`: 189 arquivos e 740 testes aprovados.
- [x] `npm run build` antes de integrar o novo gate ao CI.

## Fora do escopo

- Refatorar de uma vez todos os componentes e páginas do baseline.
- Adotar Biome, Graphify, Obsidian ou hooks específicos do Claude Code.
- Usar contagem de linhas como substituto para revisão de coesão e regra de
  domínio.
