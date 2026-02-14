# Checklist de Operação Semanal (v1.2.1-LEAN)

Este checklist deve ser executado semanalmente pelo responsável operacional para garantir a saúde e a triagem do sistema.

## 📥 Gerenciamento de Pedidos
- [ ] **Novas Solicitações:** Verificar se existem pedidos com status "Nova" sem triagem há mais de 24h.
- [ ] **Pedidos em Aberto:** Verificar pedidos "Em desenvolvimento" sem atualização ou resposta admin há mais de 7 dias.
- [ ] **Protocolos:** Amostragem manual de 3 protocolos para garantir que o aluno visualiza a resposta corretamente.

## 🛠️ Saúde Técnica
- [ ] **Falhas de Envio:** Consultar `admin_error_events` filtrando por módulo `feedback` para identificar erros de submit.
- [ ] **Erros Críticos:** Verificar logs de sistema para exceções não tratadas nas últimas 24h.
- [ ] **Integridade RLS:** Confirmar se as políticas de segurança permanecem ativas (sem bypass acidental).

## 💾 Infraestrutura
- [ ] **Backup/Restore:** Confirmar sucesso da última rotina de backup do banco de dados (Supabase).
- [ ] **Analytics:** Verificar se os eventos `student_hub_opened` e `feedback_submitted` estão sendo computados.

---
**Observações:**
(Espaço para notas sobre incidentes ou melhorias identificadas na semana)
