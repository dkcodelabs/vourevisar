# Release Freeze v1.2.1-LEAN

Este documento formaliza o congelamento da release **v1.2.1-LEAN (Escopo Enxuto)** após a consolidação da simplificação do produto.

## 📌 Status Final
- **Versão:** 1.2.1-LEAN
- **Data de Congelamento:** 2026-02-13 23:18
- **Decisão:** **GO-MANTIDO** ✅

## 🎯 Escopo Aprovado
A release foca exclusivamente na simplificação da experiência do aluno e na estabilização operacional da triagem.

### Aluno (Simplificado)
- Interface de "Pedidos" e "Solicitações" (Substituiu "Feedback").
- Abas: Notificações e Meus Pedidos.
- Status Padronizados: Nova, Planejada, Em desenvolvimento, Concluída, Não planejada.
- Ocultação total de termos técnicos e métricas de SLA.

### Admin (Preservado)
- Manutenção da visão operacional completa.
- Dashboard de SLA e Analytics (Uso interno).
- Gestão de triagem e respostas.

## 🚫 Itens Excluídos (Roadmap v1.3 Cancelado/Adiado)
Os seguintes itens foram removidos desta baseline para garantir a entrega do escopo enxuto:
- Exportação de dados (CSV/Excel).
- Notificações Push de SLA.
- Comentários internos para Admin.
- Migração para TanStack Query.
- Refatoração de Arquitetura em camadas.

## 🛡️ Verificação de Qualidade
- [x] Auditoria de Linguagem: PASS.
- [x] Auditoria de Status: PASS.
- [x] Isolamento de Domínio: PASS.
- [x] Testes de Não Regressão: PASS.

---
**Atenção:** Sem abertura automática de novo escopo após este gate. Qualquer alteração futura deve ser tratada como nova sprint.
