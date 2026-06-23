-- Reabre somente estados encerrados pela regra legada de quatro contatos.
-- Não reconstrói dificuldade, estabilidade, intervalo ou histórico ausente.
update public.topics
set completed = false,
    review_stage = 'Revisão 3',
    next_review = current_date
where completed = true
  and review_count = 4
  and next_review is null;

-- Tópicos iniciados sem agenda ficam disponíveis para uma revisão de
-- calibração hoje. O motor voltará a produzir métricas após essa sessão real.
update public.topics
set next_review = current_date
where completed = false
  and review_count > 0
  and next_review is null;
