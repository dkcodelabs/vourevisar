-- Primeiro, vamos ver o ID da FISICA
SELECT id, name FROM subjects 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2' 
AND name = 'FISICA';

-- Ver o ciclo atual
SELECT ciclo_atual FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Adicionar FISICA ao ciclo atual
UPDATE user_cycles 
SET ciclo_atual = array_append(ciclo_atual, (
  SELECT id::text FROM subjects 
  WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2' 
  AND name = 'FISICA'
)),
atualizado_em = NOW()
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Verificar o resultado
SELECT 
  ciclo_atual,
  array_length(ciclo_atual, 1) as total_materias
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';