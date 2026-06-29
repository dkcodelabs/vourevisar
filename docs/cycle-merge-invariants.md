# Invariantes de Ciclo, Editais e Mesclagem

Este arquivo deve ser consultado antes de qualquer mudanca em ciclo de estudos, carga/remocao/substituicao de edital, `subject_merges`, `topic_merges`, revisoes ou historico.

## Fonte de verdade

- `user_editais.subject_ids`: materias originais do edital. Nao muda por causa do ciclo.
- `user_editais.merged_into_cycle`: diz se o edital participa do ciclo ativo.
- `user_editais.active_subject_ids`: materias que esse edital realmente coloca no ciclo agora. Depois de mesclagem, pode apontar para a materia primaria/unificada; depois de desmontar merge, deve voltar ao escopo correto do proprio edital sobrevivente.
- `user_cycles.ciclo_atual`: fila ativa do ciclo, na ordem escolhida pelo aluno. Deve conter somente materias permitidas por editais com `merged_into_cycle = true`.
- `subject_merges` e `topic_merges`: equivalencias ativas entre editais. Se uma equivalencia colapsar para menos de dois editais, o merge deve ser desmontado sem apagar historico.
- `topics` e `topic_review_history`: progresso e historico de estudo. Nunca devem ser apagados para "limpar" ciclo.

## Regras que nao podem quebrar

- Remover um edital do ciclo nunca pode deixar materia desse edital em `user_cycles.ciclo_atual`, exceto se ela tambem estiver representada por um edital sobrevivente via merge ativo.
- Quando um merge colapsa para um unico edital sobrevivente, `active_subject_ids` dos editais restantes devem ser reconstruidos antes de persistir `user_cycles.ciclo_atual`.
- `user_cycles.ciclo_atual` deve ser podado contra a uniao de `active_subject_ids` dos editais ativos. Se um ID nao estiver nessa uniao, e materia fantasma.
- Se o topico/materia removido tinha progresso/revisao e existe equivalente sobrevivente, o estado mais forte deve ser promovido para o sobrevivente.
- A pagina Revisoes deve filtrar o escopo pelo ciclo ativo, mas preservar equivalentes via `topic_merges` enquanto o merge estiver ativo.
- Recarregar um edital removido deve recuperar o estado dele sem duplicar progresso e sem misturar materias arquivadas no ciclo atual.
- Cache local nunca pode ser tratado como fonte de verdade. Depois de RPC critica, disparar eventos e limpar cache relacionado.
- IA nunca e fonte final para mesclagem automatica de topicos. Topicos so mesclam automaticamente quando o nome e igual apos normalizacao conservadora, com tolerancia apenas para acento, caixa, pontuacao e plural/singular simples. Qualquer equivalencia semantica deve ficar individual ate existir fluxo manual seguro de mesclar/desfazer.

## Checklist antes de alterar

1. Ler `src/services/cycleMergeService.ts`, `src/services/mergeService.ts`, `src/services/cycleUnloadService.ts` e a RPC/migration envolvida.
2. Confirmar qual tabela e fonte de verdade para a operacao.
3. Escrever teste antes da mudanca para pelo menos um destes cenarios:
   - remover edital primario;
   - remover edital secundario;
   - remover ultimo edital;
   - recarregar edital removido;
   - revisar topico equivalente antes/depois da remocao;
   - estado legado com `active_subject_ids` incorreto.
4. Se tocar RPC, rodar `supabase db push --dry-run`, aplicar migration e verificar estado remoto com consulta SQL.
5. Confirmar que `user_editais.active_subject_ids` e `user_cycles.ciclo_atual` ficaram coerentes no mesmo usuario de teste.
6. Rodar testes focados, `npm run lint`, `npm run build` e `supabase db push --dry-run`.

## Sinais de erro

- A UI mostra materia de edital removido.
- `active_subject_ids` de um edital aponta para `subject_ids` de outro edital sem `subject_merges` ativo justificando.
- `ciclo_atual` contem ID que nao aparece em nenhum `active_subject_ids` de edital ativo.
- Revisoes aparecem sem contexto suficiente para saber de qual edital/materia vieram.
- Recarregar edital corrige o ciclo temporariamente. Isso indica backfill/reconstrucao de escopo faltando no fluxo de remocao.
- IA mescla topico grande com topico pequeno, ou qualquer topico diferente, so porque compartilham uma palavra/ideia. Isso indica falta de validador deterministico antes de persistir `topic_merges`.
