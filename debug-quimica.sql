-- Verificar se QUIMICA foi adicionada ao ciclo
SELECT 
  s.name,
  s.id,
  CASE WHEN s.id::text = ANY(uc.ciclo_atual) THEN 'NO_CICLO' ELSE 'FORA_DO_CICLO' END as status_ciclo
FROM subjects s
CROSS JOIN user_cycles uc
WHERE s.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
AND uc.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
ORDER BY s.name;

-- Ver o ciclo atual completo
SELECT 
  ciclo_atual,
  array_length(ciclo_atual, 1) as total_no_ciclo
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';