# Checklist de release e deploy

Este projeto publica o frontend na Vercel e executa backend sensivel no Supabase. O deploy so esta pronto quando os dois lados foram validados.

## Gate obrigatorio

- `npm audit --audit-level=low`
- `npm run test:run`
- `npm run lint`
- `VITE_SUPABASE_URL=https://example.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=ci-publishable-key npm run build`

O workflow `.github/workflows/quality-gate.yml` roda esse gate em `pull_request` e em `push` para `main`. As variaveis Vite usadas no CI sao placeholders de build; segredos reais nao entram no GitHub Actions para esse gate.

## Variaveis do frontend na Vercel

Configure no projeto da Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Nao coloque chaves de IA, Asaas, Resend ou service role em variaveis `VITE_`. Tudo que e segredo pertence ao Supabase Edge Functions ou a outro ambiente server-side.

## Secrets do Supabase

Secrets esperados pelas Edge Functions atuais:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `GOOGLE_SEARCH_ENGINE_ID`
- `OPENAI_API_KEY`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN`
- `RESEND_API_KEY`
- `SEND_EMAIL_HOOK_SECRET`
- `INCIDENCE_WORKER_SECRET`
- `INCIDENCE_DAILY_GOOGLE_LIMIT`

## Edge Functions

Quando alterar `supabase/functions/`, faca deploy explicito da funcao afetada:

```bash
supabase functions deploy ai-handler
supabase functions deploy asaas-admin
supabase functions deploy asaas-checkout
supabase functions deploy asaas-webhook
supabase functions deploy extract-edital
supabase functions deploy generate-questions
supabase functions deploy process-topic-incidence
supabase functions deploy send-auth-email
```

## Migrations e RLS

Quando alterar `supabase/migrations/`, aplique a migration no projeto vinculado e valide o estado remoto antes de considerar o release pronto:

```bash
supabase migration list --linked
supabase db push
supabase migration list --linked
```

Qualquer tabela nova ou ajuste de acesso precisa de RLS revisada no mesmo recorte. UI escondida nao e controle de permissao.

## Verificacao de producao

Depois do merge/deploy:

- confirme que o deployment da Vercel terminou sem erro;
- valide login, carregamento de editais, ciclo de estudos e chamada de IA principal;
- confirme que Edge Functions alteradas respondem no ambiente remoto;
- confira se nao ha segredo novo exposto no bundle com busca por nomes de variaveis sensiveis.
