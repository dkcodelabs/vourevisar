-- Ver TODOS os campos do ciclo atual
SELECT * FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- Ver se o campo materias_estudadas_ciclo existe na tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_cycles' 
AND table_schema = 'public'
ORDER BY ordinal_position;