# Governança Operacional v1.1

**Versão:** 1.0
**Responsável:** Suporte N1 / Admin
**Data:** 2026-02-13

## 1. Rotina Operacional (Checklist Diário)
- [ ] **Erros (09:00):** Analisar eventos anormais no Sentry/Console.
- [ ] **Feedback (Diário):** Verificar fila de status "Nova" e triar para "Planejada/Em Dev/Não Planejada".
- [ ] **SLA:** Garantir resposta inicial em até 24h.

## 2. Monitoramento de Logs (Audit)
A tabela `audit_logs` registra alterações críticas.
Query de exemplo para auditoria de feedbacks:
```sql
SELECT created_at, action, changes 
FROM audit_logs 
WHERE table_name = 'user_feedback_events' 
ORDER BY created_at DESC 
LIMIT 50;
```
**Campos Importantes:**
- `action`: UPDATE / INSERT
- `record_id`: ID do feedback afetado
- `changes`: JSON com as alterações (ex: status 'nova' -> 'planejada')

## 3. Procedimento de Contingência (Troubleshooting)

### Cenário A: Aluno relata bug ao enviar feedback
1. Verificar logs de rede (Console do Aluno).
2. Verificar se o serviço de backend está UP.
3. Solicitar `error_id` caso apareça na tela.

### Cenário B: Admin não consegue alterar status
1. Verificar permissões do usuário (Role = admin?).
2. Verificar conexão com banco (Supabase Status).
3. Tentar logout/login.

### Cenário C: Necessidade de Desativação (Emergência)
1. Acionar Tech Lead.
2. Executar rollback via Feature Flag `FEATURE_STUDENT_HUB = false`.
3. Comunicar usuários via banner.
