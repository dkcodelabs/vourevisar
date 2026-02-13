# Go-Live v1.1 Part 1 — Plano de Rollback Operacional

**Versão:** 1.1.0-RC1
**Data:** 2026-02-13

## 1. Gatilhos de Acionamento (Triggers)
Rollback será executado imediatamente se:
- **Erro 500 Persistente:** Central do Aluno ou Admin Feedback com taxa de erro > 1% em 5 minutos.
- **Perda de Dados:** Feedback criado não é persistido no banco.
- **Falha de Segurança:** Acesso indevido (Aluno vê feedback de outro aluno).
- **Quebra de Fluxo Crítico:** Admin não consegue mudar status ou responder.

## 2. Procedimento de Rollback
### 2.1 Desativação Rápida (Kill Switch)
- **Ação:** Desabilitar Feature Flag `FEATURE_STUDENT_HUB`.
- **Comando:** (Se implementado no backend) Setar flag para `false`.
- **Via Console:** `window.FEATURES.disable()` (somente para sessão local/debug).
- **Resultado:** O sino de notificação desaparece para os alunos. O acesso direto `/admin/feedback` pode continuar ativo para diagnóstico, mas o fluxo do aluno é interrompido.

### 2.2 Reversão de Código (Revert)
- **Ação:** Reverter PR/Commit de Deploy.
- **Comando:** `git revert <commit-hash-v1.1>` e deploy da versão anterior (v1.0.X).
- **Tempo Estimado:** 5-10 minutos (dependendo do CI/CD).

### 2.3 Restauração de Dados (Se Houver Corrupção)
- **Ação:** Restaurar backup do banco de dados `admin_feedback_events` (tabelas novas).
- **Nota:** Como v1.1 adiciona tabelas novas sem alterar schemas legados críticos, a reversão de código geralmente é suficiente.

## 3. Verificação Pós-Rollback
- [ ] **Acesso:** Confirmar que a Central do Aluno (Sino) sumiu.
- [ ] **Estabilidade:** Confirmar que o sistema voltou a operar sem erros 500.
- [ ] **Comunicação:** Avisar usuários sobre manutenção/indisponibilidade temporária se necessário.

---
**Status:** [PLANO APROVADO]
