# Pacote de Governança Final (v1.2.1-LEAN)

Este documento centraliza as referências para a governança operacional da release.

## 📚 Documentação Operacional
| Documento | Propósito | Link |
| :--- | :--- | :--- |
| **Checklist Semanal** | Rotina de triagem e saúde técnica. | [Ver Checklist](./v1_2_1_weekly_ops_checklist.md) |
| **Política de Linguagem** | Regras de vocabulário (Aluno vs Admin). | [Ver Política](./v1_2_1_product_language_policy.md) |
| **Controle de Mudança** | Diretrizes para bugfixes e novos escopos. | [Ver Controle](./v1_2_1_change_control.md) |
| **Changelog Final** | Histórico consolidado da versão. | [Ver Changelog](./v1_2_1_lean_changelog_final.md) |

## 🔒 Regras de Ouro (Pós-Freeze)
1. **Zero Features:** Nenhuma nova funcionalidade pode ser commitada nesta branch/tag.
2. **Bugfix Only:** Apenas correções críticas (segurança, bloqueio, regressão) são aceitas mediante issue.
3. **Semântica:** PRs que violem a política de linguagem ("Feedback" na UI do aluno) devem ser rejeitados automaticamente.

## 🔄 Ciclo de Vida
Esta baseline (`v1.2.1-LEAN`) é a versão estável de produção. Qualquer evolução futura deve iniciar um novo ciclo de versionamento (`v1.3.0` ou superior) após planejamento formal.
