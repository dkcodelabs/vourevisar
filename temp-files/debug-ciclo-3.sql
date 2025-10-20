-- Verificar o estado atual do ciclo 3
SELECT 
  'CICLO_ATUAL' as tipo,
  uc.ciclos_realizados,
  uc.ciclo_atual,
  array_length(uc.ciclo_atual, 1) as total_materias,
  uc.atualizado_em
FROM user_cycles uc 
WHERE uc.user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Verificar todas as tabelas relacionadas a ciclo
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%ciclo%' OR table_name LIKE '%estud%';