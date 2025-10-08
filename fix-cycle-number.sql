-- CORREÇÃO DO NÚMERO DO CICLO
-- Se você completou 3 ciclos, o próximo deve ser #4

-- 1. Ver estado atual
SELECT 
    'Estado atual:' as info,
    ciclos_realizados,
    'Próximo ciclo será:' as proximo,
    ciclos_realizados + 1 as proximo_numero
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- 2. CORREÇÃO: Se você completou 3 ciclos, ajustar para 4
UPDATE user_cycles 
SET 
    ciclos_realizados = 4,
    atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- 3. Verificar após correção
SELECT 
    'Após correção:' as info,
    ciclos_realizados,
    'Próximo ciclo será:' as proximo,
    ciclos_realizados + 1 as proximo_numero
FROM user_cycles 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);