-- Ver TODOS os valores do ciclo atual
SELECT 
  ciclos_realizados,
  ciclo_atual,
  materias_estudadas_ciclo,
  array_length(ciclo_atual, 1) as total_no_ciclo,
  array_length(materias_estudadas_ciclo, 1) as total_estudadas,
  data_inicio_ciclo,
  atualizado_em
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';