# Critérios de Aceite v1.1 — Funcionalidades Prioritárias

> **FOCO:** Itens P0 (MUST HAVE) do Backlog

## 1. [FE-01] Indicador de Nova Resposta

**Cenário:** Admin responde feedback.
- [ ] **Dado que** um aluno tem um feedback com status "Nova".
- [ ] **Quando** o admin altera o status para "Respondida" e insere texto.
- [ ] **Então** o aluno deve ver um badge (bolinha vermelha) no ícone do sino.
- [ ] **E** ao abrir a Central, o item específico deve ter destaque visual.

**Critério de Limpeza (Done):**
- Badge some ao clicar no item.

## 2. [BE-01] Rate Limit por Usuário

**Cenário:** Tentativa de spam.
- [ ] **Dado que** um usuário já enviou 5 feedbacks na última hora.
- [ ] **Quando** ele tenta enviar o 6º feedback.
- [ ] **Então** o sistema deve bloquear o envio e exibir mensagem clara: "Limite de envios excedido. Tente novamente em 1 hora."
- [ ] **E** não deve gerar erro 500 no backend.

**Critério Técnico:**
- Implementado via RLS ou Edge Function.

## 3. [ADM-01] Filtros de Status/Tipo

**Cenário:** Admin buscando bugs.
- [ ] **Dado que** existem 50 feedbacks misturados.
- [ ] **Quando** o admin filtra por Tipo="Bug" e Status="Nova".
- [ ] **Então** a lista deve mostrar apenas os itens correspondentes.
- [ ] **E** o contador de itens deve atualizar corretamente (ex: "Mostrando 5 de 50").
