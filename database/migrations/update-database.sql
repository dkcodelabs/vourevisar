-- Execute este SQL no seu Supabase para adicionar o campo materias_estudadas_ciclo
-- Vá em: Supabase Dashboard > SQL Editor > New Query > Cole este código > Run

ALTER TABLE public.user_cycles 
ADD COLUMN IF NOT EXISTS materias_estudadas_ciclo text[] DEFAULT '{}';

-- Adicionar comentário para explicar o campo
COMMENT ON COLUMN public.user_cycles.materias_estudadas_ciclo IS 'Array of subject IDs that have been studied in the current cycle';

-- Verificar se a coluna foi criada
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_cycles' 
AND column_name = 'materias_estudadas_ciclo';
-- Script para verificar e corrigir o estado do ciclo

-- 1. Verificar estado atual do ciclo
SELECT 
    uc.ciclos_realizados,
    uc.materias_estudadas_ciclo,
    array_length(uc.ciclo_atual, 1) as total_materias_ciclo,
    array_length(uc.materias_estudadas_ciclo, 1) as materias_estudadas_count,
    uc.ciclo_atual,
    uc.data_inicio_ciclo,
    uc.atualizado_em
FROM user_cycles uc
WHERE uc.user_id = (SELECT id FROM auth.users LIMIT 1);

-- 2. Verificar quais matérias estão no ciclo atual
WITH cycle_data AS (
    SELECT 
        uc.ciclo_atual,
        uc.materias_estudadas_ciclo
    FROM user_cycles uc
    WHERE uc.user_id = (SELECT id FROM auth.users LIMIT 1)
)
SELECT 
    s.id,
    s.name,
    s.status,
    CASE 
        WHEN s.id = ANY(cd.materias_estudadas_ciclo) THEN 'Estudada no Ciclo'
        WHEN s.id = ANY(cd.ciclo_atual) THEN 'No Ciclo (Não Estudada)'
        ELSE 'Fora do Ciclo'
    END as status_ciclo,
    -- Calcular progresso da matéria
    CASE 
        WHEN jsonb_array_length(s.topics) > 0 THEN
            ROUND(
                (SELECT COUNT(*) FROM jsonb_array_elements(s.topics) AS topic 
                 WHERE topic->>'reviewStage' = 'Concluído')::numeric / 
                jsonb_array_length(s.topics) * 100
            )
        ELSE 0
    END as progresso_percent
FROM subjects s
CROSS JOIN cycle_data cd
WHERE s.user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY s.name;

-- 3. Se necessário, forçar reinício do ciclo (descomente as linhas abaixo)
/*
UPDATE user_cycles 
SET 
    materias_estudadas_ciclo = '{}',
    ciclos_realizados = COALESCE(ciclos_realizados, 0) + 1,
    data_inicio_ciclo = NOW(),
    atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);
*/
-- CORREÇÃO EMERGENCIAL: Resetar ciclo atual se houver inconsistências

-- Verificar estado atual
SELECT 
    'Estado Atual:' as info,
    uc.ciclos_realizados as ciclo_numero,
    array_length(uc.materias_estudadas_ciclo, 1) as estudadas_count,
    array_length(uc.ciclo_atual, 1) as total_ciclo,
    uc.materias_estudadas_ciclo,
    uc.ciclo_atual
FROM user_cycles uc
WHERE uc.user_id = (SELECT id FROM auth.users LIMIT 1);

-- CORREÇÃO: Se o ciclo foi incrementado mas ainda há matérias estudadas, resetar
UPDATE user_cycles 
SET 
    materias_estudadas_ciclo = '{}',
    atualizado_em = NOW()
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND ciclos_realizados >= 2
  AND array_length(materias_estudadas_ciclo, 1) > 0;

-- Verificar após correção
SELECT 
    'Após Correção:' as info,
    uc.ciclos_realizados as ciclo_numero,
    array_length(uc.materias_estudadas_ciclo, 1) as estudadas_count,
    array_length(uc.ciclo_atual, 1) as total_ciclo,
    uc.materias_estudadas_ciclo,
    uc.ciclo_atual
FROM user_cycles uc
WHERE uc.user_id = (SELECT id FROM auth.users LIMIT 1);