# Design: Dashboard de Decisao do Aluno

## Objetivo

Transformar a Dashboard em uma central de decisao diaria para o aluno de concurso. A tela deve responder, em poucos segundos:

1. O que esta atrasado?
2. O que devo fazer agora?
3. O que vem depois?
4. Como estou evoluindo?

A Dashboard nao deve inventar dados, previsoes ou prioridades. Toda metrica deve ser calculada a partir de informacoes existentes no sistema. Quando faltar dado, a interface deve mostrar um estado honesto e uma acao clara para o aluno completar a informacao.

## Principios de produto

- Nenhuma informacao solta: se a tela citar materia, topico, revisao, lembrete, edital ou data da prova, o item deve ser clicavel ou ter uma acao direta.
- Revisoes urgentes preservam prioridade cientifica: revisoes atrasadas e de hoje aparecem antes de topicos novos porque protegem retencao e seguem a logica de revisao espacada do produto.
- O ciclo do aluno deve ser respeitado: topicos novos sugeridos como proxima acao devem vir da ordem carregada no Ciclo de Estudos.
- Cobranca/incidencia entra como sinal estrategico, nao como comando cego. Se a analise estiver ausente ou parcial, a interface deve tratar isso explicitamente.
- A Dashboard e uma tela funcional, nao uma landing page. O visual premium deve acelerar decisao, nao decorar informacao.

## Fontes de verdade

### Concurso e edital ativo

O concurso exibido na Dashboard deve ser o edital/concurso carregado no Ciclo de Estudos. A Dashboard nao deve escolher outro edital solto do usuario.

Se nao houver edital/ciclo ativo:

- mostrar mensagem amigavel explicando que o painel depende de um edital carregado no ciclo;
- oferecer acao para ir ao Ciclo de Estudos;
- permitir que o restante da Dashboard mostre dados globais seguros quando existirem, como lembretes e historico recente, sem ritmo ate a prova.

### Data da prova

Se existir data da prova, a Dashboard pode calcular dias restantes e ritmo necessario.

Se nao existir data da prova:

- nao mostrar ritmo ate a prova como numero;
- provocar o aluno a definir uma data real ou aproximada;
- oferecer acao para configurar a data no local correto;
- manter revisoes, ciclo, lembretes e consistencia recente funcionando sem previsao.

### Revisoes

As revisoes da Dashboard devem usar a mesma fonte/logica da pagina Revisoes para evitar divergencia. A Dashboard deve consumir os estados:

- atrasadas;
- vencendo hoje;
- futuras proximas, quando necessarias para contexto de ritmo;
- feitas no historico, para consistencia e memoria de atividade.

### Topicos novos e ciclo

O proximo topico novo deve ser calculado a partir do ciclo carregado:

- respeitar a ordem definida pelo aluno;
- ignorar materias concluidas no ciclo;
- encontrar o primeiro topico ativo ainda sem primeiro contato na primeira materia elegivel;
- distinguir claramente `Iniciar estudo` de `Continuar estudo`.

### Cobranca e incidencia

O sistema deve lidar com tres estados:

- sem analise de cobranca: nao mostrar prioridade por cobranca;
- analise parcial: mostrar somente itens analisados, com linguagem indicando que o sinal vem dos topicos ja analisados;
- analise suficiente: permitir destaque estrategico de topicos/materias de alta cobranca.

Mesmo quando houver cobranca alta, a Dashboard deve apontar materia/topico especifico e oferecer acao. Exemplo correto: `Direito Constitucional tem 3 topicos de alta cobranca sem primeiro contato`.

## Hierarquia da tela

### 1. Topo vivo

Area premium, motivadora e objetiva.

Conteudo:

- saudacao contextual;
- nome do concurso/edital carregado no ciclo;
- dias ate a prova, se houver data;
- chamada para definir data, se faltar;
- resumo de ritmo quando calculavel;
- tom positivo, sem prometer resultado.

Visual:

- superficie especial com gradiente controlado;
- profundidade sutil;
- chips de status;
- dark e light mode com qualidade equivalente;
- sem hero de landing page.

### 2. Melhor proxima acao

Card principal da Dashboard. Deve mostrar uma unica acao prioritaria com motivo claro.

Ordem de decisao:

1. revisao atrasada;
2. revisao vencendo hoje;
3. proximo topico novo do ciclo;
4. topico de alta cobranca ainda nao iniciado, quando houver dado confiavel;
5. se tudo estiver em dia, proximo avanco positivo no ciclo.

Cada acao deve ter:

- nome da materia;
- nome do topico, quando aplicavel;
- motivo curto;
- botao primario para executar;
- botao secundario para abrir detalhe.

Linguagem de acao:

- topico sem primeiro contato: `Iniciar estudo`;
- topico ja iniciado: `Continuar estudo`;
- revisao atrasada ou de hoje: `Revisar agora`;
- item informativo: `Abrir detalhes` ou `Ver no ciclo`.

### 3. Fila curta de proximas acoes

Lista curta, no maximo 3 acoes, abaixo da acao principal.

Objetivo:

- dar continuidade sem sobrecarregar;
- mostrar o que vem depois da acao principal;
- combinar revisoes urgentes, proximo topico do ciclo e alerta estrategico quando existir.

Nao deve virar tabela.

### 4. Ritmo ate a prova

Bloco calculado somente quando houver data da prova e dados suficientes.

Entradas possiveis:

- dias restantes;
- topicos ativos do edital/ciclo;
- topicos iniciados;
- topicos sem primeiro contato;
- revisoes atrasadas;
- revisoes de hoje;
- revisoes futuras proximas;
- historico real de estudo;
- tempo medio dos topicos iniciados, quando disponivel;
- ritmo recente do aluno;
- dados de cobranca quando confiaveis.

Saida para o aluno:

- quantos topicos novos precisa iniciar por dia ou por semana;
- quantas revisoes precisa fazer para manter o cronograma;
- estado honesto quando o calculo nao for confiavel.

O calculo deve ser implementado em camada propria de dominio/hook, nao diretamente dentro da pagina.

### 5. Continue estudando

Bloco com 2 ou 3 itens do ciclo:

- proxima materia/topico da fila;
- status de primeiro contato;
- acao direta;
- link para Ciclo de Estudos.

Este bloco nao substitui a pagina Ciclo. Ele e um atalho.

### 6. Ultimos lembretes

Mostrar lembretes criados pelo aluno, sem misturar com notificacoes automaticas.

Cada lembrete deve ter:

- titulo;
- data/contexto;
- link para abrir;
- acao de concluir, quando ja existir no fluxo.

Estado vazio:

- mensagem breve;
- acao para criar ou abrir lembretes, conforme padrao existente.

### 7. Sua trajetoria

Area de evolucao e memoria operacional.

Componentes:

- consistencia recente com alternancia `7 dias`, `14 dias` e `Mes`;
- card/calendario de atividade clicavel reaproveitando a ideia atual do Painel;
- detalhes por dia com estudos, revisoes, tempo, dificuldade e links para topicos;
- progresso do edital iniciado;
- evolucao geral da dificuldade, preservada em versao visual mais madura;
- frequencia de estudos, preservada se continuar ajudando decisao.

Dias sem estudo devem ser neutros, nao punitivos.

## Estados obrigatorios

- Sem ciclo/edital ativo.
- Sem data da prova.
- Data da prova no passado.
- Sem revisoes pendentes.
- Revisoes atrasadas e revisoes de hoje ao mesmo tempo.
- Somente revisoes atrasadas.
- Somente revisoes de hoje.
- Tudo em dia.
- Sem topicos novos no ciclo.
- Sem analise de cobranca.
- Analise de cobranca parcial.
- Erro ao carregar dados.
- Dados insuficientes para calcular ritmo.

## Arquitetura proposta

Criar uma camada de leitura/modelagem da Dashboard que entregue um view model pronto para os componentes.

Responsabilidades dessa camada:

- buscar/combinar dados do ciclo, revisoes, historico, lembretes e configuracoes;
- reutilizar hooks/services existentes sempre que possivel;
- centralizar regras de prioridade;
- produzir estados honestos quando faltar dado;
- impedir divergencia de numeros entre Dashboard, Ciclo e Revisoes.

A pagina `Dashboard.tsx` deve orquestrar layout e componentes, nao concentrar regras de negocio.

## Componentes planejados

- `DashboardHeroContext`: saudacao, concurso, data e status de ritmo.
- `NextBestActionCard`: melhor proxima acao.
- `ActionQueueCard`: fila curta de proximas acoes.
- `ExamPaceCard`: ritmo ate a prova com estados honestos.
- `ContinueCycleCard`: proximos itens do ciclo.
- `RecentRemindersCard`: ultimos lembretes.
- `StudyActivityCard`: consistencia e atividade por dia.
- `TrajectorySummary`: progresso e evolucao.

Os nomes finais podem seguir padroes existentes do repositorio.

## Visual

Direcao:

- premium, tecnologico, elegante e funcional;
- superficies com profundidade sutil;
- gradientes localizados;
- bordas finas e coerentes com tokens;
- microinteracoes discretas;
- sem excesso de glow;
- sem cards dentro de cards;
- responsivo de verdade em desktop, tablet e mobile.

Cores semanticas:

- atrasado: coral/vermelho controlado;
- hoje: amber;
- em dia: verde;
- avanco/estrategia: azul/ciano;
- neutro: superficies do tema.

## Responsividade

Desktop:

- topo vivo e melhor proxima acao visiveis no primeiro viewport;
- coluna principal para decisao;
- lateral para ritmo, lembretes e trajetoria compacta.

Tablet:

- blocos empilhados em duas regioes;
- prioridade visual permanece em `Melhor proxima acao`.

Mobile:

Ordem:

1. topo vivo;
2. melhor proxima acao;
3. fila curta;
4. continue estudando;
5. ritmo/lembretes;
6. sua trajetoria.

Nenhum texto deve quebrar controles, sair de cards ou exigir rolagem horizontal.

## Validacao

Antes de considerar pronto:

- verificar que os numeros batem com Ciclo e Revisoes;
- validar estados sem data, sem ciclo e sem cobranca;
- testar dark e light mode;
- testar desktop, tablet e mobile;
- validar cliques principais para materia, topico, revisao, ciclo, lembrete e configuracao de data;
- rodar lint/build conforme escopo da implementacao;
- usar navegador/Playwright para comparar o visual com a direcao aprovada.

## Fora do escopo inicial

- Recriar regras cientificas de revisao.
- Alterar algoritmos centrais de revisao sem necessidade.
- Reordenar automaticamente o ciclo do aluno.
- Criar dados ficticios para preencher UI.
- Transformar Dashboard em pagina de estatisticas completa.
- Substituir a pagina Ciclo ou Revisoes.
