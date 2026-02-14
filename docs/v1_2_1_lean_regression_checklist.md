# Checklist de Regressão v1.2.1-LEAN

Relatório final de testes funcionais realizados para o fechamento da release.

## 1. Fluxo do Aluno
| Item | Descrição | Status |
| :--- | :--- | :--- |
| Criar Pedido | O aluno consegue abrir "Nova Solicitação" e enviar. | PASS |
| Protocolo | O protocolo (protocol_code) é gerado e exibido no sucesso. | PASS |
| Visualização | O pedido aparece corretamente na aba "Meus Pedidos". | PASS |
| Notificação | O aluno recebe notificação quando o admin responde. | PASS |
| Semântica | Não há termos "Feedback" ou "SLA" visíveis ao aluno. | PASS |

## 2. Fluxo do Admin
| Item | Descrição | Status |
| :--- | :--- | :--- |
| Triagem | Admin visualiza novos pedidos na lista geral. | PASS |
| Resposta | Admin consegue alterar status e salvar resposta. | PASS |
| SLA Internal | KPIs de SLA continuam visíveis apenas no Admin. | PASS |
| Normalização | Status legados são lidos corretamente como os novos labels. | PASS |

## 3. Integridade Técnica
| Item | Descrição | Status |
| :--- | :--- | :--- |
| Build | Aplicação compila sem erros críticos. | PASS |
| Lint | Sem erros de lint nos componentes alterados. | PASS |
| Isolamento | Dados sensíveis (metadata técnica) não vazam no DOM do aluno. | PASS |

**Data do Teste:** 2026-02-13
**Executor:** AI Developer (Antigravity)
