# Release Closure Plan - Central do Aluno v1.0

Checklist estruturado para o encerramento seguro da release.

## A) Matriz de Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Regressão Mobile** | Alto | Validado via `mobile-first` CSS e testes manuais de responsividade em Phase 5.1.3 e 5.1.4. |
| **Permissão (RLS)** | Crítico | Testes de acesso Admin vs Aluno já realizados. AdminFeedback protegido por role. |
| **Falha no Submit** | Médio | `ErrorService` captura falhas e `Analytics` loga tentativas. Toast informa usuário para tentar novamente. |
| **Inconsistência de Status** | Baixo | `StatusConfig` centralizado no frontend reflete estados do banco (Nova, Planejada, etc). |
| **Feature Flag Falhar** | Alto | Implementação defensiva no `AppLayout` impede renderização se flag=false. Fallback seguro. |

## B) Checklist de Fechamento (5 Etapas)

### 1. Gate Funcional (PASS/FAIL)
- [ ] Todas as features críticas funcionam em DEV?
- [ ] Fluxo feliz (Happy Path) completo testado?
- [ ] Fluxo de exceção (erros, vazios) testado?

### 2. Gate de Segurança
- [ ] RLS impede aluno de ver feedback de outros?
- [ ] Aluno não consegue alterar status de feedback?
- [ ] Admin consegue ver tudo?

### 3. Smoke Test em Staging/Prod
- [ ] Habilitar flag `window.FEATURES.enable('STUDENT_HUB')`
- [ ] Verificar integridade visual
- [ ] Verificar se "Minhas Solicitações" carrega dados reais

### 4. Deploy Progressivo
- [ ] Deploy do código (Flag `false` por padrão)
- [ ] Validação passiva (nenhum erro novo no Sentry/Logs)
- [ ] Ativação controlada (Flag `true`) para grupo piloto ou geral

### 5. Janela de Observação (48h)
- [ ] Monitorar eventos `student_hub_opened`
- [ ] Monitorar novos erros em `module: student_hub`
- [ ] Ata final de encerramento
