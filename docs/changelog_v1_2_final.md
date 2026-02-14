# Changelog — Versão 1.2.0 (SLA & Analytics)

Resumo das alterações e melhorias introduzidas nesta release.

## [1.2.0] — 2026-02-13

### 🚀 Novas Funcionalidades
- **SLA Tracking:** Implementação de motor de prazos para Feedbacks (Resposta em 24h, Problemas em 48h).
- **Dashboard de Analytics:** Nova visualização administrativa em `/admin/feedback` com KPIs de saúde de serviço.
- **Badges Dinâmicas:** Indicadores visuais de "No Prazo", "Em Dia", "Atrasado" e "Excedido" na listagem de feedbacks.
- **Gráficos de Tendência:** Visualização temporal de volume de entradas e resoluções (7, 30 e 90 dias).

### 🛠️ Melhorias Técnicas (Hardening)
- **Consolidação de API:** Redução do overhead de rede no Dashboard através de fetch unificado.
- **Cache de Analytics:** Cache em memória para filtros frequentes (TTL 5min).
- **Timezone Resilience:** Normalização de datas para garantir consistência entre cliente (local) e banco (UTC).
- **Skeleton Loaders:** Melhoria de UX com carregamento visual progressivo no dashboard.

### 🛡️ Qualidade e Segurança
- **Testes Unitários:** Suite completa de testes para `feedbackAnalyticsService` cobrindo cenários de borda e cálculos críticos.
- **Acessibilidade:** Implementação de labels e descritores em PT-BR para conformidade com leitores de tela.
- **Sanitização de Dados:** Garantia de que cálculos de tempo não produzam valores negativos ou `NaN`.

---
**Próxima Versão Planejada (Backlog V1.3):**
- Exportação de dados de SLA para CSV/Excel.
- Filtros avançados por Ator (Admin responsável).
- Alertas de e-mail automatizados para SLA próximos do vencimento.
