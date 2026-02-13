# Go-Live v1.1 Part 1 — Runbook de Execução (Janela Tática)

**Versão:** 1.1.0-RC1
**Data Estimada:** 2026-02-13
**Tempo Estimado:** 30 minutos

## 1. Pré-Deploy (Backup e Preparações)
- [ ] **1.1 Backup Lógico:** Salvar dump de `admin_feedback_events`. (Opcional, pois são tabelas novas com soft delete).
- [ ] **1.2 Configuração:** Verifique variáveis de ambiente.
- [ ] **1.3 Notificação:** Avisar equipe interna sobre o deploy.

## 2. Deploy (Janela Tática)
- [ ] **2.1 Push:** Enviar código para branch `main` ou `production`.
- [ ] **2.2 Build:** Aguardar CI/CD de deploy automático (`npm run build`).
- [ ] **2.3 Migrations:** Se houver migrations pendentes (v1.1 não tem DDL crítico), aplicar.

## 3. Validação de Fumaça (Smoke Test)
- [ ] **3.1 Acesso:** Logar como Administrador. O painel deve abrir sem erro 500.
- [ ] **3.2 Navegação:** Ir para `/admin/feedback`. A lista deve carregar (vazia ou com dados).
- [ ] **3.3 Feature Flag:** Verificar se o ícone do sino aparece para alunos.

## 4. Validação de Fluxo Crítico (E2E Manual)
- [ ] **4.1 Criar Feedback (Aluno):**
    - Logar como aluno.
    - Clicar no sino -> Aba "Meus Feedbacks".
    - Clicar em "+ Enviar Feedback".
    - Preencher Título: "Teste Prod v1.1", Descrição: "Teste de Go-Live".
    - Enviar.
    - Confirmar toast de sucesso e novo item na lista com status "Nova".
- [ ] **4.2 Triagem (Admin):**
    - Logar como admin.
    - Atualizar lista de feedbacks.
    - Encontrar feedback "Teste Prod v1.1".
    - Alterar status para "Planejada".
    - Responder: "Confirmado em produção".
    - Salvar.
    - Confirmar toast de sucesso.
- [ ] **4.3 Confirmação (Aluno):**
    - Logar como aluno.
    - Verificar atualização de status para "Planejada".
    - Expandir e ver resposta "Confirmado em produção".

## 5. Decisão Pós-Deploy e Limpeza
- [ ] **5.1 PASS/FAIL:**
    - [PASS]: Todos os passos acima concluídos sem erro bloqueante.
    - [FAIL]: Erro crítico 500, impossibilidade de criar feedback ou salvar status. -> **EXECUTAR ROLLBACK**.
- [ ] **5.2 Limpeza:** Remover/Arquivar feedback de teste se necessário (ou marcar como "Não Planejada" com motivo "Teste Operacional").

---
**Status:** [AGUARDANDO VALIDAÇÃO DO OPERADOR]
