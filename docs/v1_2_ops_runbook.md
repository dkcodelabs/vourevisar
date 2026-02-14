# Runbook de Operações — SLA Analytics v1.2

Este manual guia a equipe de operações na triagem e gestão de feedbacks utilizando as novas ferramentas de SLA.

## 1. Gestão Diária de SLA
O objetivo é manter o **Semáforo de Saúde** em **Verde** (Taxa de Resposta > 90%).

### 1.1 Triagem de Itens Críticos
1. Acesse `/admin/feedback`.
2. Abra o Analytics e verifique o painel **"Saúde do SLA"**.
3. Se o indicador de **Resposta** estiver Amarelo ou Vermelho:
   - Filtre a tabela por `SLA Resp.` = "Atrasado".
   - Priorize feedbacks do tipo "Problema" (SLA mais curto).
4. Para cada item, forneça uma resposta inicial para "parar o relógio" do SLA de Resposta.

### 1.2 Regras de Negócio (Configuradas)
- **Primeira Resposta:** Deve ocorrer em até **24 horas úteis** da criação.
- **Resolução de Problemas:** Meta de fechamento em **48 horas**.
- **Melhorias/Novas Funcionalidades:** Meta de fechamento em **7 dias**.

## 2. Tratamento de Incidentes Comuns

### 2.1 Dashboard exibindo "Sem dados suficientes"
- **Causa:** Nível de feedbacks baixo para o período selecionado ou filtros muito restritivos.
- **Ação:** Aumentar o período (ex: de 7 para 30 ou 90 dias) ou clicar em "Limpar Filtros".

### 2.2 Badge de SLA "Excedido" em item concluído
- **Causa:** O item foi resolvido após a data limite (`sla_due_date`).
- **Ação:** Nenhuma ação corretiva técnica necessária. Este é um dado histórico para análise de performance da equipe.

### 2.3 Analytics desatualizado após ação
- **Causa:** Cache em memória ativo (TTL 5min).
- **Ação:** Recarregar a página (F5) ou aguardar o tempo de expiração para ver os novos números refletidos.

## 3. Escalacionamento
- **Erro de Cálculo:** Se um item criado "agora" aparecer como "Atrasado", escalar para o time de desenvolvimento (Bug na `calculateSLADeadlines`).
- **Lentidão Crítica:** Se o loading do analytics demorar > 5s, verificar performance de query no Supabase Dashboard.

---
**Status:** ATIVO  
**Responsável:** Ops Team / Admin
