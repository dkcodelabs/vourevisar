-- Verificar se o sistema deve detectar novo ciclo
SELECT 
  'DETECÇÃO NOVO CICLO' as info,
  ciclos_realizados,
  array_length(materias_estudadas_hoje, 1) as materias_hoje,
  data_ultimo_reset,
  data_inicio_ciclo,
  CASE 
    WHEN ciclos_realizados = 1 AND (materias_estudadas_hoje IS NULL OR array_length(materias_estudadas_hoje, 1) = 0) THEN 'DEVE MOSTRAR NOVO CICLO'
    WHEN data_ultimo_reset IS NULL THEN 'DEVE MOSTRAR NOVO CICLO (NUNCA RESETADO)'
    ELSE 'NÃO DEVE MOSTRAR NOVO CICLO'
  END as resultado
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';