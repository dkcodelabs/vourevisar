# Plano mestre do vouRevisar

> **Fonte única de prioridade operacional.** Atualizado em 2026-08-31 após inventário do repositório, Supabase remoto, Stripe Live e produção Vercel.
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
- [x] Qualidade do corte: 808 testes, lint, build e auditoria de dependências concluídos sem falha em 2026-08-31.

## Prioridade 0 — proteger a operação comercial

Estes itens não impedem o software de receber alunos hoje, mas não devem ser ignorados ao aumentar aquisição ou volume financeiro.

- [ ] **Revisão jurídica independente.** Confirmar identidade final do fornecedor, canais de atendimento, textos de Termos/Privacidade/Cancelamento, retenção de aceites e interpretação da janela de arrependimento. **Responsável: fundador com profissional jurídico.** O código e os documentos versionados já existem; esta validação não pode ser fingida por teste automatizado.
- [x] **Homologação financeira controlada.** Os ensaios anteriores já comprovam mensal/anual e `invoice.payment_failed` no Stripe Test; o código mantém tentativa/ledger idempotentes e o teste de segurança passou em 2026-08-31. O projeto Supabase de Teste foi recriado com a linha atual (`cvnscypxftovmhcaneua`), recebeu as migrations/functions e está sem erros de schema. O destino Stripe Test `vouRevisar Billing Test` já aponta para `stripe-webhook`, escuta 16 eventos e teve o segredo de assinatura configurado em 2026-08-31. A Stripe CLI foi autenticada em modo Teste em 2026-08-31. Entregas de fixtures genéricas de reembolso retornaram 200; as fixtures genéricas de `invoice.paid`/`customer.subscription.created` falharam por não possuírem assinatura local vinculada. Foi criada a conta descartável `billing.homologacao.2@vourevisar.com.br`; o laboratório local estava em `8082` e o CORS foi corrigido no `APP_URL` do Teste. Checkout mensal real foi concluído em 2026-09-01: `billing_checkout_attempts=complete`, `billing_subscriptions=active`, e os eventos `checkout.session.completed`, `invoice.paid` e `customer.subscription.created` foram processados com sucesso no ledger. A causa do loop de confirmação foi a ausência de `user-rpc` no projeto novo; a função foi publicada e o preflight CORS em `8082` retornou 200 em 2026-09-01. O evento real de checkout foi reenviado pela Stripe CLI e o ledger permaneceu idempotente, sem nova linha ou duplicação de assinatura. Em seguida, a assinatura real de Teste foi marcada para cancelamento ao fim do período e o `customer.subscription.updated` foi processado, mantendo o acesso até `2026-10-01`. O pagamento inicial foi reembolsado integralmente (`re_3UAfYpQ2ZdcaFdY41bjbCHYB`, status `succeeded`); os eventos de reembolso foram recebidos e classificados como `ignored` pelo ledger, sem erro nem duplicação. O reenvio tardio dos eventos históricos `customer.subscription.created` e `invoice.paid`, depois do cancelamento e reembolso, foi executado em ordem inversa à entrega original: ambos foram processados uma vez, sem duplicação, e a assinatura permaneceu com cancelamento ao fim do período. O retry de cobrança foi validado com Test Clock e assinatura real de homologação: um cartão de falha levou a cobrança recorrente a `invoice.payment_failed`, a assinatura local foi sincronizada para `past_due` e o evento foi processado uma vez no ledger. Durante o ensaio foi identificado e corrigido o último desvio de configuração: o endpoint Stripe não escutava `invoice.payment_failed`; o evento foi adicionado à lista de 17 eventos e o histórico falho foi reenviado com sucesso.
- [ ] **Validação autenticada de acesso.** Em 2026-08-31, o perfil aluno pago foi validado em desktop: acesso ao Painel, assinatura em fim de período e Customer Portal Live abriram corretamente. Ainda faltam trial, sem acesso, admin e confirmação de e-mail em Safari/mobile. É validação de experiência e sessão, não alteração de regras de acesso.
- [x] **Corrigir e retestar o resumo de assinatura Live.** Em 2026-08-31, a migration `20260831210950` removeu a comparação indevida entre `updated_at` da assinatura e do cliente, preservando ownership e `livemode`. Foi publicada no Supabase; o RPC retornou a assinatura mensal ativa e o aluno abriu o Painel em produção com o selo `Plano mensal`.
- [ ] **Canal de suporte real.** Confirmar que WhatsApp/e-mail configurado é o canal operacional definitivo e que o link funciona em produção para conta bloqueada e aluno comum. **Responsável: fundador** para fornecer/manter o canal.
- [ ] **Remover claims públicos sem evidência verificável.** A landing atual exibe “milhares de estudantes” e uma retenção de “98%” sem estudo, métrica ou prova social localizada no repositório. Substituir por proposta de valor factual até existir evidência auditável; não inventar números, depoimentos ou ganho de conversão.

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
- [ ] Reduzir o baseline arquitetural em recortes: 36 acessos diretos ao Supabase em UI, 4 em utilitários e 9 páginas acima de 700 linhas. Ordem inicial: `Editais.tsx` (3896 linhas), `Revisoes.tsx` (977) e áreas administrativas. Cada recorte deve mover persistência para service/hook, sem refatoração massiva.
- [x] Recuperar o typecheck global do Treino: corrigido `PracticeFormat` ausente em `PracticeSessionDialog`, fixture incompleto de `PracticeOverview` e uso de `Array.at`, incompatível com o alvo ES2020.
- [x] Corrigir os avisos restantes do `supabase db lint` nas RPCs transacionais `atomic_delete_subject`, `reset_edital_study_progress`, `atomic_cycle_load`, `atomic_archive_edital_from_cycle`, `revert_subject_merge`, `revert_topic_merge` e `sync_topic_merge_progress`. Em 2026-08-31, a migration `20260831212253` tornou explícitos os defaults de array e removeu somente três variáveis usadas como existência; os contratos de ciclo/merge passaram e o lint remoto retornou sem erros de schema.

## Prioridade 2 — lacunas funcionais já conhecidas

- [x] Concluir a regra e a validação autenticada da transição do primeiro contato. Em produção, em 2026-08-31, o aluno pagante importou pelo Catálogo o edital Casa da Moeda (2 matérias, 18 tópicos), carregou o ciclo, concluiu `I. Compreensão de texto` como Médio e recebeu corretamente 1 revisão futura desse mesmo tópico. O Painel inicialmente expôs que a seleção repetia PORTUGUÊS; a regra foi corrigida para priorizar a matéria ativa com menos tópicos iniciados, usando a ordem do ciclo como desempate. Após o deploy `5c32acb8`, o mesmo Painel passou a recomendar `MATEMÁTICA — I. Conjuntos numéricos`; o ciclo permaneceu em 1/18 iniciados.
- [ ] Completar a matriz de estados de entrada e acesso: em 2026-08-31, o estado `sem edital` foi validado em produção com CTA para adicionar edital; a conta paga e o Portal também foram validados. Ainda faltam edital vazio/fora do ciclo, ciclo vazio, erro/reconexão, trial, assinatura vencida e admin. A tela deve usar somente dados persistidos e CTAs existentes.
- [ ] Validar com editais reais variados a extração, o merge e a ordenação, registrando novas variações estruturais nos perfis de banca em vez de criar exceção de tela.
- [ ] Tratar revisões manuais após a quarta revisão como contato distinto, sem corromper o programa adaptativo já concluído.
- [ ] Fazer auditoria final da semântica de conclusão em calendários e componentes legados antes de retirar o motor de revisão fixa.
- [ ] Revisar responsividade e copy dos estados críticos de onboarding, assinatura e erro após cada recorte funcional, sem redesign decorativo.

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
