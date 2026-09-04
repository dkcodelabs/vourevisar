# Impeccable no vouRevisar

Use este guia quando a pergunta for “o que posso fazer com a Impeccable?”. Ele lista os comandos disponíveis e prompts seguros para as superfícies reais do produto.

## Como pedir

Use `$impeccable <comando> <alvo>` ou descreva o resultado desejado em português. Informe a rota, componente ou objetivo. Exemplo:

```text
$impeccable clarify src/pages/Revisoes.tsx
```

Evite pedidos genéricos como “deixa bonito”. Diga qual fluxo deve ficar mais claro, para qual aluno e qual restrição não pode ser quebrada.

## Comandos mais úteis

| Comando | Para que serve | Exemplo pronto para o vouRevisar |
|---|---|---|
| `impeccable` | Recebe uma recomendação de próximo passo ou uma direção visual livre. | `$impeccable deixar o card de próxima ação do Painel mais motivador, sem inventar métricas e sem usar neon como fundo` |
| `shape` | Descobre e especifica UX/UI antes de construir. | `$impeccable shape fluxo de primeiro acesso após importar um edital` |
| `critique` | Faz uma revisão de UX com problemas priorizados. | `$impeccable critique src/pages/PracticeHome.tsx` |
| `audit` | Audita acessibilidade, responsividade e qualidade técnica da interface. | `$impeccable audit src/pages/Revisoes.tsx` |
| `polish` | Faz o passe final de acabamento sem redesenhar o fluxo. | `$impeccable polish src/components/dashboard-decision/DashboardCommandHero.tsx` |
| `layout` | Corrige composição, espaçamento, ritmo e hierarquia. | `$impeccable layout src/pages/CicloEstudos.tsx para reduzir a competição entre a próxima ação e a visão do edital` |
| `clarify` | Reescreve copy de UX: rótulos, instruções, erros e CTAs. | `$impeccable clarify os estados vazios de Treino para deixar claro o próximo passo sem prometer geração automática` |
| `adapt` | Adapta uma tela para mobile, tablet e desktop. | `$impeccable adapt src/pages/PracticeHome.tsx para 375px sem perder o CTA de iniciar treino` |
| `harden` | Trata loading, erro, vazio, overflow, i18n e casos-limite. | `$impeccable harden a tela de Revisões para falha de conexão, fila vazia e títulos de edital longos` |
| `onboard` | Melhora primeiro acesso, ativação e estados vazios. | `$impeccable onboard o caminho sem edital: entrar → adicionar edital → carregar ciclo → iniciar estudo` |
| `live` | Permite selecionar elementos no navegador e aprovar variantes visuais. | `$impeccable live` |

## Referência completa

### Criar e organizar o sistema

| Comando | Quando usar | Exemplo |
|---|---|---|
| `init` | Registrar o contexto durável do produto em `PRODUCT.md`. | `$impeccable init` |
| `document` | Gerar ou atualizar o sistema visual em `DESIGN.md` a partir do código. | `$impeccable document` |
| `extract <alvo>` | Transformar tokens e padrões repetidos em componentes reutilizáveis. | `$impeccable extract src/components/ui` |
| `shape <feature>` | Definir jornada, estados e composição antes de uma nova superfície. | `$impeccable shape prática pós-estudo para tópico recém-concluído` |
| `craft <feature>` | Alias legado para criar uma superfície nova; prefira descrever o pedido diretamente ou usar `shape`. | `$impeccable craft central de ajuda do aluno` |

### Avaliar antes de mexer

| Comando | Quando usar | Exemplo |
|---|---|---|
| `audit <alvo>` | Há risco de a11y, responsividade, performance visual ou estados quebrados. | `$impeccable audit src/components/AppLayout.tsx` |
| `critique <alvo>` | A tela parece “before”, confusa ou sem uma decisão principal. | `$impeccable critique o fluxo Painel → Ciclo → Revisões` |

### Refinar a interface

| Comando | Quando usar | Exemplo |
|---|---|---|
| `animate <alvo>` | Adicionar movimento que comunique foco, avanço ou conclusão. | `$impeccable animate a confirmação de conclusão de tópico; movimento breve, sem celebração constante` |
| `bolder <alvo>` | Dar mais presença a uma tela excessivamente neutra. | `$impeccable bolder a próxima ação do Painel usando azul para prioridade e verde apenas para progresso confirmado` |
| `colorize <alvo>` | Adicionar cor estratégica a uma superfície monocromática. | `$impeccable colorize os indicadores de evolução; azul para ação, verde para conquista e âmbar para atenção` |
| `delight <alvo>` | Criar microdetalhes memoráveis sem atrapalhar estudo. | `$impeccable delight a transição ao concluir uma revisão, sem confete e sem esconder o próximo passo` |
| `layout <alvo>` | Reordenar informação e corrigir densidade. | `$impeccable layout src/pages/Treino.tsx para a recomendação aparecer antes da biblioteca de materiais` |
| `overdrive <alvo>` | Explorar uma direção deliberadamente mais ousada. Use somente em áreas apropriadas, não em tabelas operacionais. | `$impeccable overdrive a animação de marca na landing page, mantendo o app de estudo sóbrio` |
| `quieter <alvo>` | Reduzir excesso de brilho, cor, card ou ruído. | `$impeccable quieter o Painel: remova sombras e gradientes que não explicam estado` |
| `typeset <alvo>` | Corrigir tipografia, escala, leitura e hierarquia. | `$impeccable typeset os títulos e metadados de Revisões para leitura compacta no mobile` |
| `distill <alvo>` | Remover complexidade visual ou conteúdo redundante. | `$impeccable distill o bloco de estatísticas do Painel para preservar somente o que muda a próxima ação` |

### Tornar pronto para uso real

| Comando | Quando usar | Exemplo |
|---|---|---|
| `harden <alvo>` | Cobrir estados de loading, erro, vazio, overflow e foco. | `$impeccable harden src/components/StudyEmptyState.tsx` |
| `onboard <alvo>` | Desenhar ativação e primeira experiência. | `$impeccable onboard o estado em que o aluno tem edital, mas ainda não carregou matérias no ciclo` |
| `optimize <alvo>` | Diagnosticar e reduzir custo de UI, renderização ou bundle. | `$impeccable optimize src/pages/Statistics.tsx` |
| `polish <alvo>` | Finalizar depois que o fluxo e os estados já estão corretos. | `$impeccable polish src/components/dashboard-decision/DashboardCommandHero.tsx` |

### Iterar no navegador

| Comando | Quando usar | Exemplo |
|---|---|---|
| `live` | Comparar alternativas visuais de um elemento específico antes de persistir uma. | `$impeccable live` |

No Live Mode, abra a rota certa, selecione um elemento, descreva a direção e clique em **Go**. As três variantes ficam naquele elemento; use **Accept** para manter uma ou **Discard** para descartá-las. Mantenha-se na mesma rota durante a geração.

## Regras de direção do vouRevisar

- O fluxo vem antes da decoração: `entrar → saber o que fazer → estudar ou revisar → registrar → continuar`.
- Azul representa a única ação prioritária; verde representa progresso confirmado.
- Neon, brilho e gradiente pertencem a foco, progresso, transição e conclusão — nunca como fundo padrão.
- A base é moderna, elegante, compacta e estrutural: superfícies sólidas, bordas discretas e sombra/vidro apenas quando existe hierarquia ou estado.
- Não inventar desempenho, urgência, prova social ou métricas. Prática e revisão são fluxos distintos.

## Prompts por situação

```text
$impeccable critique o Painel: aponte onde o aluno ainda não sabe o que fazer primeiro. Preserve dados reais e priorize a jornada de estudo.

$impeccable layout src/pages/Revisoes.tsx: faça a fila de hoje e atrasadas ser escaneável em desktop e mobile, sem transformar a tela em cards decorativos.

$impeccable harden o fluxo de Treino para ciclo vazio, material indisponível, geração em andamento e erro de rede.

$impeccable adapt src/pages/CicloEstudos.tsx para 375px: texto longo não pode cortar, e a ação principal deve continuar evidente.

$impeccable clarify o estado sem edital: explique o bloqueio e ofereça somente o próximo CTA real.

$impeccable animate a conclusão de tópico: use uma transição curta de progresso e deixe a interface voltar ao estado calmo.

$impeccable quieter src/components/dashboard-decision/DashboardCommandHero.tsx: mantenha energia no anel de progresso, reduza brilho e profundidade decorativos.

$impeccable polish a página de assinatura antes de produção: preserve preços e contratos reais, confira hierarquia, foco e estados de erro.
```

## Limites importantes

- `shape` é melhor antes de construir algo novo; `polish` é melhor depois que o fluxo já funciona.
- `audit` e `critique` analisam; não autorizam mudança por si só. Peça explicitamente para implementar se quiser alteração.
- Para banco, autenticação, cobrança, RLS, Edge Functions ou deploy, a Impeccable não substitui as práticas específicas de Supabase, Stripe e Vercel.
- Em telas operacionais do aluno, não usar `overdrive` para substituir clareza por espetáculo.
