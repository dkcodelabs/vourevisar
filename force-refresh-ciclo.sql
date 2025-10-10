-- Forçar atualização do ciclo para garantir que tudo está limpo
UPDATE user_cycles 
SET 
  materias_estudadas_ciclo = '{}',  -- Array vazio explícito
  atualizado_em = NOW()
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Verificar o resultado
SELECT 
  ciclos_realizados,
  materias_estudadas_ciclo,
  array_length(materias_estudadas_ciclo, 1) as total_estudadas,
  atualizado_em
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';