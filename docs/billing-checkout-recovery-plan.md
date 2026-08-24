# Plano: Recuperacao do Checkout Stripe Elements

## Objetivo

Eliminar falhas de criacao de sessao no Checkout Elements sem cruzar recursos
Stripe de Test e Live.

## Itens

### Pré-lançamento Live

- [x] Investigar o histórico Live antes de qualquer ativação: o pagamento
  concluído de `R$ 12,90` foi identificado no Dashboard como `Subscription
  creation`, em `19 de ago.`, para `vourevisar@proton.me`, no cartão final
  `5137`. A assinatura é a cobrança real informada pelo proprietário; não
  houve reembolso nem alteração.
- [x] Corrigir/verificar o webhook Live antes da virada: o destino ativo aponta
  para `stripe-webhook`, mas o Workbench registra 18 entregas na semana, 14
  malsucedidas. A inspeção mostrou que as 14 são `checkout.session.expired`
  antigas/reentregadas, todas respondendo `400 {"invalid_signature"}`; as
  entregas do pagamento real (`checkout.session.completed`, `invoice.paid` e
  `customer.subscription.created`) responderam `200 OK`. O histórico não
  deve ser reenviado sem uma decisão explícita. Após a troca
  do segredo, a validação sem cobrança confirmou um checkout anual Live criado
  (`cs_live_…`) em estado `open`; o cliente Live de `darciliokv@proton.me` existe,
  mas ainda não possui assinatura Live. A assinatura anual existente dessa conta
  é Test (`livemode=false`). A compra Live posterior de 24/08 confirmou a
  cadeia atualizada de pagamento, webhook, acesso, e-mail ao aluno e alerta
  operacional; os erros históricos de sessões expiradas permanecem apenas
  como registro para monitoramento, não como bloqueio de lançamento.
- [x] Preparar as credenciais Live sem misturar ambientes: a tentativa de
  alinhamento confirmou que o backend ainda estava com a chave secreta Test
  (`billing_internal_error` após `STRIPE_LIVEMODE=true`). O frontend e os
  secrets foram restaurados para Test, que voltou a responder o catálogo com
  `200`. A chave Live foi copiada novamente em formato completo, o catálogo
  Live passou a responder `200` com os dois preços e o segredo do webhook Live
  foi atualizado. O frontend Live foi publicado no alias
  `www.vourevisar.com.br`; a tela de planos e o Payment Element anual carregam
  sem nova cobrança. A compra Live posterior de 24/08 confirmou uma nova
  entrega processada pela cadeia atual: pagamento, acesso, e-mail ao aluno e
  alerta operacional interno.

- [x] Correlacionar o erro de producao `StripeIdempotencyError` com a criacao
  de sessao e a tentativa persistida.
- [x] Isolar a chave de idempotencia pela versao do contrato, usuario, cliente
  Stripe resolvido e solicitacao do navegador.
- [x] Tornar incompativeis as sessoes antigas que exigem endereco de cobranca;
  o formulario usa apenas `PaymentElement`, portanto a sessao atual coleta o
  endereco no modo automatico e nao depende de `Address Element` ausente.
- [x] Aplicar e validar a migration de separacao de clientes por modo antes de
  qualquer nova rotacao de conta Stripe. A migration
  `20260820172644_isolate_stripe_billing_by_mode` foi aplicada e registrada no
  projeto remoto; a leitura de assinatura Test permaneceu ativa após o deploy.
  O histórico foi reconciliado e `supabase db push --linked --dry-run` confirma
  que o banco remoto está atualizado.
- [x] Corrigir as ambiguidades detectadas pelo lint nas funções
  `get_unified_subject_name` e `get_unified_topic_name`; a migration
  `20260820175016_fix_unified_name_function_ambiguity` foi aplicada e o lint
  SQL não apresenta mais erros bloqueantes.
- [x] Preservar a rota completa após o login, incluindo `?plan=annual` e
  `from=subscription`, e retornar o Portal Stripe na mesma aba para manter a
  sessão Supabase e evitar o flash da tela de login.
- [x] Publicar o bundle corrigido no domínio oficial Test e repetir o teste
  visual dos dois fluxos. O bundle foi construído com as variáveis públicas de
  Test, publicado no projeto Vercel correto e o alias
  `www.vourevisar.com.br` foi apontado explicitamente para a implantação. O
  domínio oficial passou a servir os chunks corrigidos e `/conta/assinatura`
  carregou com a assinatura Test ativa, sem o erro de configuração anterior.
  O clique anual em uma sessão deslogada foi validado com a conta Test
  independente `darciliokv@proton.me`; a sessão abriu, o pagamento foi
  aprovado e o acesso anual foi liberado.
- [x] Rotacionar a chave publicável Stripe Test expirada. O checkout da conta
  `dwefotografia@proton.me` reproduziu `api_key_expired`; a nova chave pública
  Test foi configurada no Vercel Production e o bundle foi republicado. O
  Payment Element passou a carregar e os pagamentos mensal e anual Test foram
  concluídos.
- [x] Executar um pagamento de ponta a ponta no ambiente Test correspondente
  ao dominio oficial, confirmar webhook e acesso em `/conta/assinatura`.
- [x] Validar cancelamento agendado no Portal Stripe Test: o Portal e
  `/conta/assinatura` preservam o acesso ate o fim do periodo pago e exibem a
  renovacao como cancelada.
- [x] Corrigir e revalidar troca de mensal para anual no Portal Stripe Test.
  Com "sem encargos ou creditos", a mudanca atualizou imediatamente o periodo
  para anual (`20/08/2026` a `20/08/2027`) sem criar fatura ou pagamento de
  `R$ 99,90`; a proxima cobranca ficou em `20/08/2027`. Isso concede um ano
  de acesso sem cobranca e bloqueia a ativacao equivalente em Live. A
  configuracao Test foi corrigida para "Ratear taxas e creditos", com rateio
  proporcional imediato. Em nova assinatura mensal, a troca criou a fatura
  paga de `R$ 87,00` (credito dos `R$ 12,90` mensais) e o pagamento
  `Subscription update`; o webhook atualizou `/conta/assinatura` para Plano
  anual, acesso ativo e renovacao em `20/08/2027`.
- [x] Validar confirmação por e-mail no ambiente Test. Após o pagamento mensal
  da conta `dwefotografia@proton.me`, o Proton recebeu `Assinatura confirmada —
  vouRevisar` de `noreply@vourevisar.com.br`, com plano mensal, valor de
  `R$ 12,90`, período seguinte e link para `/conta/assinatura`. Em Live,
  recibos automáticos da Stripe continuam dependendo da configuração
  "Pagamentos concluídos"; a confirmação mensal do webhook via Resend foi
  validada. A confirmação anual também chegou ao Proton para
  `darciliokv@proton.me`, com plano anual, `R$ 99,90` e período até
  `21 de agosto de 2027`.
