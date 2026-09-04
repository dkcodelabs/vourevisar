# Plano mestre do vouRevisar

> **Fonte única de prioridade operacional.** Atualizado em 2026-09-01 após inventário do repositório, Supabase remoto, Stripe Live e produção Vercel.
>
> Os documentos anteriores preservam decisões e evidências, mas não são listas de trabalho ativas. Toda pendência nova ou reclassificada deve ser registrada aqui.

## Como usar

- `[ ]` = trabalho ainda necessário.
- `[x]` = entregue e verificado no ambiente indicado.
- `Cancelado` = decisão de produto revogada; não reabrir por inércia.
- `Monitorar` = depende de uso real, não bloqueia a venda atual.
- Itens que exigem uma decisão, dado ou ação humana do fundador trazem **Responsável: fundador**. Não devem ser apresentados como algo que o código resolve sozinho.

## Estado da operação

### Pronto para operar e vender

- [x] Treino: recomendação única, auditável e dentro do edital/ciclo ativo; prática livre separada; geração de material explícita; feedback e conclusão atualizam a próxima recomendação sem inventar pendência.
- [x] Revisões: contratos de vencidas, hoje, futuras e feitas reutilizados nas superfícies corrigidas; a prática não reagenda a revisão espaçada silenciosamente.
- [x] Painel, Ciclo e Evolução: fluxo de decisão, ordenação natural de tópicos e métricas reais entregues.
- [x] Incidência/cobrança por prova: recurso removido por decisão de produto e custo inviável; tabelas, colunas, serviços e Edge Function foram eliminados do caminho ativo.
- [x] Banco: migrations aplicadas, índices de FKs e políticas RLS revisadas; não há função `SECURITY DEFINER` executável diretamente por aluno.
- [x] Cobrança Stripe Live: catálogo, webhook, contrato versionado, arrependimento, portal, histórico e funções de billing publicados. O endpoint Live respondeu sem falhas na inspeção realizada em 2026-08-31.
- [x] Release: `main` no commit `12fd4c11`; produção Vercel servindo o bundle que contém a versão legal `2026-08-31.1`.
- [x] Qualidade do corte: 839 testes, lint, typecheck e build concluídos sem falha; a suíte registra apenas o aviso conhecido de `Window.scrollTo` não implementado pelo ambiente jsdom.

## Ordem operacional atual

### Fila executável atual

Não há implementação nova aprovada nesta etapa. O baseline arquitetural está zerado e as próximas ações dependem de dados reais, configuração do plano Supabase ou decisão explícita de produto.

Importação, merge, ordenação, canal de suporte, matriz de acesso, revisão visual e recortes arquiteturais foram validados e removidos da fila executável.

### Exige ação externa do fundador — não é questão de tempo de uso

1. **Revisão jurídica independente.** Pacote jurídico, textos e fluxo foram revisados tecnicamente e estão prontos para o corte de venda em 2026-09-01. A conferência posterior com advogado permanece recomendada como melhoria de conformidade, mas não bloqueia o lançamento.

### Depende de uso real — pós-venda, não bloqueia o início

1. **Monitorar adoção, recorrência e custo do Treino** após existir uma base relevante de alunos.
2. **Ativar proteção contra senhas vazadas** quando o plano Supabase contratado disponibilizar o recurso.
3. **Avaliar índices administrativos e financeiros** somente com volume e planos de consulta observados.

## Prioridade 0 — proteger a operação comercial

Estes itens não impedem o software de receber alunos hoje, mas não devem ser ignorados ao aumentar aquisição ou volume financeiro.

- [x] **Revisão jurídica para o corte de venda.** O pacote de Termos, Privacidade, Cancelamento e fluxo de arrependimento foi revisado tecnicamente e os documentos versionados estão publicados. A validação jurídica profissional posterior fica como recomendação de conformidade, sem bloquear a operação inicial.
- [x] **Homologação financeira controlada.** Os ensaios anteriores já comprovam mensal/anual e `invoice.payment_failed` no Stripe Test; o código mantém tentativa/ledger idempotentes e o teste de segurança passou em 2026-08-31. O projeto Supabase de Teste foi recriado com a linha atual (`cvnscypxftovmhcaneua`), recebeu as migrations/functions e está sem erros de schema. O destino Stripe Test `vouRevisar Billing Test` já aponta para `stripe-webhook`, escuta 16 eventos e teve o segredo de assinatura configurado em 2026-08-31. A Stripe CLI foi autenticada em modo Teste em 2026-08-31. Entregas de fixtures genéricas de reembolso retornaram 200; as fixtures genéricas de `invoice.paid`/`customer.subscription.created` falharam por não possuírem assinatura local vinculada. Foi criada a conta descartável `billing.homologacao.2@vourevisar.com.br`; o laboratório local estava em `8082` e o CORS foi corrigido no `APP_URL` do Teste. Checkout mensal real foi concluído em 2026-09-01: `billing_checkout_attempts=complete`, `billing_subscriptions=active`, e os eventos `checkout.session.completed`, `invoice.paid` e `customer.subscription.created` foram processados com sucesso no ledger. A causa do loop de confirmação foi a ausência de `user-rpc` no projeto novo; a função foi publicada e o preflight CORS em `8082` retornou 200 em 2026-09-01. O evento real de checkout foi reenviado pela Stripe CLI e o ledger permaneceu idempotente, sem nova linha ou duplicação de assinatura. Em seguida, a assinatura real de Teste foi marcada para cancelamento ao fim do período e o `customer.subscription.updated` foi processado, mantendo o acesso até `2026-10-01`. O pagamento inicial foi reembolsado integralmente (`re_3UAfYpQ2ZdcaFdY41bjbCHYB`, status `succeeded`); os eventos de reembolso foram recebidos e classificados como `ignored` pelo ledger, sem erro nem duplicação. O reenvio tardio dos eventos históricos `customer.subscription.created` e `invoice.paid`, depois do cancelamento e reembolso, foi executado em ordem inversa à entrega original: ambos foram processados uma vez, sem duplicação, e a assinatura permaneceu com cancelamento ao fim do período. O retry de cobrança foi validado com Test Clock e assinatura real de homologação: um cartão de falha levou a cobrança recorrente a `invoice.payment_failed`, a assinatura local foi sincronizada para `past_due` e o evento foi processado uma vez no ledger. Durante o ensaio foi identificado e corrigido o último desvio de configuração: o endpoint Stripe não escutava `invoice.payment_failed`; o evento foi adicionado à lista de 17 eventos e o histórico falho foi reenviado com sucesso.
- [x] **Validação autenticada de acesso.** Em 2026-08-31, o perfil aluno pago foi validado em desktop: acesso ao Painel, assinatura em fim de período e Customer Portal Live abriram corretamente. Em 2026-09-01, o projeto de Teste comprovou `trial` ativo, bloqueio sem concessão, assinatura Stripe vencida (`canceled`) e isolamento entre usuários (tentativa cruzada retorna 403). A conta proprietária também abriu a navegação administrativa no aplicativo. A rota de confirmação foi validada em viewport móvel e o Auth recusou uma conta não confirmada sem emitir sessão.
- [x] **Conferir retorno completo de Checkout em Safari real.** Em 2026-09-01, Safari abriu a confirmação de e-mail corretamente e preservou a sessão autenticada, redirecionando `/login` ao Painel. O Checkout mensal de Teste foi concluído no Safari com a conta descartável: o retorno exibiu `Assinatura ativada`, a assinatura ficou `active` e os eventos `checkout.session.completed` e `customer.subscription.created` foram processados uma vez no ledger. Não há alteração pendente de código.
- [x] **Corrigir e retestar o resumo de assinatura Live.** Em 2026-08-31, a migration `20260831210950` removeu a comparação indevida entre `updated_at` da assinatura e do cliente, preservando ownership e `livemode`. Foi publicada no Supabase; o RPC retornou a assinatura mensal ativa e o aluno abriu o Painel em produção com o selo `Plano mensal`.
- [x] **Canal de suporte real.** O canal definido é `vourevisar@gmail.com`; CTAs de login, feedback, central do aluno e contato já usam e-mail. Em 2026-09-01, a página `/contato` em produção exibiu o `mailto:` correto, sem WhatsApp e sem erros de console, fora da sessão e dentro de uma conta de aluno comum. Em 2026-09-01, a conta de ensaio `darciliok@proton.me` foi suspensa no admin; o estado bloqueado exibiu o CTA de planos e a Central do Aluno abriu o link `mailto:vourevisar@gmail.com`. A reativação foi corrigida em 2026-09-01 no Edge Function `admin-rpc`, com atualização explícita do perfil e auditoria; o menu passou a mostrar a conta novamente ativa. O ensaio foi concluído sem alterar cobrança Stripe. **Responsável: fundador** mantém a caixa postal; não foi enviada uma solicitação real.
- [x] **Remover claims públicos sem evidência verificável.** Em 2026-09-01, os números “milhares de estudantes” e “98% de retenção” foram substituídos por proposta de valor concreta. A referência semelhante no Catálogo também foi removida.

## Prioridade 1 — limpeza técnica segura

### Concluído nesta auditoria

- [x] Remover a configuração local morta de `process-topic-incidence` em `supabase/config.toml`; ela apontava para uma Edge Function já apagada.
- [x] Confirmar que `process-topic-incidence` não existe entre as Edge Functions remotas ativas.
- [x] Confirmar que os resíduos de Asaas estão somente em `supabase/migrations_legacy/`, preservados como histórico não executável, e não no runtime Stripe.

### Próximos recortes, sem apagar comportamento ativo

- [x] Remover a página Cadernos do produto ativo: rota redireciona para o Ciclo de Estudos, item removido das duas variantes de navegação e o bundle deixou de carregar `src/pages/Cadernos.tsx`. Os dados legados de anotações permanecem preservados para não apagar histórico.
- [x] Remover componentes sem consumidor confirmado: `SubscriptionTester.tsx`, `ProfileTester.tsx` e `ImportadorQuestoes.tsx`; não havia importador ativo dessas telas na árvore atual.
- [x] Atualizar `scripts/architecture-baseline.json` depois da remoção de `AutomationSimulator.tsx`, que ainda estava listado apesar de já ter sido excluído.
- [x] Manter as duas galerias internas de componentes acessíveis somente a administradores pelo menu, sem transformar referências visuais em navegação do aluno.
- [x] Criar um modelo reutilizável de alerta persistente com ação, inspirado na referência enviada, e documentá-lo na galeria administrativa de componentes com estados responsivos. Em 2026-09-03, `ActionAlert` foi adicionado com variantes semânticas, CTA por link ou botão e cobertura automatizada; a rota admin `/reveal-cards` foi conferida em 1440x900 e 375x812, nos temas claro/escuro, sem overflow ou erros de console.
- [x] Remover `generate-questions`: o frontend atual não o invoca e a auditoria remota em 2026-08-31 encontrou zero registros em `api_usage` para esse endpoint. A função usava um contrato de geração antigo, independente do fluxo atual de prática.
- [x] Remover o subgrupo sem consumidor do calendário fixo: `sessionUtils`, sessão antiga, `Ciclo V2` paralelo e widgets de dashboard/revisões que não tinham rota nem importador. As tabelas de `study_cycles_v2` ficam para uma migration própria após auditoria de dados remotos.
- [x] Remover `REVIEW_PROFILES` dos consumidores ativos: Configurações não grava mais perfil fixo; Mentor e Histórico leem o teto/agenda do motor adaptativo. A coluna `user_settings.review_profile` permanece somente para compatibilidade até a migration final de schema.
- [x] Excluir backups locais `*.backup.*` e `*.original.*` do typecheck; eles são ignorados pelo Git e não devem virar código compilável por estarem dentro de `src/`.
- [x] Reduzir o baseline arquitetural em recortes: registro histórico da auditoria inicial e dos recortes concluídos. O estado atual está documentado na evidência incremental abaixo: 0 páginas acima de 700 linhas, 0 acessos diretos ao Supabase na UI e 0 utilitários com acesso direto; novos monólitos devem ser impedidos pelo gate.
- [x] Recuperar o typecheck global do Treino: corrigido `PracticeFormat` ausente em `PracticeSessionDialog`, fixture incompleto de `PracticeOverview` e uso de `Array.at`, incompatível com o alvo ES2020.
- [x] Corrigir os avisos restantes do `supabase db lint` nas RPCs transacionais `atomic_delete_subject`, `reset_edital_study_progress`, `atomic_cycle_load`, `atomic_archive_edital_from_cycle`, `revert_subject_merge`, `revert_topic_merge` e `sync_topic_merge_progress`. Em 2026-08-31, a migration `20260831212253` tornou explícitos os defaults de array e removeu somente três variáveis usadas como existência; os contratos de ciclo/merge passaram e o lint remoto retornou sem erros de schema.

## Prioridade 2 — lacunas funcionais já conhecidas

- [x] Unificar a identidade de marca no runtime: a logo antiga, a animação de entrada, o fallback de rota e o loader foram substituídos pelo mesmo símbolo vetorial responsivo aos temas claro/escuro. O kit inclui SVG/PNG, versões transparentes do símbolo com `R` claro/escuro e imagem social 1200×630; o símbolo pode ser usado sem o nome e o wordmark não colore mais “Revisar” de azul. `prefers-reduced-motion` elimina o movimento não essencial. Em 2026-09-01, favicon com URL versionada, ícones 32/180/192/512, manifest e imagem social foram gerados e conferidos; o novo símbolo claro foi publicado no Storage de produção em `email-assets/vourevisar-mark-dark-v1.png`, e `send-auth-email` v99 foi publicado e verificado como `ACTIVE` com `verify_jwt=false`, preservando a autenticação própria do webhook. Os arquivos locais provisórios/duplicados e o objeto remoto antigo `email-assets/logoEmail.png` foram removidos depois da confirmação de que não tinham consumidores. Os carregamentos agora usam somente o símbolo, com traço de entrada único e sem loop; a rota `/dashboard` só monta o `AppLayout` depois de confirmar o acesso, evitando indicador concorrente na lateral.
- [x] Concluir a regra e a validação autenticada da transição do primeiro contato. Em produção, em 2026-08-31, o aluno pagante importou pelo Catálogo o edital Casa da Moeda (2 matérias, 18 tópicos), carregou o ciclo, concluiu `I. Compreensão de texto` como Médio e recebeu corretamente 1 revisão futura desse mesmo tópico. O Painel inicialmente expôs que a seleção repetia PORTUGUÊS; a regra foi corrigida para priorizar a matéria ativa com menos tópicos iniciados, usando a ordem do ciclo como desempate. Após o deploy `5c32acb8`, o mesmo Painel passou a recomendar `MATEMÁTICA — I. Conjuntos numéricos`; o ciclo permaneceu em 1/18 iniciados.
- [x] Completar a matriz de estados de entrada e acesso: em 2026-08-31, o estado `sem edital` foi validado em produção com CTA para adicionar edital; a conta paga e o Portal também foram validados. Em 2026-09-01, trial, assinatura vencida, admin, estados vazios e retry/reconexão passaram na cobertura automatizada e o Dashboard autenticado renderizou em desktop/mobile. A cobertura agora classifica explicitamente os quatro estados persistidos (`sem edital`, `edital vazio`, `edital com conteúdo fora do ciclo` e `ciclo carregado`) e cobre o CTA `Completar edital`. Em uma conta de aluno, foi criado e removido o edital manual descartável `VALIDACAO DESCARTAVEL` sem matérias/tópicos, confirmando a persistência do estado vazio; em 2026-09-01, o edital de catálogo `Polícia Federal — Perito Criminal Federal - Área 5: Geologia Forense (2025)` foi persistido com 9 matérias e 309 tópicos, enquanto o ciclo ativo permaneceu `Casa da Moeda do Brasil — Técnico de Segurança (2023)`, confirmando o estado de conteúdo fora do ciclo. Também foi criado e persistido o edital manual `VALIDAÇÃO CICLO VAZIO - Ensaio técnico`, com 0 matérias e 0 tópicos; a UI corretamente não ofereceu `Carregar Ciclo`, impedindo a criação de um ciclo vazio por fluxo suportado. A matriz está encerrada com a proteção existente; não é necessário criar uma rota de teste artificial.
- [x] Validar com editais reais variados a extração, o merge e a ordenação, registrando novas variações estruturais nos perfis de banca em vez de criar exceção de tela. Em 2026-09-01, os testes cobrem importação de duas matérias com hierarquias mistas, normalização de `Língua Portuguesa`/`Português`, bloqueio de duplicata da mesma fonte e ordenação natural; em 2026-09-01, além do edital Casa da Moeda já existente, foi importado e persistido o edital de catálogo `Polícia Federal — Perito Criminal Federal - Área 5: Geologia Forense (2025)`, com estrutura distinta (9 matérias/309 tópicos); em 2026-09-01, com a conta de ensaio em teste gratuito, dois editais distintos da Polícia Federal foram combinados no mesmo ciclo. Após a análise semântica, o ciclo persistiu e, depois de recarregar a página, continuou com 2 editais, 18 matérias, 421 tópicos e matérias marcadas como `Unificada`, confirmando que o resultado não dependia apenas do estado local do modal. O serviço impõe timeout de 20s por chamada de matérias e tópicos e orçamento de 45s para o lote de tópicos, concluindo com fallback determinístico e aviso visível em vez de deixar o modal em carregamento indefinido.
- [x] Tratar revisões manuais após a quarta revisão como contato distinto, sem corromper o programa adaptativo já concluído. Em 2026-09-01, os limites do motor (primeiro contato, R1–R4, encerramento após o quarto intervalo) e os contratos de agenda passaram nos testes focados; a sequência completa de cinco contatos também está coberta por teste determinístico com estado persistível entre etapas. No projeto Supabase de Teste, em 2026-09-01, foi executada uma transação controlada que persistiu sucessivamente R1, R2, R3, R4 e `Concluído` (`review_count=5`, `total_reviews=5`, `completed=true`, `next_review=NULL`), confirmou o estado final no banco e fez `ROLLBACK`, deixando zero fixtures restantes. Em 2026-09-01, uma 1ª revisão também foi registrada na conta de ensaio pelo fluxo real; a agenda persistida mudou de `Hoje 1` para `Hoje 0 / Futuras 1`, sem erro.
- [x] Fazer auditoria final da semântica de conclusão em calendários e componentes legados antes de retirar o motor de revisão fixa. Em 2026-09-01, a busca no runtime confirmou que `study_cycles_v2` não é lida por telas, hooks ou services; resta apenas a limpeza explícita de conta em `Settings.tsx` e o histórico de migrations. Nenhum motor foi apagado nesta auditoria.
- [x] Revisar responsividade e copy dos estados críticos de onboarding, assinatura e erro após cada recorte funcional, sem redesign decorativo. Em 2026-09-01, Dashboard, Ciclo de Estudos, `/conta/assinatura`, `/confirm-email`, `/revisoes` e `/cadernos` foram conferidos em 375x812 e 1440x900: nenhuma tela apresentou overflow horizontal (`scrollWidth` ficou abaixo da largura útil), os CTAs e estados vazios carregaram com hierarquia legível e o copy foi revisado. O `NetworkStatusOverlay` tem cobertura automatizada para falha de carga e transição offline/online; a inspeção visual confirmou os estados de carregamento e a composição responsiva.

## Pós-venda — monitorar, não bloquear

- [ ] **Monitorar adoção real do Treino.** Executar `supabase/snippets/practice_adoption_report.sql` semanalmente depois de haver base relevante e acompanhar recorrência, tentativa, conclusão, qualidade e custo de geração. Não otimizar recomendação com a amostra atual de três usuários.
- [ ] **Ativar proteção contra senhas vazadas.** Habilitar a opção de proteção do Supabase quando o plano contratado suportar o recurso. **Responsável: fundador** pela mudança de plano.
- [x] Avaliar índices adicionais de módulos administrativos e financeiros somente após observar volume/planos de consulta reais; não criar índices por suposição. A leitura dos contadores reais no Supabase em 2026-09-04 mostrou uso relevante nos índices de `admin_error_events`, `billing_access_grants`, `billing_checkout_attempts`, `billing_contract_acceptances`, `billing_refund_requests` e `billing_subscriptions`; não há evidência atual para criar índices adicionais. Índices não utilizados não foram removidos sem análise de consultas e janela de observação.

### Evidência incremental do baseline — 2026-09-03

- Baseline atual: 0 páginas acima de 700 linhas; `Editais` foi removido após chegar a 699 linhas.
- `SystemErrors` avançou de 847 para 824 linhas no primeiro recorte ao mover cores/labels de severidade, status, escopo e formatação de datas para `systemErrorsPresentation.ts`; o diálogo detalhado foi extraído na etapa seguinte.
- `SystemErrors` saiu do baseline após extrair o diálogo detalhado para `SystemErrorDetailsDialog.tsx`, preservando classificação, playbook e ações de status; a página caiu de 847 para 666 linhas.
- `UserManagement` teve a filtragem/ordenação e o badge de papel extraídos para `UserManagementPresentation.tsx`, reduzindo a página de 934 para 898 linhas no primeiro recorte; o recorte foi concluído na etapa seguinte.
- `UserManagement` saiu do baseline em novo recorte: ações de status/senha foram movidas para `useUserAccountActions.ts` e arquivamento/restauração/exclusão para `useUserLifecycleActions.ts`, reduzindo a página de 934 para 700 linhas. O comportamento destrutivo continua explícito nos handlers/hooks e protegido pelos RPCs administrativos.
- `Subjects` avançou com a persistência/evento/cache de renomeação do ciclo extraídos para `useSubjectsCycleName.ts`; o fluxo mantém atualização otimista e tratamento de erro, e a página permanece pendente com 801 linhas.
- `Subjects` avançou novamente com a persistência e sincronização do nome de matérias unificadas extraídas para `useUnifiedSubjectNameSave.ts`; typecheck, lint, arquitetura e diff passaram. A página permanece pendente com 778 linhas.
- `Subjects` avançou com os handlers de navegação, estudo de tópico e foco estratégico extraídos para `useSubjectsNavigationActions.ts`; typecheck, lint, arquitetura e diff passaram. A página caiu para 753 linhas.
- `Subjects` saiu do baseline após compactar a montagem estrutural e consolidar os recortes de ciclo/navegação, chegando a 695 linhas. A lógica de domínio permanece nos hooks e serviços extraídos; typecheck, lint, arquitetura e `git diff --check` passaram.
- `Editais` avançou com exclusão profunda e remoção do edital do ciclo extraídas para `useEditalLifecycleActions.ts`, preservando sincronização de merges, limpeza de sugestões, cache e eventos. A página caiu de 2.935 para 2.864 linhas; typecheck, lint e `git diff --check` passaram.
- `Editais` avançou novamente com o salvamento de metadados e recálculo de revisões extraídos para `useEditalMetadataActions.ts`; typecheck, lint e `git diff --check` passaram. A página caiu para 2.827 linhas.
- `Editais` avançou com a mesclagem manual extraída para `useEditalManualMerge.ts`, preservando criação do edital mesclado, remoção dos originais, limpeza de sugestões e atualização da seleção. A página caiu para 2.811 linhas; typecheck, lint e `git diff --check` passaram.
- `Editais` avançou com a finalização pós-mesclagem extraída para `useCycleSuccessNavigation.ts`, preservando atualização de nome/data, modo de substituição, limpeza do estado e navegação para o ciclo. A página caiu para 2.774 linhas; typecheck, lint e `git diff --check` passaram.
- `Editais` avançou com a conclusão de importação extraída para `useEditalImportCompletion.ts`, preservando persistência, refresh paralelo, abertura de matérias, eventos e fallback de refresh parcial. A página caiu para 2.707 linhas; typecheck, lint e `git diff --check` passaram.
- `Editais` avançou com o preparo da sincronização extraído para `useEditalSyncPreparation.ts`, preservando consultas paralelas, montagem do `SyncReview` e tratamento de erro. A página caiu para 2.643 linhas; typecheck, lint e `git diff --check` passaram.
- `Editais` avançou com a aplicação da sincronização extraída para `useEditalSyncApplication.ts`, preservando persistência de assuntos/tópicos, metadados, snapshot da fonte, refresh e fechamento do modal. A página caiu para 2.588 linhas; typecheck, lint e `git diff --check` passaram.
- `Editais` avançou com a atualização otimista do edital extraída para `useEditalUpdateAction.ts`, preservando persistência de matérias/metadados e sincronização da lista local. A página caiu para 2.576 linhas; typecheck, lint e `git diff --check` passaram.
- `Editais` avançou com prévia híbrida, análise de tópicos e equivalência manual extraídas para `useEditaisTopicMergePreviews.ts`, preservando rascunhos, estados de processamento, fallback de IA e feedback de classificação. A página caiu para 2.403 linhas; typecheck, lint e `git diff --check` passaram.
- `Editais` avançou com a finalização estrutural do ciclo extraída para `useCycleConflictAction.ts`, preservando merge físico, RPC atômico, retomada de revisões, progresso, eventos e estados de processamento. A página caiu para 2.195 linhas; typecheck, lint, arquitetura e `git diff --check` passaram.
- `Editais` avançou com carregamento/recuperação do ciclo extraídos para `useEditalCycleLoad.ts`, preservando merge pendente, detecção de conflitos, origens manuais e resumo de progresso. A página caiu para 2.100 linhas; typecheck, lint, arquitetura e `git diff --check` passaram.
- `Editais` avançou com as ações do cabeçalho extraídas para `EditaisHeaderActions.tsx`, preservando mesclagem manual, seleção e abertura das três modalidades de criação/importação. A página caiu para 2.048 linhas; typecheck, lint, arquitetura e `git diff --check` passaram.
- `Editais` avançou com o estado vazio e onboarding de entrada extraídos para `EditaisEmptyState.tsx`, preservando catálogo, IA, criação manual, filtro e limpeza de sugestões órfãs. A página caiu para 1.953 linhas; typecheck, lint, arquitetura e `git diff --check` passaram.
- `Editais` avançou com os avisos de recuperação/indisponibilidade de IA extraídos para `CycleConflictFeedbackNotices.tsx`, preservando descarte de mesclagem recuperada e mensagens de fallback. A página caiu para 1.892 linhas; typecheck, lint, arquitetura e `git diff --check` passaram.
- `Editais` avançou com o cabeçalho e a navegação do modal de conflito extraídos para `CycleConflictModalHeader.tsx`, preservando progressão, retorno, títulos por etapa e bloqueios de fechamento. A página caiu para 1.834 linhas; typecheck, lint, arquitetura e `git diff --check` passaram.
- `Editais` avançou com o rodapé de decisões do modal de conflito extraído para `CycleConflictModalFooter.tsx`, preservando carregar, substituir, mesclar, processar tópicos e abrir o ciclo. A página caiu para 1.685 linhas; typecheck, lint, arquitetura, 213 arquivos/839 testes, build e `git diff --check` passaram.
- `Editais` avançou com o overlay de processamento do modal extraído para `CycleConflictProcessingOverlay.tsx`, preservando fases, mensagem, progresso e bloqueio visual durante operações estruturais. A página caiu para 1.648 linhas; typecheck, lint, arquitetura, build e `git diff --check` passaram.
- `Editais` avançou com a seção de matérias já presentes no ciclo extraída para `CycleCurrentSubjectsSection.tsx`, preservando agrupamento por origem, tratamento de origem manual e contagem visual. A página caiu para 1.603 linhas; typecheck, lint, arquitetura e `git diff --check` passaram.
- `Editais` avançou com a seção do novo edital extraída para `CycleNewEditalSection.tsx`, preservando expansão de tópicos, ordenação, contagem e cartões de progresso. A página caiu para 1.519 linhas; typecheck, lint, arquitetura, 213 arquivos/839 testes, build e `git diff --check` passaram.
- `Editais` avançou com o preview de unificação de tópicos extraído para `CycleTopicPreviewSection.tsx`, preservando filtro de sugestões IA, aprovação/rejeição e expansão dos grupos. A página caiu para 1.437 linhas; typecheck, lint, arquitetura, 213 arquivos/839 testes, build e `git diff --check` passaram.
- `Editais` avançou com o resumo de sucesso extraído para `CycleSuccessSummary.tsx`, preservando estatísticas, fontes, nome/data do ciclo e estados de substituição. A página caiu para 1.241 linhas; typecheck, lint, arquitetura, 213 arquivos/839 testes, build e `git diff --check` passaram.
- `Editais` avançou com o preview de substituição extraído para `CycleReplacementPreview.tsx`, removendo o ramo morto de mesclagem dentro desse caminho e preservando matérias novas/removidas, tópicos e expansão. A página caiu para 1.055 linhas; typecheck, lint, arquitetura, 213 arquivos/839 testes, build e `git diff --check` passaram.
- `Editais` avançou com os modais de confirmação de exclusão profunda e remoção do ciclo extraídos para `EditaisConfirmDialogs.tsx`, preservando bloqueios, mensagens de impacto e confirmação assíncrona. A página caiu para 903 linhas; typecheck, lint, arquitetura, 213 arquivos/839 testes, build e `git diff --check` passaram.
- `Editais` avançou com a listagem e derivação dos cards extraídas para `EditaisCardGrid.tsx` e `editaisCardPresentation.ts`, preservando métricas, atualização de catálogo, callbacks e progresso de remoção. Também foi removido estado morto de expansão. A página caiu para 771 linhas; typecheck, lint, arquitetura e `git diff --check` passaram.
- `Editais` avançou com os modais secundários de importação e matérias extraídos para `EditaisSecondaryModals.tsx`. A página permanece em 771 linhas após a limpeza do estado morto; typecheck, lint, arquitetura, 213 arquivos/839 testes, build e `git diff --check` passaram.
- `Editais` saiu do baseline após extrair o fechamento do conflito para `useCycleConflictClose.ts`, a seleção para `useEditalSelection.ts` e a composição do cabeçalho informativo para `EditaisListHeader.tsx`. A página chegou a 699 linhas; o baseline foi atualizado para zero páginas acima do limite.
- `Editais` avançou com a listagem de cards extraída para `EditaisCardGrid.tsx`, a derivação de atualização de catálogo para `editaisCardPresentation.ts` e a seleção para `useEditalSelection.ts`; a página chegou a 699 linhas e o baseline arquitetural foi zerado. Typecheck, lint, arquitetura, build, suíte completa e `git diff --check` passaram.
- Validação final do P0: `Editais` permanece em 699 linhas, o architecture gate retorna 0 páginas acima do limite e a suíte isolada confirmou 213 arquivos/839 testes aprovados. Build, typecheck, lint e `git diff --check` também passaram.
- Próxima pendência operacional conferida: o relatório `supabase/snippets/practice_adoption_report.sql` está pronto para leitura agregada, mas a execução depende de acesso autenticado ao SQL Editor/CLI do projeto Supabase; este ambiente não possui credenciais, conexão PostgreSQL ou sessão do painel. Não foram inventados números nem criadas fixtures.
- Medição real do Treino executada em 2026-09-04 no projeto Supabase vinculado, em modo somente leitura, para a janela iniciada em 2026-08-28: 3 usuários, 57 sessões, 31 sessões com tentativa (54,4%), 19 concluídas (33,3%), 59 tentativas, 1 usuário ativo em 2+ dias; geração: 7 execuções, todas concluídas, 70 itens aceitos, 7 avaliações positivas, nenhuma negativa, custo estimado total de US$ 0,13881. A amostra continua pequena; a pendência de monitoramento recorrente permanece aberta e nenhuma recomendação foi otimizada com estes dados.
- Avaliação de índices administrativos/financeiros executada em 2026-09-04 com `pg_stat_user_indexes` e advisor de performance do projeto vinculado. Os índices de maior uso estão concentrados nas consultas já exercitadas; os avisos de índice não utilizado são candidatos a investigação futura, não remoção automática. Nenhuma alteração de schema foi feita.
- Monitoramento semanal do Treino agendado em 2026-09-04 na automação do task (`monitorar-ado-o-do-treino`), com execução somente leitura, comparação com esta evidência e notificação apenas em mudança relevante, falha ou ação necessária.

## Backlog de produto — não faz parte do corte de venda

- [ ] Cadernos com IA: a página Cadernos foi removida do produto ativo por não haver uso definido. Só reabrir este item quando houver caso de uso que não duplique Treino, Revisões ou geração de material.
- [ ] Radar de concursos/notícias: somente com fonte autorizada, cache, data de coleta e sem alimentar ciclo automaticamente.
- [ ] Histórico comparativo entre ciclos, somente quando houver dados suficientes para uma comparação honesta.
- [ ] Seleção assistida de matérias no carregamento do ciclo, preservando o padrão simples de carregar todas.
- [ ] Programa de divulgação/afiliados: a base existe; validar uma primeira venda Live com código antes de ampliar a área.

## Decisões encerradas

- **Incidência de cobrança via web/IA:** Cancelado. Não recriar processamento diário, fila, base global ou métricas sem uma nova proposta com custo, fonte e retorno comprovados.
- **Asaas:** Encerrado. Stripe é o domínio financeiro ativo. Arquivos em `supabase/migrations_legacy/` são histórico de migrations e não devem ser “limpos” com alteração no banco.
- **Banco global de questões/flashcards:** Adiado. A prática atual usa material privado e geração explícita; não criar catálogo global sem estratégia de qualidade, direitos e custo.
- **Índices por previsão:** Adiado. Índices novos dependem de volume observado e plano de consulta.

## Documentos de referência arquivados

Os seguintes arquivos preservam especificações e evidências; não são backlog operacional:

- `billing-consumer-cancellation-refund-plan.md`
- `billing-checkout-recovery-plan.md`
- `painel-treino-evolucao-plan.md`
- `study-cycle-strategic-page-plan.md`
- `edital-import-reliability-plan.md` e `edital-import-ux-plan.md`
- `architectural-quality-gates-plan.md`
- `incidence-metric-contract.md`
- `deployment-release-checklist.md`

## Regra de encerramento de cada item

Só marcar como concluído após registrar: alteração entregue (quando aplicável), testes proporcionais ao risco, migration/Edge Function publicada quando houver backend e validação visível no fluxo afetado. Para itens externos, registrar a evidência do responsável; nunca marcar como concluído apenas porque há intenção de fazê-lo.
