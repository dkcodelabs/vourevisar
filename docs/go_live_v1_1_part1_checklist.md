# Go-Live v1.1 Part 1 — Checklist Operacional (Pré-Deploy)

**Versão:** 1.1.0-RC1
**Data:** 2026-02-13
**Responsável:** Tech Lead

## 1. Configuração e Ambiente
- [ ] **Variáveis de Ambiente:** Confirmar `VITE_APP_VERSION` = "v1.1.0"
- [ ] **Feature Flags:** Confirmar `FEATURE_STUDENT_HUB` = `true` em Staging/Prod (Rollout gradual planejado?) -> Estratégia de v1.1 é Go-Live total, então assume-se `true` ou controle via `window.FEATURES`.
- [ ] **Integrações:**
    - [ ] Supabase Auth (OK)
    - [ ] Supabase DB (RLS Policies v1.1 OK)
    - [ ] Analytics Service (Ativo)

## 2. Estado Inicial Seguro
- [ ] **Banco de Dados:** Backup "ponto de retorno" criado pré-deploy.
- [ ] **Kill Switch:** Documentado como desativar Student Hub via Console (`window.FEATURES.disable()`) ou Revert de PR.
- [ ] **Usuários de Teste:** Contas `admin@test.com` e `aluno@test.com` funcionais e limpas de dados "sujos" de dev.

## 3. Observabilidade e Auditoria
- [ ] **Logs de Auditoria:** Tabela `audit_logs` recebendo eventos de `admin_feedback_updated`.
- [ ] **Telemetria Client-Side:** Eventos `feedback_submitted` e `admin_feedback_updated` sendo capturados no console/service.
- [ ] **Tratamento de Erros:** `toastGate` ativo para não vazar erros técnicos 500 para o usuário.

## 4. Plano de Rollback
- [ ] Plano de Rollback criado e revisado (`docs/go_live_v1_1_part1_rollback.md`).
- [ ] Gatilhos de Rollback definidos (ex: Erro Crítico > 1%, Falha em Login, Perda de Dados).

## 5. Aprovação Final
- [ ] **Smoke Test em Staging:** CONCLUÍDO (Conforme relatório v1.3).
- [ ] **Release Candidate:** APROVADO (GO).

---
**Status:** [AGUARDANDO VALIDAÇÃO DO OPERADOR]
