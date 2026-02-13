# Changelog: Central do Aluno v1.0

> VERSÃO: v1.0.0
> DATA: 2026-02-13
> STATUS: **RELEASED** (Ativação Global: 15:00) 🚀

## 🚀 Added (Novidades)
- **Central Unificada:** Novo painel deslizante (Drawer) combinando Notificações e Feedbacks.
- **Feedback System:** Fluxo completo para envio de sugestões, problemas e melhorias.
- **Admin Management:** Interface `/admin/feedback` para gestão e resposta de tickets.
- **Status Tracking:** Aluno acompanha evolução (Nova -> Planejada -> Concluída).
- **Security:** RLS (Row Level Security) garantindo isolamento total de dados por usuário.
- **Observabilidade:** Logs estruturados de eventos de negócio (`analytics.ts`) e erros (`errorService`).

## 🛠 Changed (Alterações)
- **UI/UX Mobile:** Refatoração completa para "Mobile First" no painel e modais.
- **Notificações:** Ícone de sino agora abre a Central unificada.
- **Performance:** Otimização de queries via Supabase e carregamento sob demanda.

## 🔒 Security (Segurança)
- **Feature Flag:** Controle de ativação/rollback via `src/lib/features.ts`.
- **Sanitização:** Remoção automática de tokens/senhas em logs de erro.
- **Rate Limit:** Bloqueio client-side de envios repetitivos (10s).

## 🐛 Fixed (Correções)
- Correção de z-index no Drawer em telas pequenas.
- Ajuste de acessibilidade (ARIA labels) no botão de fechar.
- Validação de formulário impedindo envio vazio.
