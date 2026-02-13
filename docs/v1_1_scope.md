# Escopo da Versão 1.1 — Refinamento e Eficiência

> **OBJETIVO:** Maximizar a eficiência operacional do Admin e refinar a experiência de feedback do Aluno.
> **TEMA:** "Polimento e Produtividade"

## 1. O Que Entra (IN)

### A) Melhorias na Central do Aluno
- **Histórico Visual de Status:** Timeline simples mostrando a evolução do feedback (Nova -> Planejada -> Concluída).
- **Notificação de Resposta:** Badge/alerta específico quando houver resposta do admin (hoje é genérico).
- **Feedback Rápido (Quick Actions):** Botões de reação rápida (Like/Dislike) em conteúdos.

### B) Operação Admin (Eficiência)
- **Filtros Avançados:** Filtrar por categoria (Elogio/Bug), Status e Data.
- **Respostas Prontas (Canned Responses):** Templates para respostas comuns ("Recebido", "Em análise").
- **Bulk Actions:** Alterar status de múltiplos itens de uma vez.

### C) Confiabilidade e Segurança
- **Rate Limit por Usuário:** Limitar feedbacks a 5/hora para evitar spam.
- **Sanitização Reforçada:** Melhorar limpeza de HTML/Scripts no input.

## 2. O Que Fica Fora (OUT)
- **Chat Real-time:** Complexidade alta, manter fluxo assíncrono.
- **Upload de Imagens:** Risco de armazenamento/custo. Fica para v1.2.
- **App Nativo:** Manter foco em PWA/Web Responsivo.

## 3. Premissas e Dependências
- Base de dados atual (`admin_feedback_events`) suporta as mudanças sem alterações estruturais de schema (apenas queries).
- Sem dependência de serviços externos novos.
