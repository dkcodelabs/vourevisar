-- CORREÇÃO EMERGENCIAL DO CICLO
-- Execute este SQL no Supabase para corrigir as inconsistências

-- 1. Verificar estado atual
SELECT 
    'Estado Atual:' as info,
    uc.ciclos_realizados as ciclo_numero,
    array_length(uc.materias_estudadas_ciclo, 1) as estudadas_count,
    array_length(uc.ciclo_atual, 1) as total_ciclo,
    uc.materias_estudadas_ciclo,
    uc.ciclo_atual
FROM user_cycles uc
WHERE uc.user_id = (SELECT id FROM auth.users LIMIT 1);

-- 2. CORREÇÃO: Resetar matérias estudadas no ciclo atual
UPDATE user_cycles 
SET 
    materias_estudadas_ciclo = '{}',
    atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- 3. Verificar após correção
SELECT 
    'Após Correção:' as info,
    uc.ciclos_realizados as ciclo_numero,
    array_length(uc.materias_estudadas_ciclo, 1) as estudadas_count,
    array_length(uc.ciclo_atual, 1) as total_ciclo,
    uc.materias_estudadas_ciclo,
    uc.ciclo_atual
FROM user_cycles uc
WHERE uc.user_id = (SELECT id FROM auth.users LIMIT 1);