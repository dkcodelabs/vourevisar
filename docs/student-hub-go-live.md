# Student Hub — Go-Live Operational Guide

Este documento contém as instruções para o lançamento da funcionalidade **Central do Aluno** (Notificações + Feedback).

## 1. Escopo da Release
- **Nova Central de Notificações:** Drawer lateral com histórico e filtros.
- **Sistema de Feedback:** Formulário com categorização e integração com admin.
- **Observabilidade:** Logs de abertura e envio de feedback.

## 2. Controle de Funcionalidade (Feature Flag)

A funcionalidade é controlada pela flag `STUDENT_HUB` no arquivo `src/lib/features.ts`.

### Status Padrão
- **Development:** `true` (Ativado)
- **Production:** `false` (Desativado por padrão até segundo comando)

### Como Ativar em Produção (Rollout Gradual)
Para testar em produção sem deploy de código, use o console do navegador:

1. **Ativar:**
   ```javascript
   window.FEATURES.enable('STUDENT_HUB')
   ```
   *A página será recarregada automaticamente com a funcionalidade ativa.*

2. **Desativar (Rollback Imediato):**
   ```javascript
   window.FEATURES.disable('STUDENT_HUB')
   ```

3. **Resetar para Padrão:**
   ```javascript
   window.FEATURES.reset('STUDENT_HUB')
   ```

## 3. Monitoramento

Acompanhe os seguintes eventos para validar o sucesso do lançamento:

### Eventos de Sucesso (Analytics Console / Logs)
- `student_hub_opened`: Usuário abriu a central.
- `feedback_submitted`: Feedback enviado com sucesso.

### Erros (ErrorService / Admin)
- Verifique a rota `/admin/system/errors` filtrando por module `student_hub`.
- Alertas críticos: Falhas de inserção no banco de dados (`feedback_submit_failed`).

## 4. Procedimento de Rollback

Em caso de bugs críticos ou instabilidade severa:

1. **Desative a flag imediatamente** usando o comando de console acima (para testes locais) ou faça um Hotfix alterando `src/lib/features.ts` para retornar `false` hardcoded.
2. **Verifique:** O sino deve desaparecer do topo e a funcionalidade se tornar inacessível.
3. **Comunique:** Informe o time sobre a suspensão da feature.

## 5. Smoke Test Checklist

- [ ] Sino visível no header? (Se flag=true)
- [ ] Central abre ao clicar?
- [ ] Abas "Notificações" e "Meus Feedbacks" trocam conteúdo?
- [ ] Formulário de feedback abre e envia?
- [ ] Feedback aparece na lista imediatamente?
