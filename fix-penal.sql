-- CORREÇÃO ESPECÍFICA PARA PENAL
-- Execute este SQL para corrigir o estado atual

-- 1. Verificar estado atual
SELECT 
    'Estado Atual:' as info,
    uc.ciclos_realizados,
    uc.materias_estudadas_ciclo,
    array_length(uc.materias_estudadas_ciclo, 1) as estudadas_count
FROM user_cycles uc
WHERE uc.user_id = (SELECT id FROM auth.users LIMIT 1);

-- 2. Verificar se PENAL está nas matérias estudadas
SELECT 
    s.name,
    s.id,
    CASE 
        WHEN s.id = ANY((SELECT materias_estudadas_ciclo FROM user_cycles WHERE user_id = (SELECT id FROM auth.users LIMIT 1))) 
        THEN 'Estudada no Ciclo'
        ELSE 'Não Estudada'
    END as status_ciclo
FROM subjects s
WHERE s.user_id = (SELECT id FROM auth.users LIMIT 1)
  AND s.name = 'PENAL';

-- 3. FORÇAR NOVO CICLO (descomente se necessário)
/*
UPDATE user_cycles 
SET 
    materias_estudadas_ciclo = '{}',
    ciclos_realizados = COALESCE(ciclos_realizados, 0) + 1,
    data_inicio_ciclo = NOW(),
    atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
*/