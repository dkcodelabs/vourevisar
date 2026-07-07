# AGENTS.md

Este arquivo é a fonte principal de instruções para agentes neste projeto. Se outra ferramenta também tiver um arquivo próprio, ele deve apontar para este arquivo em vez de duplicar regras.

## Postura obrigatória

- Seja parceiro técnico crítico, não executor passivo. Questione abordagem ruim antes de implementar.
- Aponte dívida técnica, acoplamento, risco de regressão, problema de escala ou manutenção mesmo quando isso não for pedido.
- Se o pedido estiver resolvendo o problema errado, pare e diga claramente.
- Não valide decisão ruim por conveniência. Contrarie quando a solução melhor for diferente do pedido inicial.
- Se não tiver certeza sobre algo técnico ou atual, diga que não tem certeza e verifique antes de afirmar.
- Antes de editar, leia o contexto real do código. Não presuma arquitetura a partir de nomes de arquivos.

## Comunicação e formato de resposta

- Seja direto e operacional. Para pedidos simples de orientação, responda em passos curtos, sem cabeçalhos fixos.
- Use seções como `Problema`, `Solução`, `Código` e `Débito técnico` apenas quando elas realmente ajudarem: decisões de arquitetura, revisão de risco, implementação relevante, segurança, banco, deploy ou entrega com validação.
- Não repita um template rígido em toda resposta. O formato deve servir ao trabalho, não atrapalhar o usuário.
- Quando o usuário estiver executando uma configuração em painel externo, diga exatamente onde clicar e o que não clicar.
- Para perguntas como "onde?", "e agora?", "o que fazer?", priorize o próximo passo concreto antes de qualquer explicação.
- Mantenha o tom crítico, mas sem teatralizar. Aponte risco real com clareza e siga para a correção.

## Contexto do produto

- Produto: vouRevisar, uma plataforma de revisão inteligente para concursos públicos.
- Fluxos centrais: editais, matérias, tópicos, ciclo de estudos, revisões espaçadas, cadernos, estatísticas, mentor/insights, IA, assinaturas e administração.
- O usuário principal é estudante de concurso. Priorize clareza, velocidade de fluxo, confiabilidade dos dados e baixa fricção.
- Não transforme telas funcionais em landing pages decorativas. Interface bonita que atrapalha estudo é regressão de produto.

## Planejamento vivo obrigatório

- Antes de implementar ou sugerir próximo passo em uma área já planejada, consulte o plano vivo correspondente. Para a página de ciclo e inteligência estratégica, use `docs/study-cycle-strategic-page-plan.md`.
- Tudo que ficar pendente deve ser registrado no plano como item `[ ]`, mesmo que seja melhoria, correção, validação, dúvida de produto, dívida técnica ou etapa futura.
- Quando algo for implementado e verificado, marque o item correspondente como `[x]`. Se for parcialmente feito, mantenha `[ ]` e descreva claramente o que ainda falta.
- Se surgir uma pendência fora do escopo do plano atual, crie uma seção de backlog no plano existente ou proponha um novo plano em `docs/`, mas não deixe a pendência apenas na conversa.
- Ao receber um novo pedido do usuário, confira o plano antes de assumir que a tarefa faz sentido agora. Se o pedido conflitar com o plano ou resolver o problema errado, explique o conflito e proponha o recorte correto.
- O plano não substitui leitura do código real. Ele orienta prioridade e memória do projeto; a implementação ainda deve ser validada no código, banco e UI.

## Stack e comandos

- Frontend: Vite, React 18, TypeScript, React Router DOM, TanStack Query.
- UI: Tailwind CSS, shadcn/ui, Radix UI, Lucide React e Phosphor Icons.
- Backend/dados: Supabase, PostgreSQL, RLS, Edge Functions.
- Testes: Vitest e Testing Library.
- Deploy: Vercel.
- Comandos principais:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run test:run`
- Servidor local: Vite usa `http://localhost:8081/` por padrão neste repo.
- Ao alterar uma Edge Function em `supabase/functions/`, informe explicitamente o comando de deploy necessário. Exemplo para extração de edital: `supabase functions deploy extract-edital`.

## Arquitetura e organização

- Use o alias `@/` para imports de `src`.
- Mantenha lógica de negócio em `services`, `hooks`, `contexts` ou `utils`; componentes e páginas devem orquestrar UI, não concentrar regra crítica.
- Prefira buscar e alterar dados do Supabase via hooks/services existentes. O código atual ainda tem acessos diretos em páginas/componentes; não use isso como justificativa para espalhar mais acesso direto.
- Antes de criar hook, service ou tipo novo, procure equivalente existente e siga o padrão local.
- Evite abstração prematura. Crie abstração apenas quando reduzir duplicação real ou isolar regra de domínio importante.
- Não misture refatoração grande com feature pequena. Se encontrar problema estrutural, sinalize e proponha recorte.

## Anti-monólito de páginas

- Não implemente fluxo grande concentrando tudo em uma página. Página deve orquestrar dados, estado de rota e composição; não deve virar depósito de UI, regra de negócio, cálculo, handlers, modais e chamadas Supabase ao mesmo tempo.
- Ao iniciar uma tela nova ou uma expansão relevante, defina os limites antes de codar:
  - `page`: rota, composição e estado mínimo de tela.
  - `components`: blocos visuais reutilizáveis ou isoláveis.
  - `hooks`: derivação de estado, queries, mutations e coordenação de dados.
  - `services`: regra de domínio, persistência, Supabase, RPCs e efeitos externos.
  - `utils`: funções puras, cálculo e formatação sem estado React.
- Se uma página passar de aproximadamente 700 linhas ou começar a ter múltiplos blocos independentes, pare e extraia antes de adicionar nova feature. Não espere "terminar a tela" para organizar; isso vira dívida cara.
- Não coloque `useMemo` grande, cálculo de métricas, regra de status, montagem de alertas ou sugestão estratégica dentro do JSX da página. Extraia para hook ou util tipado assim que o cálculo tiver nome de domínio.
- Não deixe handlers críticos espalhados no meio do render. Ações como iniciar revisão, marcar ciclo, reordenar fila, aplicar sugestão, resetar ciclo e persistir dados devem ficar em hook/service quando crescerem além de callbacks simples.
- Componentes de apresentação não devem buscar Supabase nem conhecer detalhes de RLS, usuário, tabela ou Edge Function. Eles recebem dados e callbacks.
- Hooks não devem esconder efeito destrutivo ou financeiro atrás de nome genérico. Use nomes explícitos, trate loading/erro e mantenha fallback visível para o usuário.
- Quando uma tela tiver dois modos de visualização, como fila e edital verticalizado, trate cada modo como componente próprio desde o começo. Compartilhe cálculo via hook, não duplicando JSX ou regras na página.
- Regra prática para revisar PR: se o diff adiciona muita lógica nova diretamente em `src/pages/*.tsx`, questione. O padrão esperado é página fina + hooks/services/componentes pequenos.

## Supabase, banco e dados

- Use sempre o cliente de `src/integrations/supabase/client.ts` no frontend.
- Antes de assumir schema, confira `src/integrations/supabase/types.ts`, `supabase/migrations/` e SQLs relevantes.
- Respeite RLS, roles, ownership por usuário e dados sensíveis.
- Sanitizar entradas antes de persistir. Datas vazias como `exam_date` devem virar `null`.
- Em operações `.in()`, valide que os IDs são arrays e que estão no tipo esperado.
- Não altere migrations, RPCs, Edge Functions ou tipos gerados sem verificar impacto no frontend e nos fluxos existentes.
- Nunca exponha secrets no frontend. Variáveis sensíveis pertencem a Edge Functions ou ambiente seguro.

## Áreas críticas

- Merge de editais/ciclos: leia `src/services/mergeService.ts`, `src/services/cycleMergeService.ts` e tipos relacionados antes de mexer.
- Não apagar, recriar ou "limpar" `subject_merges`, `topic_merges`, `pending_cycle_merges`, `user_cycles` ou histórico de revisão sem entender o efeito sobre progresso, unificação e rastreabilidade.
- Revisões e histórico: mudanças em `topic_review_history`, intervalos, dificuldade, status de tópico ou conclusão podem corromper métricas e agenda do aluno.
- GUT/IA: mudanças em `src/services/gutCalculator.ts`, `ai-handler`, extração de edital ou sugestões de merge precisam de fallback claro e tratamento de erro.
- Ao validar estrutura de edital, prompt ou perfil de banca, não crie regra específica para um edital/concurso isolado. A correção deve generalizar a leitura estrutural para outros editais sem quebrar os que já funcionam.
- Antes de ajustar perfil/prompt de extração, descreva a regra estrutural reaproveitável: quais marcadores indicam opção, quais indicam agrupador, onde começa/finaliza conteúdo programático e quando uma divisão de conteúdo é realmente explícita.
- Assinaturas/Asaas/admin/roles: trate como área sensível. Verifique permissão, auditoria e impacto financeiro antes de alterar.
- Área admin não deve depender apenas de ocultar UI. Permissão precisa existir no backend/RPC/RLS quando aplicável.

## UI e experiência

- Siga os componentes e padrões existentes de shadcn/ui, Radix e Tailwind.
- Use componentes reutilizáveis quando já existirem, especialmente em modais, tabelas, formulários e estados vazios.
- Priorize fluxo de estudo: menos ruído visual, hierarquia clara, estados de loading/erro vazios bem tratados.
- Toda alteração, criação ou refatoração de interface deve ser pensada e implementada para desktop, tablet e mobile. Responsividade real é requisito do sistema inteiro, inclusive páginas administrativas.
- Garanta responsividade real em desktop e mobile. Texto não deve sobrepor, cortar de forma feia ou quebrar controles.
- Para mudanças visuais relevantes, rode o app localmente e valide no navegador.

## Testes e verificação

- Para mudanças em lógica de negócio, services, hooks complexos, revisões, merge, assinatura, feedback ou cálculos, adicione ou ajuste testes.
- Comandos recomendados conforme o risco:
  - Mudança pequena de documentação: revisão manual.
  - Mudança em UI: `npm run lint` e validação visual.
  - Mudança em lógica: `npm run test:run`.
  - Mudança ampla ou antes de entrega: `npm run build`.
- Se não conseguir rodar uma verificação, informe claramente o motivo e o risco residual.

## Git e segurança operacional

- Pode haver mudanças locais do usuário. Nunca reverta arquivos que você não alterou sem pedido explícito.
- Mantenha diffs pequenos e focados no pedido.
- Antes de alterações arriscadas ou sensíveis, crie ou proponha um checkpoint local para permitir desfazer com segurança. Isso vale especialmente para Edge Functions, prompts/perfis de IA, migrations/RLS/RPCs, autenticação, merge de editais/ciclos, revisões/histórico, assinaturas e dados financeiros.
- O checkpoint padrão, quando não houver pedido de commit, é um stash local nomeado, por exemplo: `git stash push -m "checkpoint antes de mexer na IA edital"`. Isso não exige `git push`.
- Use commit local como checkpoint apenas quando o usuário pedir ou aprovar. Não envie para o remoto só para criar ponto de restauração.
- Não use comandos destrutivos como reset hard, checkout para descartar alterações ou limpeza agressiva sem autorização clara.
- Antes de commitar, revise o diff e garanta que não incluiu secrets, arquivos temporários ou mudanças fora do escopo.
