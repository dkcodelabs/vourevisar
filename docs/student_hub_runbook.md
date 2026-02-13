# Runbook de Operação Contínua — Central do Aluno (v1.0)

> **MANTENEDOR:** Equipe de Produto & Engenharia
> **CRITICALIDADE:** Média (Funcionalidade não-bloqueante para login/pagamento)

## 1. Monitoramento Diário (Checklist N1)
- [ ] Verificar `/admin/system/errors`: Picos de erros com origem `student_hub`.
- [ ] Verificar `/admin/feedback`: Novos itens chegando (indica saúde do fluxo).

## 2. Alertas e Limiares
| Sinal | Limiar | Ação Recomendada |
|-------|--------|------------------|
| Erros Críticos JS | > 10/hora | Acionar Engenharia (P1) |
| Falha no Envio Feedback | > 5% falha | Monitorar DB/Supabase |
| Latência Submit | > 3s | Investigar Performance |

## 3. Diagnóstico Rápido
**Sintoma:** "Aluno clica no sino e nada acontece."
1. Pedir print do console (F12).
2. Verificar se flag está ativa: `window.features.STUDENT_HUB`.
3. Se `false`, verificar se houve deploy reverso não autorizado.

**Sintoma:** "Erro ao enviar feedback."
1. Verificar status do Supabase (Health Check).
2. Verificar logs de RLS em `/admin/system/errors`.

## 4. Procedimento de Rollback Seguro
Em caso de Incidente Crítico (ex: falha em cascata bloqueando app):

1. **Acesso Admin:** Logar como Super Admin.
2. **Console Browser:** Executar emergência (se ferramenta de flag remota não disponível).
   ```javascript
   // Hotfix temporário no cliente afetado
   window.FEATURES.disable('STUDENT_HUB');
   ```
3. **Engenharia:** Reverter PR `release/v1.0` e deploy imediato.

## 5. Responsáveis
- **Produto (PO):** Triagem de feedbacks (semanal).
- **Suporte (N1):** Diagnóstico inicial e FAQ.
- **Engenharia (N2):** Correção de bugs e performance.
