# Sequência de Execução (v1.1)

> **ESTRATÉGIA:** "Ops First" — Melhorar a eficiência do Admin antes de aumentar o fluxo do Aluno.

## Sprint 1: Fundação Operacional (Admin + Security)
**Objetivo:** Preparar o terreno administrativo e bloquear abusos.
1. **[BE-01] Rate Limit:** Impedir ataques de spam no endpoint de feedback.
2. **[ADM-01] Filtros Admin:** Permitir que o time opere com volume maior de dados.
3. **[ADM-02] Respostas Prontas:** Acelerar o tempo de resposta inicial.

## Sprint 2: Experiência do Aluno (UX)
**Objetivo:** Fechar o ciclo de feedback para o aluno.
1. **[FE-01] Indicador de Resposta:** Badge no sino e na lista.
2. **[FE-02] Timeline Visual:** Clareza sobre o status do pedido.
3. **[UX-01] Toast Refinado:** Feedback imediato mais polido.

## Sprint 3: Qualidade & Polimento (QA)
**Objetivo:** Garantir robustez e consistência.
1. **[QA-01] E2E Tests:** Cobrir o fluxo crítico Admin <-> Aluno automaticamente.
2. **[BE-02] Sanitização Reforçada:** Blindar contra XSS avançado.
3. **[FE-03] Quick Reactions (Opcional):** Se sobrar tempo (Stretch Goal).

## Racional Técnico
- Começar pelo Admin evita gargalo operacional se o volume de feedbacks aumentar.
- UX do Aluno é a segunda prioridade para valorizar o engajamento gerado.
- QA por último consolida a versão antes do code freeze da v1.1.
