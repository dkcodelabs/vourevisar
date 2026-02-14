# Controle de Mudança Pós-Freeze (v1.2.1-LEAN)

Define as diretrizes para modificações na release enquanto estiver em regime de congelamento (Freeze).

## 1. O que é Permitido (Bugfix)
- Correção de erros que impeçam o envio de solicitações.
- Correção de erros de renderização que quebrem o layout (regressões visuais).
- Correção de falhas de segurança ou RLS.
- Correção de textos que violem a **Política de Vocabulário**.

## 2. O que é Proibido (Escopo Novo)
- Adição de novos botões ou funcionalidades (ex: exportar, filtrar por data).
- Alteração de regras de negócio de SLA (adiar para nova sprint).
- Refatorações puramente estéticas ou de arquitetura sem causa raiz de erro.

## 3. Fluxo de Execução
1. **Identificação:** Abertura da Issue/Ticket descrevendo o erro.
2. **Justificativa:** Validar se o item se enquadra em "Permitido".
3. **Draft da Solução:** Implementar em branch isolada.
4. **Validação:** Checar contra o `v1_2_1_lean_regression_checklist.md`.
5. **Merge e Changelog:** Atualizar o changelog com a correção.

---
**Baseline:** `v1.2.1-LEAN`
**Data de Aprovação:** 2026-02-13
