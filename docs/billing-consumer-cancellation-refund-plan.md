# Plano: arrependimento, cancelamento e reembolso de assinaturas

## Objetivo

Implementar um fluxo profissional e auditável para:

- teste gratuito de 7 dias sem cartão e sem conversão automática;
- direito de arrependimento na contratação paga pela internet;
- cancelamento normal da renovação após a janela de arrependimento;
- reembolso integral, cancelamento da assinatura, revogação de acesso, e-mails e
  reconciliação por webhook sem misturar Stripe Test e Live.

Este plano traduz requisitos legais em comportamento de produto e arquitetura.
O texto final dos Termos e da Política de Cancelamento deve ser revisado por
advogado brasileiro antes da publicação. A implementação técnica deve adotar a
interpretação mais favorável ao consumidor quando houver dúvida.

## Base normativa e operacional

### Direito brasileiro

- O art. 49 do Código de Defesa do Consumidor permite desistir, em até 7 dias
  contados da assinatura do contrato ou do recebimento do produto ou serviço,
  quando a contratação ocorre fora do estabelecimento comercial. Os valores
  pagos durante a janela devem ser devolvidos.
  Fonte: <https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm>.
- O Decreto 7.962/2013 exige, no comércio eletrônico:
  - resumo do contrato antes da contratação;
  - confirmação imediata da aceitação;
  - contrato conservável e reproduzível;
  - atendimento eletrônico eficaz para suspensão e cancelamento;
  - exercício do arrependimento pela mesma ferramenta usada para contratar;
  - comunicação imediata ao meio de pagamento para impedir o lançamento ou
    realizar o estorno;
  - confirmação imediata ao consumidor de que a manifestação foi recebida.
  Fonte: <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm>.

### Stripe

- Cancelar uma assinatura e reembolsar o pagamento são operações diferentes.
  O Customer Portal resolve renovação, cartão e faturas, mas não substitui o
  fluxo próprio de arrependimento.
- O reembolso deve referenciar o `PaymentIntent` ou a `Charge` do pagamento e
  usar `reason=requested_by_customer`.
- Um reembolso pode ficar `pending` se o saldo Stripe for insuficiente; a UI e
  os e-mails não podem afirmar que o dinheiro foi devolvido antes do status
  confirmado.
- A Stripe emite `refund.created`, `refund.updated`, `refund.failed` e
  `charge.refunded`. O webhook deve permanecer como autoridade da conclusão.
  Fontes:
  - <https://docs.stripe.com/refunds>
  - <https://docs.stripe.com/api/refunds/create>
  - <https://docs.stripe.com/billing/subscriptions/cancel>
  - <https://docs.stripe.com/api/events/types>

## Decisão de produto

### 1. Teste gratuito e arrependimento são direitos diferentes

O teste atual é uma concessão interna em `billing_access_grants`, criada no
cadastro por 7 dias. Ele não pede cartão, não cria Customer/Subscription na
Stripe e não gera cobrança automática.

Esse comportamento deve ser preservado e formalizado:

- o cadastro cria apenas um acesso gratuito e não um plano pago adiado;
- ao fim do teste nenhuma cobrança é realizada;
- para assinar, o usuário precisa escolher o plano e confirmar um novo checkout;
- os 7 dias gratuitos anteriores não reduzem a janela de arrependimento da
  contratação paga;
- durante o teste não existe valor a reembolsar; “encerrar teste” significa
  somente revogar o acesso gratuito, sem operação financeira.

Essa separação é a opção conservadora porque o art. 49 conta a partir da
contratação/recebimento, não simplesmente da cobrança. Se no futuro o produto
capturar cartão no início do teste e converter automaticamente, a análise muda
e o fluxo deve ser redesenhado antes da ativação.

### 2. Contratação paga

Para mensal e anual:

- a contratação paga ocorre na confirmação do Checkout Stripe;
- a data canônica da janela será o instante do primeiro pagamento confirmado
  da nova assinatura, correlacionado ao aceite contratual do checkout;
- até o limite de 7 dias, o usuário poderá exercer arrependimento no próprio
  `/conta/assinatura`;
- o arrependimento gera reembolso integral do primeiro pagamento, cancelamento
  imediato da assinatura e encerramento do acesso pago;
- não haverá desconto proporcional por dias usados dentro dessa janela;
- o plano anual também será devolvido integralmente dentro da janela.

### 3. Cancelamento normal após 7 dias

- Continua pelo Customer Portal.
- Cancela somente a renovação futura.
- Mantém acesso até o fim do período pago.
- Não gera reembolso automático.
- Deve permanecer visualmente separado de “Desistir e pedir reembolso”.
- Após a confirmação, o produto deve exibir explicitamente `Renovação
  cancelada`, informar que não haverá nova cobrança, mostrar a data exata até
  quando o acesso pago continua e evitar a mensagem ambígua `Assinatura
  cancelada` sem explicar seus efeitos.

### 4. Casos que exigem política específica

- Renovação automática: não abrir automaticamente uma nova janela em cada
  fatura recorrente sem parecer jurídico; pedidos devem poder chegar ao suporte
  e nunca ser descartados silenciosamente.
- Mudança mensal para anual: tratar como nova alteração contratual, registrar
  novo aceite e definir com advogado se há arrependimento da mudança, reversão
  ao plano anterior ou cancelamento integral. Até essa regra existir, não
  automatizar reembolso de upgrade.
- Reembolso fora da janela, cobrança duplicada, fraude, falha técnica ou
  indisponibilidade: fluxo de suporte/manual, separado do art. 49.

## Diagnóstico do sistema atual

### O que já está correto

- [x] Teste gratuito independente da Stripe, sem cartão e sem conversão automática.
- [x] Checkout Elements cria assinatura apenas após escolha explícita de plano.
- [x] Clientes Test e Live são isolados por `livemode`.
- [x] Acesso pago é confirmado pelo webhook, não pelo retorno visual do checkout.
- [x] Ledger `billing_webhook_events` é idempotente.
- [x] `charge.refunded` integral já cancela a assinatura vigente e sincroniza o acesso.
- [x] Customer Portal permite faturas, cartão e cancelamento da renovação.

### Lacunas bloqueantes

- [ ] Não existem Termos, Política de Privacidade e Política de Cancelamento
  publicadas; os links do rodapé apontam para `#`.
- [ ] Cadastro não apresenta nem registra aceite de termos.
- [ ] Checkout não apresenta resumo contratual, renovação automática, data da
  próxima cobrança, regra de cancelamento e direito de arrependimento.
- [ ] Não existe aceite contratual versionado ligado ao checkout pago.
- [ ] `/conta/assinatura` não informa a janela legal nem oferece a mesma
  ferramenta para exercer o arrependimento.
- [ ] Não existe Edge Function autenticada para solicitar arrependimento.
- [ ] Não existe ledger próprio para pedido, processamento e resultado do reembolso.
- [ ] Webhook não persiste o estado detalhado de `Refund` nem trata falha/pending.
- [ ] Não há e-mail imediato de recebimento do pedido e confirmação posterior
  do resultado do reembolso.
- [ ] Não há matriz ponta a ponta de Test e uma compra/reembolso Live controlada.

## Arquitetura proposta

### Tabelas

#### `billing_contract_acceptances`

Tabela financeira interna, RLS habilitada, sem acesso direto de `anon` ou
`authenticated`, escrita somente por Edge Functions.

Campos mínimos:

- `id uuid`;
- `user_id uuid`;
- `checkout_attempt_id uuid`;
- `livemode boolean`;
- `plan_code monthly|annual`;
- `amount_cents`, `currency`, `billing_interval`;
- `terms_version`, `privacy_version`, `refund_policy_version`;
- `terms_sha256`, `refund_policy_sha256`;
- `accepted_at timestamptz` atribuído pelo servidor;
- `contracted_at timestamptz null`, preenchido por
  `checkout.session.completed`;
- `withdrawal_deadline timestamptz null`;
- `created_at` e `updated_at`.

Não armazenar número de cartão, endereço de cobrança ou segredo Stripe. Se IP
ou user agent forem considerados necessários como prova, validar finalidade,
retenção e minimização segundo a LGPD antes de adicioná-los.

#### `billing_refund_requests`

Ledger interno para a saga financeira:

- `id`, `request_id` único e `user_id`;
- `billing_subscription_id`, `billing_contract_acceptance_id`;
- `livemode`, `request_reason`;
- `eligibility_started_at`, `eligibility_deadline`, `requested_at`;
- `amount_cents`, `currency`;
- `stripe_invoice_id`, `stripe_payment_intent_id`, `stripe_refund_id`;
- `status`:
  `requested|processing|pending|succeeded|failed|manual_review|rejected`;
- `subscription_cancel_status`;
- `error_code` sanitizado;
- `received_email_sent_at`, `result_email_sent_at`;
- `processed_at`, `created_at`, `updated_at`.

Índices/garantias:

- uma solicitação de arrependimento por contrato/pagamento;
- `request_id` idempotente para duplo clique/retry;
- IDs Stripe únicos quando preenchidos;
- RLS ligada, `REVOKE ALL` de navegador e acesso por `service_role` somente;
- função/RPC privada para reivindicar atomicamente o processamento e impedir
  duas Edge Functions de emitir reembolso simultâneo.

### Edge Functions

#### `stripe-accept-contract`

- Requer JWT válido do usuário.
- Recebe `checkoutRequestId` e as versões de documentos exibidas.
- Confere que o checkout pertence ao usuário, está `open`, é do mesmo `livemode`
  e corresponde ao preço obtido no catálogo Stripe.
- Grava snapshot/hash e `accepted_at` no servidor.
- Atualiza apenas metadata não sensível da Checkout Session para correlação.
- Retorna um identificador opaco; o frontend somente então chama
  `checkout.confirm()`.

#### `stripe-request-withdrawal`

- Requer JWT válido; nunca `verify_jwt=false`.
- Não aceita IDs Stripe enviados pelo navegador.
- Resolve usuário, Customer, assinatura, aceite, primeira fatura paga e
  PaymentIntent exclusivamente no backend.
- Confere `livemode`, propriedade, status, pagamento integral e prazo.
- Cria/reutiliza o pedido de forma atômica.
- Emite reembolso integral com chave de idempotência versionada e motivo
  `requested_by_customer`.
- Cancela a assinatura imediatamente, sem prorrata e sem nova fatura. Se uma
  etapa falhar após a outra, registra estado recuperável em vez de esconder a
  inconsistência.
- Envia confirmação imediata do recebimento, mesmo se o reembolso ficar
  `pending`; nunca promete crédito concluído antes do webhook.
- Retorna apenas estado sanitizado e próxima ação.

### Webhook Stripe

Estender `stripe-webhook` para:

- correlacionar `checkout.session.completed` com o aceite e preencher
  `contracted_at`/`withdrawal_deadline`;
- processar `refund.created`, `refund.updated`, `refund.failed` e
  `charge.refunded`;
- atualizar `billing_refund_requests` de modo idempotente e tolerante a ordem;
- cancelar/sincronizar a assinatura no reembolso integral vigente sem gerar
  segunda operação;
- revogar acesso apenas para o contrato/pagamento correspondente, preservando
  concessões administrativas independentes quando aplicável;
- enviar o e-mail final somente uma vez;
- criar alerta operacional para `pending` prolongado ou `failed`.

O endpoint continua público apenas para a Stripe, com `verify_jwt=false`, corpo
bruto e assinatura Stripe obrigatória. As funções chamadas pelo usuário mantêm
JWT obrigatório.

### Projeção de leitura

Ampliar `get_stripe_billing_overview(p_livemode)` com bloco sanitizado:

```text
withdrawal:
  eligible
  deadline
  request_status
  requested_at
  result_at
```

Nenhum ID Stripe deve chegar ao navegador.

## Experiência do usuário

### Cadastro e teste gratuito

- Informar claramente: “7 dias grátis, sem cartão e sem cobrança automática”.
- Disponibilizar links funcionais para Termos e Privacidade.
- Registrar a versão aceita no cadastro; o texto não pode afirmar que o usuário
  contratou um plano pago.
- Opcionalmente oferecer “Encerrar teste gratuito”, sem chamar isso de reembolso.

### Checkout

Antes do botão final, exibir em linguagem direta:

- nome do plano;
- valor cobrado hoje;
- periodicidade e renovação automática;
- valor/data estimada da próxima cobrança;
- como cancelar a renovação;
- direito de arrependimento e reembolso integral em até 7 dias;
- links para Termos e Política de Cancelamento;
- aceite não pré-marcado.

Trocar a frase vaga “Cancele antes da renovação” por informação contratual
completa. O resumo exibido e aceito precisa ser conservável por versão/hash.

### Minha assinatura

Durante a janela:

- mostrar “Você pode desistir e pedir reembolso integral até …”;
- mostrar quantos dias (ou horas, no último dia) restam da janela de
  arrependimento, sem chamar esse prazo de teste gratuito;
- CTA separado: `Desistir da assinatura e pedir reembolso`;
- modal mostra efeitos: reembolso integral, cancelamento imediato, fim do acesso
  pago e prazo bancário sem promessa indevida;
- confirmação explícita antes da solicitação.

Se a renovação for cancelada pelo Customer Portal ainda dentro da janela:

- mostrar `Renovação cancelada` e `Não haverá nova cobrança`;
- manter visível a data final do período já pago;
- manter o CTA de arrependimento até o prazo legal, com a contagem restante;
- explicar que cancelar a renovação não solicitou reembolso;
- informar que o teste gratuito anterior já terminou e não será reiniciado ou
  prorrogado pelo cancelamento.

Depois da solicitação:

- `Solicitação recebida`;
- `Reembolso em processamento`;
- `Reembolso confirmado`;
- `Precisamos concluir manualmente`, quando houver falha.
- quando o reembolso tiver sido efetivamente emitido, informar que o crédito no
  cartão costuma aparecer em aproximadamente 5 a 10 dias úteis, dependendo do
  banco; se a Stripe representar a operação como reversão, explicar que a
  cobrança original pode simplesmente desaparecer da fatura;
- nunca mostrar prazo de estorno no cancelamento normal, pois nesse fluxo não
  existe reembolso.

Após a janela, esconder o CTA legal e manter `Gerenciar assinatura` para
cancelar a renovação. Se a renovação for cancelada, mostrar que não haverá nova
cobrança, o acesso permanece somente até o fim do período pago e não existe
novo período gratuito nem reembolso automático. O canal de suporte permanece
sempre visível.

### Documentos públicos

Criar rotas públicas e responsivas:

- `/termos`;
- `/privacidade`;
- `/cancelamento-e-reembolso`;
- `/contato`.

Os documentos precisam informar fornecedor, CPF/CNPJ aplicável, endereços
físico e eletrônico, características do serviço, preço, renovação,
cancelamento, arrependimento e atendimento. Os dados reais do fornecedor não
devem ser inventados no código; dependem de informação e revisão do titular.

## Fases de implementação

### Fase 0 — decisão jurídica e conteúdo

- [ ] Confirmar com advogado a data inicial exata da janela, renovação e troca
  de plano.
- [x] Definir identidade legal do fornecedor e canais oficiais de atendimento;
  os quatro dados públicos foram configurados no Vercel para Production e
  Preview sem serem tratados como segredo.
- [ ] Aprovar versões iniciais dos três documentos legais.
- [ ] Configurar política de retenção dos aceites e pedidos financeiros.

### Fase 1 — contrato e transparência

- [x] Criar rotas/documentos públicos versionados e corrigir o rodapé. O código
  está validado localmente; a publicação permanece bloqueada pelos dados reais
  do fornecedor e pela revisão jurídica dos textos em rascunho.
- [x] Adicionar resumo contratual e aceite explícito ao checkout, incluindo
  valor atual, renovação, próxima cobrança estimada, cancelamento e
  arrependimento. A ativação permanece protegida por feature flag.
- [x] Criar `billing_contract_acceptances` com RLS/revogações. A migration foi
  aplicada no projeto Live com as flags do recurso explicitamente desligadas;
  RLS e ausência de leitura por `anon`/`authenticated` foram confirmadas no
  banco remoto.
- [x] Implementar `stripe-accept-contract` e correlação no webhook. As Edge
  Functions passaram no `deno check` e foram publicadas no projeto Live com
  `BILLING_CONTRACT_ACCEPTANCE_ENABLED=false`.
- [x] Incluir confirmação contratual no e-mail da primeira cobrança quando o
  checkout possui aceite correlacionado. O envio real ainda depende da
  homologação da Edge Function em Test.
- [x] Registrar no cadastro por e-mail/senha o aceite versionado dos documentos
  aplicáveis ao teste gratuito, em ledger separado e sem criar contrato Stripe.
- [x] Registrar o aceite no retorno autenticado do Google/OAuth, de forma
  idempotente, após a divulgação dos documentos junto ao botão de continuação.

### Fase 2 — arrependimento e reembolso

- [x] Criar `billing_refund_requests` privado, isolado por `livemode`, com
  claim atômico, lease de recuperação e idempotência por contrato/pagamento.
- [x] Implementar `stripe-request-withdrawal` com JWT, resolução integral no
  backend, reembolso do primeiro pagamento e cancelamento imediato. O código
  permanece desativado por `BILLING_WITHDRAWAL_ENABLED`.
- [x] Estender webhook para `refund.created`, `refund.updated` e
  `refund.failed`, tolerando ordem, retries e assinatura já cancelada.
- [x] Expor somente elegibilidade, prazo e estado sanitizado na RPC de
  overview, sem IDs Stripe no navegador.
- [x] Implementar CTA, modal de confirmação e estados de processamento,
  sucesso e revisão manual em `/conta/assinatura`, atrás de feature flag.
- [x] Implementar e-mails idempotentes de recebimento e resultado, sem afirmar
  crédito concluído enquanto a Stripe ainda estiver processando.
- [x] Criar visão administrativa e reconciliação controlada, com auditoria
  privada. A operação consulta o Refund existente, procura o pedido pela
  metadata e reaplica somente o cancelamento idempotente; não cria um segundo
  reembolso automaticamente. A fila foi publicada protegida por feature flag
  desligada e ainda precisa de homologação com uma cobrança controlada.

### Fase 3 — renovação e mudança de plano

- [x] Documentar cancelamento normal sem reembolso após a janela. A conta
  agora distingue explicitamente a renovação cancelada do arrependimento:
  informa que não haverá nova cobrança, que nenhum reembolso foi solicitado e
  apresenta a data até a qual o acesso pago continua.
- [ ] Revisar configuração do Customer Portal para não conflitar com o fluxo.
- [ ] Definir e implementar contrato/arrependimento de mensal para anual.
- [ ] Tratar pedidos relacionados a renovação automática sem decisão silenciosa.

### Backlog descoberto na validação Live

- [x] Corrigir a navegação interna dos documentos legais: links apresentados em
  cadastro e Checkout agora permanecem na mesma aba, e o botão `Voltar` retorna
  ao fluxo de origem pela rota anterior, em vez de forçar a landing page. A logo
  continua sendo o único atalho explícito para a página inicial.
- [ ] Validar juridicamente a identificação do fornecedor antes de qualquer
  mudança visual: em oferta/contratação online, nome, CPF/CNPJ e endereços físico
  e eletrônico são informações exigidas ao consumidor. Não ocultar ou mascarar
  os dados no documento; para reduzir exposição pessoal, formalizar a operação
  e usar endereço comercial legítimo, com revisão de contador/advogado.
- [x] Corrigir a regra após arrependimento para que um teste gratuito ainda
  vigente volte a valer somente até sua data original. Não criar, reiniciar ou
  estender dias gratuitos. A validação Live de 2026-08-22 confirmou que a
  concessão `trial` permanece no banco, mas a RPC a oculta quando existe
  qualquer assinatura Stripe, inclusive uma já cancelada/reembolsada. A
  migration `20260822120906` foi aplicada e a RPC foi verificada em transação
  como o usuário afetado: devolveu `source=trial`, a data original de fim e a
  assinatura histórica como cancelada.
- [ ] Evoluir a área existente de administração de assinaturas para uma linha
  do tempo operacional somente para owner/admin: compra, renovação cancelada,
  pedido de arrependimento, reembolso, falha e reconciliação, com horário,
  aluno, valor, estado e erro sanitizado. A área do aluno continua exibindo
  somente a própria assinatura e seu histórico, sem IDs Stripe, e-mails de
  entrega ou ações internas.
  - [x] Expor uma projeção somente-leitura pela Edge Function `admin-billing`,
    com autorização de owner/admin, dados mínimos de aluno e sem payloads ou IDs
    da Stripe no navegador. Publicado como `list_operation_timeline`, isolado
    pelo `livemode` atual do backend.
  - [x] Criar componente próprio na área administrativa, separado da fila de
    reconciliação, com identificação do ambiente atual e filtro de atenção; não transformar
    `SubscriptionManagement.tsx` em página-monólito. A leitura Live por uma
    sessão owner confirmou a sequência pagamento, arrependimento, cancelamento
    imediato e reembolso para as validações controladas.
  - [ ] Homologar com compra, cancelamento normal, arrependimento/reembolso,
    falha e ação administrativa reais/controladas antes de considerar a linha
    do tempo fonte operacional confiável.
- [ ] Depois da linha do tempo, criar notificação operacional interna como
  alerta complementar para compra confirmada, pedido de arrependimento,
  reembolso concluído e falha/revisão. O endereço deve ser secret de backend e
  nunca BCC implícito do e-mail do consumidor; o painel continua sendo a fonte
  de verdade para conferência.
- [x] Revisar a inscrição e a seleção de eventos do endpoint Live da Stripe
  para `refund.created`, `refund.updated` e `refund.failed`. Nas duas
  validações Live de reembolso o registro direto e `customer.subscription.deleted`
  chegaram sem erro, mas nenhum evento `refund.*` foi persistido no ledger;
  isso reduz a capacidade de reconciliação posterior. Em 2026-08-22 o endpoint
  Live foi atualizado sem remover eventos existentes e passou a receber também
  `refund.*` e `charge.refunded`; a validação de entrega desses novos eventos
  permanece na próxima operação controlada.
- [x] Renomear a recuperação de e-mail terminal para uma ação explícita de
  verificação do comprovante, informando que ela apenas confere o registro de
  envio para o e-mail cadastrado, não altera assinatura/reembolso e não dispara
  um segundo e-mail quando o envio já está registrado.
- [x] Remover o botão secundário de histórico financeiro que apenas rolava para
  o card já visível na mesma página.

### Fase 4 — homologação

- [x] Aplicar as cinco migrations no projeto remoto, executar lint do banco e
  Advisors de segurança, e confirmar RLS/revogações e privilégio exclusivo de
  `service_role` na função privada de claim.
- [x] Regenerar os tipos TypeScript diretamente do schema remoto após aplicar
  as migrations; typecheck, lint, 173 arquivos/671 testes e build passaram com
  o arquivo atualizado.
- [ ] Testar lógica de prazo no instante inicial, dentro da janela, no limite e
  após o limite.
- [ ] Testar trial sem cartão e sem assinatura Stripe.
- [ ] Testar assinatura durante o trial e após o trial.
- [ ] Testar clique duplicado, retry, webhook duplicado e fora de ordem.
- [x] Validar em produção a retomada do mesmo Checkout em outra aba/dispositivo
  depois da correção do `requestId` canônico. Uma segunda aba, com novo estado
  de sessão do navegador, reutilizou a tentativa Live e renderizou novamente o
  Payment Element, resumo e checkbox sem `checkout_attempt_not_found`. A causa
  observada foi a
  reutilização de uma tentativa aberta com `request_id` antigo enquanto o
  frontend enviava um ID novo ao aceite contratual, resultando em
  `checkout_attempt_not_found` antes da confirmação do cartão.
- [ ] Testar reembolso `succeeded`, `pending` e `failed`. O caso Live
  `succeeded` foi confirmado em 2026-08-21 por R$ 12,90; `pending` e `failed`
  continuam pendentes em ambiente controlado.
- [ ] Confirmar cancelamento imediato, ausência de nova fatura e revogação do
  acesso pago sem apagar dados de estudo. O cancelamento imediato e a
  revogação foram confirmados no banco/UI; a ausência de nova fatura ainda
  depende de verificação posterior.
- [ ] Confirmar e-mails e histórico auditável. O e-mail de recebimento chegou e
  ficou auditado. O primeiro pedido Live concluiu antes de chegar um evento de
  reembolso ao webhook, portanto o e-mail terminal não foi enviado pela versão
  anterior. A solicitação passou a enviar/auditar o resultado diretamente
  quando a Stripe já devolve estado terminal, mantendo o webhook como
  reconciliação. A versão atual também expõe uma recuperação idempotente para
  o cliente garantir o envio do comprovante sem repetir o reembolso; falta
  executar essa ação uma vez na conta de homologação e confirmar a chegada no
  Proton.
- [ ] Testar mensal e anual no Stripe Test.
- [ ] Validar desktop, tablet e mobile.
- [x] Executar build, lint, testes e `git diff --check`. Nesta etapa passaram
  `deno check`, typecheck, lint, 173 arquivos/671 testes e build de produção;
  repetir após aplicar migrations e antes de qualquer ativação.
- [x] Publicar as nove Edge Functions no projeto Live com as três flags de
  ativação explicitamente desligadas. O catálogo Live foi consultado sem criar
  Checkout; os endpoints novos recusaram uso enquanto desativados; o webhook
  recusou requisição sem assinatura. Nenhuma cobrança foi criada.
- [x] Configurar no Vercel os dados reais do fornecedor e retirar o sufixo
  `draft` da versão candidata usada na homologação controlada.
- [ ] Concluir revisão jurídica dos textos antes de abrir aquisição para
  terceiros; a validação técnica e a compra Live do próprio titular não
  substituem parecer jurídico.
- [x] Publicar o frontend e ativar as flags de frontend/backend de forma
  coordenada. O rollout foi feito em duas passagens: primeiro com as flags
  explicitamente desligadas e depois backend antes do frontend. No domínio
  oficial, os quatro documentos carregaram com a versão final e fornecedor
  configurado, o catálogo Live exibiu R$ 12,90/R$ 99,90, o cadastro passou a
  exigir aceite explícito e `/conta/assinatura` continuou estável.
- [x] Manter Preview sem chave/modo Live. A tentativa de carregar o catálogo no
  Preview falhou por isolamento de modo, como esperado; nenhuma chave Live foi
  copiada e toda validação financeira permanece restrita ao domínio oficial.
- [x] Fazer smoke test não mutante dos endpoints ativados: payloads vazios
  retornaram validação de versão/contrato/pedido e sessão (`409/400/400/401`),
  em vez de `feature_not_enabled`, sem criar Checkout, aceite ou reembolso.
- [x] Reproduzir no domínio oficial a preparação e o recarregamento do Checkout
  mensal Live. As duas renderizações abriram o Payment Element e o resumo
  contratual sem 500; a tentativa permaneceu `open`, `error_code=null` e com
  prefixo `cs_live_`. Nenhum aceite contratual ou pedido de reembolso foi
  criado porque o checkbox e o pagamento não foram confirmados.
- [x] Sincronizar a entrega com `main` para impedir rollback no próximo deploy.
  O commit `b1e22940` gerou o deployment Production
  `dpl_89cYK7farTYLrS9CM1VYxyNMwYF5`, em estado `READY`, associado aos domínios
  oficiais.
- [x] Fazer uma compra Live controlada e confirmar a etapa paga no Stripe,
  webhook, banco e UI. Em 2026-08-21, o checkout mensal foi concluído em Live
  por R$ 12,90, com aceite contratual vinculado, `invoice.paid`,
  `customer.subscription.created` e `checkout.session.completed` processados
  uma única vez e sem `error_code`. A RPC canônica devolveu acesso Stripe
  ativo até 2026-09-21 e elegibilidade de arrependimento até 2026-08-28; o
  Customer Portal exibiu a assinatura, cartão final 6007 e fatura paga. A
  mensagem de erro vista durante a abertura do Portal desapareceu quando a
  navegação para `billing.stripe.com` terminou e não correspondeu a falha
  persistida no ledger.
- [ ] Solicitar arrependimento/reembolso dessa compra Live dentro da janela e
  confirmar cancelamento imediato, reembolso, webhook, banco, e-mail, UI e
  revogação do acesso sem apagar dados de estudo.
- [x] Corrigir a consistência imediata da conta após arrependimento. O caso Live
  revelou uma janela curta em que o pedido já estava `succeeded`, mas a RPC
  ainda devolvia a assinatura local como ativa até o webhook
  `customer.subscription.deleted`. A RPC agora encerra acesso e renovação assim
  que `subscription_cancel_status=succeeded`, não reativa o trial anterior, e
  o frontend aguarda a releitura canônica antes de fechar a confirmação. A
  migration foi aplicada e um teste transacional forçou exatamente o estado
  antigo (`subscription=active` + reembolso/cancelamento concluídos), obtendo
  `is_active=false`, `status=canceled` e sem renovação; a transação foi
  revertida.
- [x] Publicar e validar no domínio oficial o histórico financeiro que cruza a
  fatura paga com `billing_refund_requests`, exibindo `Pagamento reembolsado`,
  `Reembolso em processamento` ou `Reembolso em análise` em vez de manter
  apenas `Pagamento confirmado`. A Edge Function e o bundle frontend foram
  publicados no deployment Production `dpl_ALUGAo12n4jJD3DDPwTMDLhWoEGv`.
  Em sessão autenticada no domínio oficial, a conta encerrada exibiu
  `Pagamento reembolsado`, data original da cobrança, data de atualização do
  reembolso e `Sem renovação ativa`; a inspeção mobile em 390 px não encontrou
  overflow horizontal nem erros no console.
- [x] Publicar a recuperação do e-mail terminal no Supabase e no Vercel. A
  Edge Function aceita `action=ensure_result_email`, restringe a busca ao
  usuário autenticado e ao modo Live, e usa a idempotência do provedor de
  e-mail; a interface só mostra a ação para estados `succeeded` ou de revisão.
- [ ] Revisar em tarefa separada os avisos de segurança preexistentes do
  Supabase Advisor para funções `SECURITY DEFINER` fora deste fluxo e habilitar
  proteção contra senhas vazadas. O aviso da RPC
  `get_stripe_billing_overview` é intencional: somente `authenticated` pode
  executá-la e a própria função exige `auth.uid()` e restringe a consulta ao
  usuário autenticado. As tabelas financeiras permanecem sem políticas de
  navegador por desenho, com RLS e privilégios diretos revogados.

## Critérios para liberar produção

- Teste gratuito não cria cobrança nem assinatura Stripe.
- Nenhuma cobrança acontece sem aceite explícito e versionado.
- O usuário consegue exercer arrependimento pelo próprio sistema.
- Pedido duplicado não gera reembolso ou cancelamento duplicado.
- Reembolso integral confirmado cancela a assinatura e o acesso pago.
- Falha/pending permanece visível e recuperável operacionalmente.
- Cancelamento normal e arrependimento não são confundidos na UI.
- Test e Live continuam isolados em preços, clientes, eventos, aceites e pedidos.
- Um teste Live real fecha toda a cadeia antes de declarar o recurso concluído.

## Dívida técnica e risco se isso for adiado

O sistema atual consegue cancelar renovação e reagir a um estorno manual, mas
isso não equivale a oferecer o direito de arrependimento pela mesma ferramenta
da contratação. Manter links legais vazios, sem resumo contratual, sem aceite
versionado e sem reembolso próprio aumenta risco de disputa, chargeback,
reclamação em órgãos de defesa do consumidor e ausência de prova do contrato.
