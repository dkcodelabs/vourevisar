# Testes de Integracao da Pagina de Ciclo

## Objetivo

Proteger os estados e decisoes centrais da pagina `Subjects.tsx` contra regressoes sem transformar a suite em uma reproducao fragil de toda a interface.

## Escopo

A primeira camada de integracao cobre:

- carregamento enquanto dados do ciclo e origens ainda estao pendentes;
- falha de carregamento apresentada ao aluno como estado explicito;
- ausencia total de materias com CTA para `Meus Editais`;
- ciclo ativo com topicos pendentes e suas acoes principais;
- ciclo sem novos topicos com prioridade para `Ir para Revisoes`;
- conclusao verdadeira direcionando para desempenho, sem reabrir ciclo indevidamente.

Ficam fora deste recorte merges, importacao de edital, edicao em massa, drag and drop e validacao visual por viewport. Esses fluxos exigem suites proprias porque possuem dependencias e riscos diferentes.

## Arquitetura Dos Testes

Os testes renderizam a pagina publica `Subjects` dentro de `MemoryRouter` e `QueryClientProvider`. Providers de autenticacao, contexto da aplicacao e hooks de dados serao substituidos nas fronteiras por mocks tipados e reutilizaveis. Componentes filhos pesados sem responsabilidade sobre a decisao testada podem ser reduzidos a doubles acessiveis; o teste continua exercitando a orquestracao real da pagina.

Uma factory central cria cenarios validos por padrao e permite sobrescrever somente o estado relevante de cada teste. Isso evita fixtures incompletas e torna falhas legiveis.

## Comportamentos E Assercoes

1. Enquanto qualquer fonte obrigatoria estiver carregando, somente o loading deve aparecer; nenhum estado vazio pode piscar.
2. Uma falha obrigatoria deve produzir mensagem visivel e acao de nova tentativa, sem parecer que o ciclo esta vazio.
3. Sem materias cadastradas, a pagina deve explicar a ausencia e navegar para `/meus-editais` pelo CTA.
4. Com topicos novos, a fila deve exibir materia e topico acionaveis e nao oferecer novo ciclo prematuramente.
5. Sem topicos novos, mas com revisoes pendentes, a acao dominante deve levar a `/revisoes`; `Novo Ciclo` nao deve aparecer.
6. Quando todos os estudos e revisoes estiverem realmente concluidos, a interface deve oferecer `Ver desempenho`; `Novo Ciclo` continua ausente.

## Estrategia TDD

Cada comportamento nasce como teste vermelho. Se a pagina ja satisfizer o contrato, o teste deve ser ajustado para provar uma lacuna real de integracao, nunca alterando producao apenas para fabricar uma falha. Mudancas de producao serao feitas somente quando um teste revelar comportamento incorreto ou uma fronteira impossivel de controlar.

## Verificacao

- teste focado da nova suite com Vitest;
- `npm run typecheck`;
- `npm run lint`;
- `npm run test:run`;
- `npm run build` com as variaveis de CI;
- atualizacao do plano vivo somente depois de toda a suite passar.

## Criterio De Conclusao

O item do plano pode ser marcado como concluido quando os seis estados estiverem protegidos por testes legiveis, o Quality Gate local estiver verde e nenhum mock depender de detalhes internos irrelevantes da pagina.
