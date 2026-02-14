# Inventário de Baseline Técnica — Release v1.2

Este documento descreve os componentes técnicos, serviços e interfaces que compõem a baseline consolidada da versão 1.2.

## 1. Serviços e Lógica de Negócio
| Componente | Responsabilidade | Arquivo |
| :--- | :--- | :--- |
| **SLA Analytics Service** | Agregação de métricas, cálculos de tendência e distribuição. Possui cache integrado. | `src/services/feedbackAnalyticsService.ts` |
| **SLA Calculation Utility** | Regras de negócio para prazos (24h/48h/7d) e cálculo de estouro. | `src/utils/feedbackSLA.ts` |
| **Supabase Client** | Interface de dados com tabelas `user_feedback_events`. | `src/integrations/supabase/client.ts` |
| **Unit Tests** | Suite de testes unitários para a lógica de analytics e SLA. | `src/services/__tests__/feedbackAnalyticsService.test.ts` |

## 2. Interfaces e Componentes (Frontend)
### Admin Side (`/admin/feedback`)
- **Dashboard Principal:** `src/components/admin/sla/SLAAnalyticsDashboard.tsx`
- **KPI Cards:** `src/components/admin/sla/SLAKPICards.tsx`
- **Gráfico de Tendência:** `src/components/admin/sla/SLATrendChart.tsx`
- **Distribuição Status/Tipo:** `src/components/admin/sla/SLADistributionCharts.tsx`
- **Saúde do SLA:** `src/components/admin/sla/SLAHealthIndicator.tsx`

### Student Side (Student Hub)
- **Central do Aluno:** `src/components/student/StudentHub.tsx` (exibe badges de SLA e progresso).
- **Lista de Pedidos:** `src/components/student/MyRequestsList.tsx` (integrado com status em tempo real).

## 3. Flags e Comportamento Default
- **SLA Visibility (Admin):** Persistido via estado local, com toggle "Mostrar/Ocultar Analytics".
- **Default Period:** 30 dias (analytics).
- **Timezone:** UTC (Database) -> Local (UI).
- **Feature Student Hub:** Ativa por padrão na v1.2.

## 4. Banco de Dados (Schema v1.2)
- **Tabela:** `user_feedback_events`
- **Campos SLA:**
    - `sla_due_date`: Data limite para resolução.
    - `first_response_at`: Timestamp da primeira interação administrativa.
    - `sla_breached_first_response`: Boolean indicando estouro de resposta.
    - `sla_breached_resolution`: Boolean indicando estouro de resolução final.

---
**Baseline Travada em:** 2026-02-13
**Versão:** 1.2.0-FINAL
