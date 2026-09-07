# Plano — ativação de primeiro valor, retorno pós-pagamento e retomada de acesso

> Plano de execução vinculado ao [plano mestre](./saas-master-plan.md). Não implementar etapas isoladas sem validar a jornada inteira com uma conta de aluno.

## Problema que este plano resolve

Hoje, uma pessoa que acabou de entrar ou de pagar pode cair no Painel sem entender o que o vouRevisar transforma, qual resultado receberá ou qual é a primeira ação. A confirmação de checkout também aponta cegamente para `/dashboard`, mesmo quando ainda não há edital ou ciclo. Isso cria uma tela vazia no exato momento em que o aluno precisa de direção.

O problema não é falta de uma apresentação institucional. É falta de uma transição guiada e útil entre **acesso liberado** e **primeiro tópico iniciado**.

Há um segundo ponto de quebra na mesma jornada: quando um acesso gratuito termina, o guard leva o aluno diretamente aos preços. A mensagem atual não consegue explicar se o que acabou foi o teste inicial de 7 dias, uma cortesia concedida pela administração ou uma assinatura. Isso faz a oferta parecer abrupta e obriga o aluno a procurar a explicação em `Conta`.

## Objetivo e limite de escopo

**Objetivo:** levar o aluno, com uma única ação prioritária por vez, de “entrei/paguei” a “tenho um edital, um ciclo e comecei o primeiro tópico”, explicando o valor do produto enquanto ele o constrói.

**Resultado observável de ativação:** o aluno iniciou o estudo de um primeiro tópico dentro de um ciclo válido.

Fora do escopo:

- tour obrigatório de telas, carrossel de marketing ou vídeo que bloqueie o uso;
- métricas, prazos, aprovação ou progresso fictícios;
- alterar cobrança, permissões ou regras de revisão;
- redesenhar o Painel de alunos já ativados.

## Decisão de produto

Criar uma rota protegida de **Ativação** (`/ativacao`) e usá-la somente enquanto o aluno ainda não atingiu o primeiro estudo. Ela continua no shell autenticado, mas reduz a competição visual: uma mensagem de contexto, um benefício concreto e uma CTA principal.

O Painel permanece a casa de quem já começou a estudar. Para quem ainda não começou, ele deixa de ser a porta inicial. Após a ativação, uma lista curta e retomável pode aparecer no Painel apenas se houver algo real pendente — nunca como onboarding permanente.

**Princípio de copy:** não prometer “organização inteligente” de forma abstrata. Mostrar a cadeia real: **edital → matérias e tópicos → ciclo → próxima ação de estudo → revisões registradas**.

## Direção visual: mesa de estudo com energia precisa

Não vamos herdar o aspecto genérico de cards brancos da tela de preços atual. A ativação precisa parecer o momento em que um edital extenso ganha forma — premium, mas calmo e utilizável todos os dias.

**Conceito: “o edital ganha trilho”.** A primeira tela combina uma área editorial de decisão com uma representação visual do percurso. À esquerda, a promessa curta e uma CTA; à direita, um trilho gráfico que conecta `Edital`, `Ciclo` e `Próximo estudo`. O trilho não mostra percentual, prazo ou matérias fictícias: antes da escolha, é uma composição abstrata; depois dela, passa a refletir apenas os marcos concluídos de verdade.

### Layout

- **Desktop:** painel hero de largura contida, com composição assimétrica 55/45; texto e CTA no lado de leitura, trilho/estado no lado visual. Abaixo, as três formas de começar em ordem clara: Catálogo, PDF com IA, Manual. Não usar uma parede de cards idênticos.
- **Mobile:** uma coluna; mensagem, CTA e primeiro marco ocupam a primeira dobra sem texto comprimido. As alternativas surgem abaixo da CTA, em blocos de toque confortáveis, sem carrossel horizontal.
- **Estados posteriores:** o hero fica menor e dá lugar ao conteúdo real do edital ou ciclo. A interface não repete uma “apresentação” depois que o aluno já demonstrou que entendeu o caminho.
- **Retomada de acesso:** antes dos preços, uma faixa de contexto com motivo, data e preservação do trabalho. Os planos entram como decisão seguinte, não como surpresa visual.

### Cor, tipografia e ícones

- Base de trabalho clara e nítida; o painel de ativação pode usar azul-noite profundo (`#17122B`) como contraste premium, com texto branco de alta legibilidade.
- Cobalto da marca conduz a CTA e o trilho; ciano indica movimento; lime é um acento raro de confirmação/conquista; violeta identifica somente o caminho de IA. Não usar azul lavado em tudo, nem arco-íris para parecer “vivo”.
- Plus Jakarta Sans permanece para continuidade da marca, mas títulos de ativação usam peso alto, largura contida e quebra projetada para português — nunca título gigante que empurre a ação para baixo da dobra.
- Ícones lineares e expressivos, no máximo um por decisão: `FileStack`/edital, `Orbit`/ciclo, `Play`/primeiro estudo, `Sparkles`/IA. A forma e o texto precisam funcionar juntos; ícone não será explicação isolada.

### Movimento e acabamento

- Na entrada, o trilho é desenhado uma vez e o primeiro nó ganha foco; ao concluir uma ação real, o nó se fecha e o próximo aparece. Duração curta, sem loop e com `prefers-reduced-motion` respeitado.
- Hover em desktop eleva apenas a opção que será escolhida; no mobile, feedback de toque e transição de estado substituem hover.
- Sem blobs flutuantes, confete, brilho permanente, gradiente em todos os cards, ícones ornamentais ou animações que concorram com o estudo. Energia visual só acompanha uma decisão ou conquista verificável.

O mesmo vocabulário será aplicado à retomada: uma superfície escura e segura para o motivo do encerramento, seguida de planos compactos e mais densos. Assim, a cobrança parece continuação da preparação, não uma tela genérica de checkout inserida no produto.

## Estados, mensagem e próxima ação

| Estado derivado de dados reais | Mensagem de valor | CTA principal | Destino/efeito |
| --- | --- | --- | --- |
| Sem edital | “Transforme o conteúdo do seu concurso em um plano de estudo que mostra por onde começar.” | `Escolher edital` | Abrir escolha com Catálogo como caminho principal, importação por IA como alternativa e criação manual como terceira opção. |
| Edital sem conteúdo | “O edital já existe; faltam as matérias e tópicos para montarmos seu plano.” | `Completar conteúdo` | Abrir o edital correto no fluxo de completar/importar. |
| Edital com conteúdo, fora do ciclo | “Seu conteúdo está pronto. Carregue-o no ciclo para o vouRevisar organizar a próxima matéria.” | `Montar meu ciclo` | Abrir o carregamento do edital correto, preservando as validações de merge existentes. |
| Ciclo válido, sem primeiro estudo | “Seu plano está pronto. Comece pelo primeiro tópico e o sistema passa a organizar suas revisões.” | `Começar meu primeiro tópico` | Abrir a ação de estudo recomendada pelo ciclo. |
| Primeiro tópico iniciado | “Você já tem uma próxima ação.” | — | Encerrar a ativação e usar o Painel normal. |

Se houver mais de um edital elegível, a tela deve pedir uma escolha explícita. Não selecionar ou carregar um edital automaticamente só para abreviar o fluxo.

## Retorno após pagamento

`StripeCheckoutReturn` continuará confirmando a assinatura antes de oferecer navegação, mas o botão de continuidade não poderá mais apontar fixamente para `/dashboard`.

Depois da confirmação, a aplicação deve consultar o mesmo modelo de estado usado na ativação:

- sem edital, edital incompleto ou ciclo ausente: `Continuar a configurar meu plano` → `/ativacao`;
- ciclo pronto, sem primeiro estudo: `Começar meu plano` → `/ativacao`;
- aluno já ativado: `Ir para meu próximo estudo` → Painel, usando sua recomendação real.

A assinatura e as concessões continuam sendo confirmadas pelo backend de billing. O estado de ativação nunca concede acesso nem substitui esse contrato.

## Retomada quando o acesso gratuito termina

### Diagnóstico do contrato atual

O guard de rotas reduz a negativa de acesso a `subscription_expired` ou `subscription_required` e entrega esse valor apenas no `location.state`. A página `/planos` usa o dado para uma faixa genérica; em reload, ele deixa de existir. Mais importante: a visão de billing seleciona somente concessões ainda ativas. Quando um teste ou cortesia expira, ela retorna `source: none` e `access_until: null`, então o frontend perde a origem e a data que precisaria explicar.

Isso também explica a inconsistência de `Conta`: qualquer acesso gratuito usa o rótulo visual de “Teste gratuito”, inclusive quando sua origem real é uma concessão manual. Não é apenas problema de copy; é informação de domínio perdida na fronteira do backend.

### Solução de produto e contrato

Manter `BillingOverview.source` como fonte do **acesso atual** e acrescentar um contexto de término read-only, por exemplo `last_expired_access`, quando não houver acesso vigente. Esse objeto deve ter somente campos seguros para o próprio aluno:

```ts
type LastExpiredAccess =
  | { kind: 'initial_trial'; endedAt: string }
  | { kind: 'courtesy'; endedAt: string }
  | { kind: 'paid_subscription'; endedAt: string }
  | null;
```

O backend deriva `initial_trial` exclusivamente de `billing_access_grants.source = 'trial'`; deriva `courtesy` de `manual` ou `goodwill`; e só expõe o último grant que terminou naturalmente (`revoked_at IS NULL`). Uma revogação, uma falha de pagamento, um estorno ou uma conta sem histórico não pode ser disfarçada de “cortesia encerrada”. O campo interno `reason` da concessão não vai ao cliente.

Com isso, `/planos`, `Conta > Assinatura` e o guard compartilham uma mesma classificação derivada do overview carregado, inclusive após reload. `location.state` pode preservar a rota de origem para “voltar”, mas não será a fonte de verdade do motivo financeiro.

### Mensagem antes da oferta

| Contexto confirmado pelo backend | Cabeçalho | Explicação | CTA para a oferta |
| --- | --- | --- | --- |
| Teste inicial expirado | `Seu teste de 7 dias terminou` | `Ele terminou em {data}. Seus editais, ciclo e histórico continuam preservados.` | `Escolher como continuar` |
| Cortesia expirada | `Sua cortesia terminou` | `Esse acesso foi liberado para você conhecer o vouRevisar e terminou em {data}. Seu progresso continua salvo.` | `Escolher um plano` |
| Assinatura encerrada | `Sua assinatura foi encerrada` | `O acesso terminou em {data}; suas informações continuam disponíveis para você retomar.` | `Retomar meus estudos` |
| Sem histórico conclusivo | `Seu acesso não está ativo` | `Escolha um plano para voltar aos seus estudos.` | `Ver planos` |

Os planos continuam visíveis logo abaixo desse bloco. Não deve haver modal obrigatório, culpa artificial, contagem regressiva inventada ou alegação de que o aluno perderá dados se não pagar.

## Arquitetura proposta

1. **Modelo de jornada puro.** Compor `getCycleEntryState`, `getStudyEmptyStateKind` e o modelo de decisão do Painel em um `getActivationJourney(...)` tipado. Ele recebe somente dados já carregados e devolve estado, copy, CTA e destino; não consulta Supabase nem navega.
2. **Hook coordenador.** `useActivationJourney` reúne queries/hooks existentes, expõe loading, erro recuperável e o modelo puro. A página e os componentes recebem dados/callbacks; não fazem chamadas diretas ao Supabase.
3. **Componentes pequenos.** Página fina `Activation`, `ActivationHero`, `ActivationProgress` (somente passos comprovados) e cartões de escolha de origem. Cada componente declara o estado que representa antes de ganhar variações visuais.
4. **Rotas e guardas.** A rota exige a mesma autenticação e assinatura ativa do restante do produto. O redirecionamento para ela ocorre após login, após checkout e quando o Dashboard detectar um aluno não ativado; o guard não pode gerar loop enquanto as queries carregam ou falham.
5. **Persistência mínima.** Edital, ciclo e primeiro estudo são fatos derivados das tabelas de domínio existentes. Persistir apenas o que não puder ser derivado com segurança — por exemplo, método de entrada escolhido ou boas-vindas vistas — após auditoria do schema. Não gravar timestamps duplicados por conveniência.
6. **Contexto de acesso encerrado.** O overview de billing expõe o acesso corrente e, quando necessário, o último término classificado. Componentes de UI não leem `billing_access_grants`, nem tentam inferir cortesia por texto, plano ou `location.state`.

## Instrumentação e segurança

Antes de medir, auditar o contrato de `user_events` e sua constraint de tipos. Caso sejam necessários eventos novos, adicionar migration específica, política RLS por `auth.uid() = user_id` e allowlist estreita; eventos analíticos não podem conceder permissão, alterar assinatura ou conter conteúdo de edital.

Eventos candidatos, todos com propriedades mínimas e sem texto sensível:

- `ACTIVATION_VIEWED`
- `ACTIVATION_METHOD_SELECTED`
- `ACTIVATION_EDITAL_READY`
- `ACTIVATION_CYCLE_READY`
- `ACTIVATION_FIRST_STUDY_STARTED`
- `ACTIVATION_COMPLETED`

O funil deve usar denominadores explícitos: acesso liberado → ativação vista → edital com conteúdo → ciclo válido → primeiro estudo iniciado → retorno D1/D7. Primeiro levantar a linha de base; não inventar metas numéricas antes de haver volume.

## Etapas de execução

### 0. Descoberta e contrato

- [x] Confirmar, em código e banco, as fontes de verdade de edital, conteúdo, ciclo e primeiro estudo; definir a regra exata para “primeiro tópico iniciado”.
- [x] Auditar os redirecionamentos de login, callback de Stripe e Dashboard para evitar destinos concorrentes ou loops.
- [x] Validar copy com a promessa real do produto e definir quais dados factuais podem aparecer em cada estado.
- [x] Mapear a classificação do último acesso encerrado (teste inicial, cortesia, assinatura, revogação/estorno e ausência de histórico), preservando a fonte atual de acesso e sem expor o motivo administrativo.

**Saída:** matriz de estados fechada e contrato tipado aprovado; nenhuma UI nova ainda.

### 1. Modelo, rota e testes de decisão

- [x] Implementar o modelo puro e o hook coordenador, reaproveitando queries e serviços existentes.
- [x] Criar rota protegida `/ativacao` e ajustar destinos de login, Dashboard e checkout conforme a matriz.
- [x] Cobrir em teste cada estado, carregamento, erro recuperável, múltiplos editais e prevenção de loop de rota.
- [x] Cobrir a classificação de acesso expirado após reload, para que teste de 7 dias e cortesia administrativa nunca usem a mesma copy.

**Portão:** cada aluno chega a uma única CTA suportada pelo seu estado real.

### 2. Interface de ativação e design premium

- [x] Implementar a experiência responsiva para desktop, tablet e mobile com hierarquia de “o que o sistema faz”, “o que você ganha agora” e “como começar”.
- [x] Usar componentes do sistema e tokens semânticos; não introduzir cores hard-coded nem um segundo design system.
- [x] Dar ao Catálogo destaque inicial, mantendo IA e manual visíveis como alternativas honestas, sem esconder custo, tempo ou limitação de nenhum caminho.
- [ ] Reutilizar o conteúdo de estados vazios onde fizer sentido, sem transformar `StudyEmptyState` em uma página genérica de onboarding.
- [x] Construir o hero “edital ganha trilho”, seus três marcos e o motion de transição com tokens semânticos, contraste verificado e `prefers-reduced-motion`.
- [x] Refazer a composição de planos para a retomada: contexto de término primeiro, depois comparação compacta de mensal/anual; eliminar os blocos excessivamente arredondados, grandes vazios e azuis locais que hoje descaracterizam a hierarquia.

**Portão:** a primeira dobra explica o próximo resultado e deixa uma CTA inequívoca; navegação, foco, teclado e leitura de tela permanecem funcionais.

### 3. Transições reais, pós-checkout e acesso encerrado

- [x] Conectar cada CTA à ação existente de catálogo, importação, edição, carregamento de ciclo ou início de estudo, preservando merge e validações já vigentes.
- [x] Fazer o retorno de checkout decidir a continuidade pelo estado derivado, somente depois da confirmação de acesso.
- [x] Recarregar/invalidate queries após cada passo para que a tela reflita a persistência real, sem marcar etapa concluída de forma otimista e irreversível.
- [x] Evoluir o RPC/Edge Function que entrega o overview de billing com o contexto seguro do último acesso expirado; aplicar migration apenas se a consulta exigir mudança de contrato/schema, mantendo RLS, ownership e dados administrativos protegidos.
- [x] Fazer `/planos` e `Conta > Assinatura` renderizarem a mesma explicação factual; usar o estado de rota somente como retorno, nunca como motivo de acesso.

**Portão:** um aluno de teste percorre catálogo ou importação → ciclo → primeiro tópico sem perder contexto.

### 4. Medição e aprendizado

- [x] Criar migration/eventos somente após a auditoria da etapa 0; gerar tipos e cobrir RLS/ownership.
- [ ] Instrumentar uma leitura administrativa agregada do funil, sem PII ou conteúdo do edital.
- [x] Medir a visualização do contexto de acesso encerrado e o início de checkout separadamente para cada origem, sem atribuir abandono a uma origem apenas por pageview.
- [ ] Registrar a linha de base e acompanhar retorno D1/D7 antes de propor experimento de copy ou interface.

**Portão:** há evidência de queda entre passos; nenhuma decisão é tomada a partir de pageview isolado.

### 5. Homologação de ponta a ponta

- [ ] Validar as cinco situações da matriz com conta de aluno, incluindo desktop e mobile.
- [ ] Validar retorno de checkout no ambiente de teste com assinatura ativa e com aluno já ativado.
- [ ] Validar visual e semanticamente o bloqueio em desktop e mobile para: teste inicial vencido, cortesia administrativa vencida, assinatura encerrada, acesso revogado/estornado e usuário sem histórico. Conferir a mesma verdade depois de recarregar `/planos` e em `Conta > Assinatura`.
- [x] Rodar lint, testes focados e completos conforme impacto, typecheck, `npm run architecture:check`, build e `git diff --check`.
- [ ] Publicar somente depois de conferir a rota autenticada renderizada em produção, não apenas o deploy.

## Critério de conclusão

O plano estará concluído quando uma pessoa recém-autenticada ou recém-paga conseguir entender, sem tour obrigatório: (1) que o produto organiza o edital em um ciclo e próxima ação; (2) o que precisa fornecer para isso funcionar; (3) qual é a ação seguinte; e quando completar o primeiro estudo em um fluxo real. A conclusão exige evidência de cada estado, dos redirects e do funil mínimo — não apenas uma tela bonita publicada.

## Riscos a evitar

- Duplicar estado de domínio em flags de onboarding e depois mostrar progresso errado.
- Usar evento do cliente como fonte de verdade de assinatura, acesso ou conclusão de estudo.
- Criar um funil linear que falha para aluno que já possui edital ou volta depois de abandonar.
- Mostrar vários CTAs com o mesmo peso e chamar isso de autonomia.
- Otimizar retorno em sete dias antes de medir onde o primeiro valor está sendo perdido.
- Reaproveitar “Teste gratuito” como rótulo para uma cortesia manual, ou tentar recuperar a origem do acesso somente pelo estado de navegação.
