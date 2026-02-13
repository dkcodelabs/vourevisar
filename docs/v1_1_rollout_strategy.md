# Estratégia de Rollout (v1.1)

> **MÉTODO:** Blue-Green Deployment (Zero Downtime)
> **FEATURE FLAGS:** Novas flags específicas para controle granular.

## 1. Fases de Entrega

### Fase A: Admin Backend (Invisible)
- **O quê:** Implementação de APIs de filtro e rate limit.
- **Como:** Deploy normal. Feature invisível para usuário final.
- **Validação:** Testes de carga em Staging.

### Fase B: Admin Frontend (Parcial)
- **O quê:** Novos filtros na tela de admin.
- **Quem:** Apenas admins internos (100%).
- **Risco:** Baixo (apenas visualização).

### Fase C: Aluno UX (Rollout Gradual)
- **O quê:** Indicadores visuais de resposta (badges) e Quick Reactions.
- **Flag:** `ENABLE_V1_1_UX`
- **Rollout:** 
  1. 10% (Canary) - Monitorar erros JS.
  2. 50% - Monitorar feedback.
  3. 100% - Go Live Oficial.

## 2. Métricas de Sucesso (KPIs v1.1)
- **Engajamento com Respostas:** Aumento na taxa de leitura de respostas pelos alunos (esperado > 50%).
- **Eficiência Admin:** Redução no tempo médio de triagem (esperado -30%).
- **Spam:** Zero casos de abuso registrados (via Rate Limit).

## 3. Plano de Rollback
- **Nível Código:** Reverter PR se houver erro crítico de build.
- **Nível Feature:** Desativar `ENABLE_V1_1_UX` via console se houver erro de renderização no aluno.
