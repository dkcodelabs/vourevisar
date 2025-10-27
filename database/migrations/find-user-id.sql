-- Encontrar o user_id correto
SELECT DISTINCT user_id FROM subjects ORDER BY user_id;

-- Verificar se há algum user_cycle
SELECT user_id, ciclos_realizados FROM user_cycles ORDER BY user_id;

-- Verificar matérias por usuário
SELECT 
  user_id,
  COUNT(*) as total_materias,
  array_agg(name ORDER BY name) as materias
FROM subjects 
GROUP BY user_id;