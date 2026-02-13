# Estratégia de Feature Flags Pós-Release (v1.0)

> **DATA:** 13/02/2026
> **STATUS:** BASELINE LIMPO

## 1. Inventário de Flags

| Flag | Status | Tipo | Decisão |
|------|--------|------|---------|
| `STUDENT_HUB` | **ATIVO** (`true`) | Kill Switch | **MANTER** |

## 2. Racional
A flag `STUDENT_HUB` não será removida imediatamente após o Go-Live. Ela foi reclassificada de "Release Toggle" para "Operational Kill Switch".
**Motivo:** Permite desativar a Central do Aluno instantaneamente em caso de descoberta tardia de bugs críticos ou sobrecarga de banco de dados, sem necessidade de novo deploy (via console/hotfix).

## 3. Plano de Limpeza Futura
- **Revisão:** Sprint v1.2 (estimada em +30 dias).
- **Critério:** Se nenhum incidente ocorrer em 30 dias, a flag poderá ser removida do código para limpeza (hardcode `true`).

## 4. Dívida Técnica
- Nenhuma dívida técnica de flags complexas (if/else aninhados) identificada. A implementação atual é limpa e isolada no `AppLayout`.
