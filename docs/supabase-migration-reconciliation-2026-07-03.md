# Reconciliacao de migrations Supabase - 2026-07-03

## Resultado

- Projeto vinculado acessivel pelo Supabase CLI `2.100.0`.
- `supabase migration list --linked` confirmou todas as versoes locais e remotas alinhadas ate `20260627162043`.
- Nenhuma versao remota ficou sem arquivo local.
- Nenhuma migration local anterior ficou pendente no remoto.
- Nao foi necessario executar `migration repair`.

## Nova migration

- `20260704001118_atomic_delete_subject.sql` cria `public.atomic_delete_subject`.
- A funcao usa `security invoker`, valida `auth.uid()`, restringe ownership e concede execucao somente a `authenticated`.
- O frontend passa a executar uma unica RPC, sem fallback de escritas parciais.

## Prova antes do deploy

A migration e os cenarios funcionais foram executados no banco vinculado dentro de uma unica transacao encerrada com `rollback`:

- remover o vinculo de apenas um edital preserva a materia compartilhada;
- usuario diferente recebe erro `42501`;
- exclusao total remove a materia e referencias em editais/ciclo;
- nenhuma fixture ou alteracao do teste foi persistida.
