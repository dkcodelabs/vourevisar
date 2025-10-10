-- Verificar status das matérias e seus tópicos
SELECT 
  s.id,
  s.name,
  s.status,
  COUNT(t.id) as total_topics,
  COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END) as completed_topics,
  ROUND(
    (COUNT(CASE WHEN t.completed = true OR t.review_stage = 'Concluído' THEN 1 END)::float / 
     NULLIF(COUNT(t.id), 0)) * 100, 2
  ) as progress_percent
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
WHERE s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
GROUP BY s.id, s.name, s.status
ORDER BY s.name;

-- Ver ciclo atual
SELECT 
  ciclos_realizados,
  ciclo_atual,
  materias_estudadas_ciclo,
  array_length(ciclo_atual, 1) as total_no_ciclo,
  array_length(materias_estudadas_ciclo, 1) as total_estudadas
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';