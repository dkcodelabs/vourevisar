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
- [x] Qualidade do corte: 833 testes, lint e build concluídos sem falha em 2026-09-01; a suíte registra apenas o aviso conhecido de `Window.scrollTo` não implementado pelo ambiente jsdom.

## Ordem operacional atual

### Executável agora — não depende de tempo real

1. **Fechar a matriz restante de entrada e acesso.** Validar com contas descartáveis: edital vazio, edital fora do ciclo, ciclo vazio e falha/reconexão. Trial, assinatura vencida e admin já foram comprovados; não alterar o progresso da conta do fundador.
2. **Simular quarta revisão e revisão manual.** Criar agenda/histórico controlados no ambiente de Teste e confirmar que o contato adicional não encerra nem reinicia incorretamente o programa adaptativo.
3. **Revisar responsividade e copy dos estados críticos.** Conferir desktop e mobile em onboarding, assinatura, erro/reconexão e estados vazios, mantendo CTAs existentes.
4. **Reduzir o baseline arquitetural em recortes.** Começar por `Editais.tsx`, depois `Revisoes.tsx` e áreas administrativas, extraindo persistência para hooks/services sem refatoração massiva.

Importação, merge, ordenação e canal de suporte foram validados e removidos da fila executável em 2026-09-01.

### Exige ação externa do fundador — não é questão de tempo de uso

1. **Revisão jurídica independente.** Confirmar identidade final do fornecedor, canais, documentos e interpretação da janela de arrependimento com profissional jurídico.

### Depende de uso real — pós-venda, não bloqueia o início

1. **Monitorar adoção, recorrência e custo do Treino** após existir uma base relevante de alunos.
2. **Ativar proteção contra senhas vazadas** quando o plano Supabase contratado disponibilizar o recurso.
3. **Avaliar índices administrativos e financeiros** somente com volume e planos de consulta observados.

## Prioridade 0 — proteger a operação comercial

Estes itens não impedem o software de receber alunos hoje, mas não devem ser ignorados ao aumentar aquisição ou volume financeiro.

- [ ] **Revisão jurídica independente.** Confirmar identidade final do fornecedor, canais de atendimento, textos de Termos/Privacidade/Cancelamento, retenção de aceites e interpretação da janela de arrependimento. **Responsável: fundador com profissional jurídico.** O código e os documentos versionados já existem; esta validação não pode ser fingida por teste automatizado.
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

- [x] Remover componentes sem consumidor confirmado: `SubscriptionTester.tsx`, `ProfileTester.tsx` e `ImportadorQuestoes.tsx`; não havia importador ativo dessas telas na árvore atual.
- [x] Atualizar `scripts/architecture-baseline.json` depois da remoção de `AutomationSimulator.tsx`, que ainda estava listado apesar de já ter sido excluído.
- [x] Manter as duas galerias internas de componentes acessíveis somente a administradores pelo menu, sem transformar referências visuais em navegação do aluno.
- [x] Remover `generate-questions`: o frontend atual não o invoca e a auditoria remota em 2026-08-31 encontrou zero registros em `api_usage` para esse endpoint. A função usava um contrato de geração antigo, independente do fluxo atual de prática.
- [x] Remover o subgrupo sem consumidor do calendário fixo: `sessionUtils`, sessão antiga, `Ciclo V2` paralelo e widgets de dashboard/revisões que não tinham rota nem importador. As tabelas de `study_cycles_v2` ficam para uma migration própria após auditoria de dados remotos.
- [x] Remover `REVIEW_PROFILES` dos consumidores ativos: Configurações não grava mais perfil fixo; Mentor e Histórico leem o teto/agenda do motor adaptativo. A coluna `user_settings.review_profile` permanece somente para compatibilidade até a migration final de schema.
- [x] Excluir backups locais `*.backup.*` e `*.original.*` do typecheck; eles são ignorados pelo Git e não devem virar código compilável por estarem dentro de `src/`.
- [ ] Reduzir o baseline arquitetural em recortes: 34 acessos diretos ao Supabase em UI, 3 em utilitários e 9 páginas acima de 700 linhas (medição de 2026-09-01). O carregamento de Editais já está isolado em `editaisPageService.ts`, com teste de escopo por usuário e propagação de erro; as consultas de histórico, tendências e duração de primeiro contato de `Revisoes.tsx` agora estão em `reviewsPageDataService.ts`, também com cobertura de escopo e dados inválidos. O baseline foi reconciliado e o `architecture:check` passou sem drift; outras consultas diretas continuam na UI. Próximo recorte: áreas administrativas.
- [x] Recuperar o typecheck global do Treino: corrigido `PracticeFormat` ausente em `PracticeSessionDialog`, fixture incompleto de `PracticeOverview` e uso de `Array.at`, incompatível com o alvo ES2020.
- [x] Corrigir os avisos restantes do `supabase db lint` nas RPCs transacionais `atomic_delete_subject`, `reset_edital_study_progress`, `atomic_cycle_load`, `atomic_archive_edital_from_cycle`, `revert_subject_merge`, `revert_topic_merge` e `sync_topic_merge_progress`. Em 2026-08-31, a migration `20260831212253` tornou explícitos os defaults de array e removeu somente três variáveis usadas como existência; os contratos de ciclo/merge passaram e o lint remoto retornou sem erros de schema.

## Prioridade 2 — lacunas funcionais já conhecidas

- [x] Unificar a identidade de marca no runtime: a logo antiga, a animação de entrada, o fallback de rota e o loader foram substituídos pelo mesmo símbolo vetorial responsivo aos temas claro/escuro. O kit inclui SVG/PNG, versões transparentes do símbolo com `R` claro/escuro e imagem social 1200×630; o símbolo pode ser usado sem o nome e o wordmark não colore mais “Revisar” de azul. `prefers-reduced-motion` elimina o movimento não essencial. Em 2026-09-01, favicon com URL versionada, ícones 32/180/192/512, manifest e imagem social foram gerados e conferidos; o novo símbolo claro foi publicado no Storage de produção em `email-assets/vourevisar-mark-dark-v1.png`, e `send-auth-email` v99 foi publicado e verificado como `ACTIVE` com `verify_jwt=false`, preservando a autenticação própria do webhook. Os arquivos locais provisórios/duplicados e o objeto remoto antigo `email-assets/logoEmail.png` foram removidos depois da confirmação de que não tinham consumidores. Os carregamentos agora usam somente o símbolo, com traço de entrada único e sem loop; a rota `/dashboard` só monta o `AppLayout` depois de confirmar o acesso, evitando indicador concorrente na lateral.
- [x] Concluir a regra e a validação autenticada da transição do primeiro contato. Em produção, em 2026-08-31, o aluno pagante importou pelo Catálogo o edital Casa da Moeda (2 matérias, 18 tópicos), carregou o ciclo, concluiu `I. Compreensão de texto` como Médio e recebeu corretamente 1 revisão futura desse mesmo tópico. O Painel inicialmente expôs que a seleção repetia PORTUGUÊS; a regra foi corrigida para priorizar a matéria ativa com menos tópicos iniciados, usando a ordem do ciclo como desempate. Após o deploy `5c32acb8`, o mesmo Painel passou a recomendar `MATEMÁTICA — I. Conjuntos numéricos`; o ciclo permaneceu em 1/18 iniciados.
- [x] Completar a matriz de estados de entrada e acesso: em 2026-08-31, o estado `sem edital` foi validado em produção com CTA para adicionar edital; a conta paga e o Portal também foram validados. Em 2026-09-01, trial, assinatura vencida, admin, estados vazios e retry/reconexão passaram na cobertura automatizada e o Dashboard autenticado renderizou em desktop/mobile. A cobertura agora classifica explicitamente os quatro estados persistidos (`sem edital`, `edital vazio`, `edital com conteúdo fora do ciclo` e `ciclo carregado`) e cobre o CTA `Completar edital`. Em uma conta de aluno, foi criado e removido o edital manual descartável `VALIDACAO DESCARTAVEL` sem matérias/tópicos, confirmando a persistência do estado vazio; em 2026-09-01, o edital de catálogo `Polícia Federal — Perito Criminal Federal - Área 5: Geologia Forense (2025)` foi persistido com 9 matérias e 309 tópicos, enquanto o ciclo ativo permaneceu `Casa da Moeda do Brasil — Técnico de Segurança (2023)`, confirmando o estado de conteúdo fora do ciclo. Também foi criado e persistido o edital manual `VALIDAÇÃO CICLO VAZIO - Ensaio técnico`, com 0 matérias e 0 tópicos; a UI corretamente não ofereceu `Carregar Ciclo`, impedindo a criação de um ciclo vazio por fluxo suportado. A matriz está encerrada com a proteção existente; não é necessário criar uma rota de teste artificial.
- [x] Validar com editais reais variados a extração, o merge e a ordenação, registrando novas variações estruturais nos perfis de banca em vez de criar exceção de tela. Em 2026-09-01, os testes cobrem importação de duas matérias com hierarquias mistas, normalização de `Língua Portuguesa`/`Português`, bloqueio de duplicata da mesma fonte e ordenação natural; em 2026-09-01, além do edital Casa da Moeda já existente, foi importado e persistido o edital de catálogo `Polícia Federal — Perito Criminal Federal - Área 5: Geologia Forense (2025)`, com estrutura distinta (9 matérias/309 tópicos); em 2026-09-01, com a conta de ensaio em teste gratuito, dois editais distintos da Polícia Federal foram combinados no mesmo ciclo. Após a análise semântica, o ciclo persistiu e, depois de recarregar a página, continuou com 2 editais, 18 matérias, 421 tópicos e matérias marcadas como `Unificada`, confirmando que o resultado não dependia apenas do estado local do modal. O serviço impõe timeout de 20s por chamada de matérias e tópicos e orçamento de 45s para o lote de tópicos, concluindo com fallback determinístico e aviso visível em vez de deixar o modal em carregamento indefinido.
- [x] Tratar revisões manuais após a quarta revisão como contato distinto, sem corromper o programa adaptativo já concluído. Em 2026-09-01, os limites do motor (primeiro contato, R1–R4, encerramento após o quarto intervalo) e os contratos de agenda passaram nos testes focados; a sequência completa de cinco contatos também está coberta por teste determinístico com estado persistível entre etapas. No projeto Supabase de Teste, em 2026-09-01, foi executada uma transação controlada que persistiu sucessivamente R1, R2, R3, R4 e `Concluído` (`review_count=5`, `total_reviews=5`, `completed=true`, `next_review=NULL`), confirmou o estado final no banco e fez `ROLLBACK`, deixando zero fixtures restantes. Em 2026-09-01, uma 1ª revisão também foi registrada na conta de ensaio pelo fluxo real; a agenda persistida mudou de `Hoje 1` para `Hoje 0 / Futuras 1`, sem erro.
- [x] Fazer auditoria final da semântica de conclusão em calendários e componentes legados antes de retirar o motor de revisão fixa. Em 2026-09-01, a busca no runtime confirmou que `study_cycles_v2` não é lida por telas, hooks ou services; resta apenas a limpeza explícita de conta em `Settings.tsx` e o histórico de migrations. Nenhum motor foi apagado nesta auditoria.
- [ ] Revisar responsividade e copy dos estados críticos de onboarding, assinatura e erro após cada recorte funcional, sem redesign decorativo. O Dashboard foi conferido em 1029px e 375px sem overflow; em 2026-09-01, `/conta/assinatura` e `/confirm-email` também renderizaram em 375px sem overflow (`scrollWidth=369`). Ainda falta a prova visual do estado de erro/reconexão e a revisão final de copy.

## Pós-venda — monitorar, não bloquear

- [ ] **Monitorar adoção real do Treino.** Executar `supabase/snippets/practice_adoption_report.sql` semanalmente depois de haver base relevante e acompanhar recorrência, tentativa, conclusão, qualidade e custo de geração. Não otimizar recomendação com a amostra atual de três usuários.
- [ ] **Ativar proteção contra senhas vazadas.** Habilitar a opção de proteção do Supabase quando o plano contratado suportar o recurso. **Responsável: fundador** pela mudança de plano.
- [ ] Avaliar índices adicionais de módulos administrativos e financeiros somente após observar volume/planos de consulta reais; não criar índices por suposição.

## Backlog de produto — não faz parte do corte de venda

- [ ] Cadernos com IA: especificar primeiro um caso de uso que não duplique Treino, Revisões ou geração de material.
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
