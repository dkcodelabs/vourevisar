# Estratégia de Rollout — V1.3

Este documento define a sequência de lançamento e os mecanismos de segurança (flags/rollback) para as funcionalidades da V1.3.

## 1. Cronograma de Fases (Recomendado)

| Fase | Título | Dependência | Objetivo de Negócio |
| :--- | :--- | :--- | :--- |
| **A** | **Filtro por Gestor** | Nenhuma | Organizar o time de Admin e definir donos. |
| **B** | **Colaboração Interna** | Fase A | Permitir que o time troque informações nos tickets. |
| **C** | **Alertas Push** | Fase B | Proatividade na redução de breaches de SLA. |
| **D** | **Exportação Analytics** | Nenhuma | Reportar KPIs para Steakholders em formatos externos. |
| **E** | **Modernização Infra** | Todas | Estabilizar a performance e eliminar bugs de cache. |

## 2. Feature Flags Necessárias
Para garantir um deploy seguro, as seguintes flags devem ser implementadas:
- `v1_3_enable_collaboration`: Habilita o painel de comentários internos.
- `v1_3_enable_admin_alerts`: Habilita os toasts de aviso de SLA.
- `v1_3_enable_analytics_export`: Habilita os botões de download CSV/PDF.

## 3. Plano de Validação por Fase
1.  **Fase A:** Verificar se a atribuição manual reflete no dashboard sem erros de RLS.
2.  **Fase B:** Validar via "Modo Estudante" que comentários internos NÃO são visíveis na Central do Aluno.
3.  **Fase C:** Simular um ticket a 30 minutos de estourar o SLA e verificar se o toast surge para o admin.
4.  **Fase D:** Comparar os números do CSV exportado com os números exibidos na tela do Analytics.

## 4. Plano de Rollback
| Gatilho | Ação de Rollback |
| :--- | :--- |
| **Erro de RLS na Atribuição** | Desativar flag `v1_3_enable_collaboration` e reverter para `admin_notes` de valor único. |
| **Sobrecarga de Banco (Polling)** | Aumentar o intervalo de polling ou desativar `v1_3_enable_admin_alerts`. |
| **Quebra de Analytics (TanStack)** | Manter o arquivo `feedbackAnalyticsService.ts` antigo como `feedbackAnalyticsService.legacy.ts` para retorno rápido em caso de bugs de cache complexos. |

---
**Data:** 2026-02-13
**Status da Estratégia:** Aprovada para Planejamento
