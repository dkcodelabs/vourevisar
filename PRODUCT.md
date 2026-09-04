# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O usuário principal é o estudante de concurso público, normalmente orientado por um edital definido. Ele precisa decidir com rapidez o que estudar ou revisar agora, registrar o resultado do contato com o conteúdo e continuar a rotina sem montar manualmente toda a sequência de estudo.

## Product Purpose

O vouRevisar organiza a preparação do aluno a partir do edital e transforma conteúdo programático, ciclo de estudos, revisões e prática em uma rotina executável. O resultado esperado é reduzir a carga de planejamento, manter continuidade entre estudo e revisão e dar ao aluno uma próxima ação clara baseada em dados reais.

## Positioning

O diferencial do vouRevisar é conectar `edital → ciclo → estudo/treino → revisão → evolução` em um único sistema. A próxima ação considera o escopo ativo do aluno, seu histórico, a dificuldade registrada, as revisões pendentes e o progresso real, em vez de oferecer apenas um calendário genérico ou uma coleção isolada de materiais.

## Operating Context

- O aluno adiciona um edital pelo catálogo, por PDF com IA ou por criação manual e carrega as matérias no ciclo ativo.
- O Painel deve indicar a próxima ação; o Ciclo organiza e registra o estudo; Treino oferece prática; Revisões mantém a agenda espaçada; Evolução explica o progresso sem criar uma fila operacional concorrente.
- A jornada principal é `entrar → saber o que fazer → estudar ou revisar → registrar → continuar`.
- O uso acontece em desktop, tablet e mobile, frequentemente em sessões recorrentes de estudo e com necessidade de leitura rápida.
- Conta, assinatura, ajuda, editais e configurações sustentam a jornada, mas não devem competir com a decisão principal de estudo.

## Capabilities and Constraints

- O produto cobre editais, matérias, tópicos, ciclo de estudos, revisões espaçadas, prática com questões e flashcards, cadernos, estatísticas, conta, assinatura e administração.
- Recomendações e métricas devem usar somente dados persistidos e contratos reais. A interface não pode inventar progresso, retenção, urgência, prova social ou desempenho.
- Prática e revisão têm contratos distintos: praticar não pode reagendar silenciosamente a revisão espaçada.
- O escopo de estudo deve respeitar o edital e o ciclo ativos do aluno; material histórico fora desse contexto não deve reaparecer como recomendação atual.
- Dados, autenticação, permissões e cobrança dependem de Supabase, RLS e validação de backend. Ocultar controles no frontend não substitui autorização.
- Preços e estado de acesso devem vir dos contratos reais de cobrança, nunca de valores ou estados simulados na interface.
- A interface deve ser responsiva e funcional em desktop, tablet e mobile. Não há, até o momento, um padrão formal de conformidade de acessibilidade confirmado para o produto.
- A identidade jurídica final do fornecedor, a revisão jurídica independente e o canal definitivo de suporte permanecem decisões operacionais abertas; não devem ser completados ou apresentados como validados pelo design.

## Brand Commitments

- Nome oficial: **vouRevisar**.
- Idioma principal: português do Brasil.
- O kit em `public/brand/` é a identidade oficial atual. O monograma combina um gesto de conclusão com a inicial de Revisar para comunicar ação, continuidade e progresso.
- A marca usa como referências o azul principal `#2F80FF`, verde energético `#63DF16` a `#D5FF45`, texto principal `#172033` e texto secundário `#617084`. O brilho azul aparece apenas em movimento de marca com começo e fim.
- O produto deve parecer moderno, elegante, minimalista, funcional e organizado, com hierarquia clara e componentes compactos.
- Clareza, velocidade de fluxo e confiabilidade dos dados prevalecem sobre decoração. Interfaces funcionais não devem ser transformadas em landing pages.

## Evidence on Hand

- O código do produto, os testes e o plano operacional em `docs/saas-master-plan.md` registram fluxos implementados e validações técnicas e de produção.
- `public/brand/README.md` e os arquivos em `public/brand/` documentam e materializam a identidade atual.
- O repositório contém telas e contratos reais para a jornada de edital, ciclo, estudo, revisão, treino, evolução, assinatura e suporte.
- Não há no repositório evidência validada de milhares de estudantes, retenção de 98%, depoimentos, estudos de caso ou ganhos públicos de conversão. Esses elementos não podem ser tratados como fatos. Claims existentes na landing page que usem esses números são conteúdo não comprovado, não evidência do produto.

## Product Principles

1. A próxima ação do aluno deve ser óbvia e levar a uma execução real.
2. Cada superfície tem uma responsabilidade: decidir, estudar, praticar, revisar ou compreender a evolução.
3. Dados reais e rastreáveis valem mais do que mensagens persuasivas sem prova.
4. A interface reduz carga cognitiva sem esconder contexto necessário para uma decisão segura.
5. Todo fluxo crítico deve funcionar de ponta a ponta em desktop e mobile antes de ser considerado concluído.

## Accessibility & Inclusion

O produto deve preservar legibilidade, navegação por controles reconhecíveis, estados claros de loading, erro e vazio, e comportamento responsivo sem sobreposição ou corte de conteúdo. Necessidades específicas de acessibilidade e um padrão formal de conformidade ainda não foram definidos.
