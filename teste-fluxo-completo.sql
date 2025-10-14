-- Teste do fluxo completo após correções
-- Execute este script para simular e testar o comportamento correto

-- 1. Limpar dados de teste (cuidado - só execute se necessário)
-- DELETE FROM study_sessions WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2' AND study_date = CURRENT_DATE;

-- 2. Estado inicial - verificar se está limpo
SELECT 
  'ESTADO INICIAL' as fase,
  COALESCE(array_length(materias_estudadas_hoje, 1), 0) as materias_hoje,
  materias_por_dia,
  data_ultimo_reset,
  CASE 
    WHEN data_ultimo_reset = CURRENT_DATE THEN 'JÁ RESETADO HOJE'
    WHEN data_ultimo_reset IS NULL THEN 'NUNCA RESETADO'
    ELSE 'ÚLTIMO RESET: ' || data_ultimo_reset::text
  END as status_reset
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 3. Simular primeira sessão (descomente para testar)
/*
INSERT INTO study_sessions (
  user_id, subject_id, subject_name, study_date, 
  cycle_position, topics_studied, completed_at
) VALUES (
  'e245ef9d-fc38-48f9-b3b2-e887a211a1b2',
  'a02fb845-b0e1-4ab0-9ca1-105674577492',
  'PORTUGUES',
  CURRENT_DATE,
  1,
  ARRAY['crase'],
  NOW()
);
*/

-- 4. Verificar após primeira sessão
SELECT 
  'APÓS PRIMEIRA SESSÃO' as fase,
  COUNT(DISTINCT subject_id) as materias_estudadas,
  2 as meta_diaria,
  ROUND((COUNT(DISTINCT subject_id)::float / 2) * 100, 0) as percentual,
  CASE 
    WHEN COUNT(DISTINCT subject_id) >= 2 THEN 'META ATINGIDA - DEVE EXPANDIR'
    ELSE 'EM PROGRESSO - NÃO DEVE EXPANDIR'
  END as status_expansao
FROM study_sessions 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
  AND study_date = CURRENT_DATE;

-- 5. Simular segunda sessão (descomente para testar)
/*
INSERT INTO study_sessions (
  user_id, subject_id, subject_name, study_date, 
  cycle_position, topics_studied, completed_at
) VALUES (
  'e245ef9d-fc38-48f9-b3b2-e887a211a1b2',
  'f4c51111-2a08-4015-8732-f97b1f8d334a',
  'MATEMATICA',
  CURRENT_DATE,
  1,
  ARRAY['algebra'],
  NOW()
);
*/

-- 6. Verificar após segunda sessão
SELECT 
  'APÓS SEGUNDA SESSÃO' as fase,
  COUNT(DISTINCT subject_id) as materias_estudadas,
  2 as meta_diaria,
  ROUND((COUNT(DISTINCT subject_id)::float / 2) * 100, 0) as percentual,
  CASE 
    WHEN COUNT(DISTINCT subject_id) >= 2 THEN 'META ATINGIDA - DEVE EXPANDIR'
    ELSE 'EM PROGRESSO - NÃO DEVE EXPANDIR'
  END as status_expansao
FROM study_sessions 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2'
  AND study_date = CURRENT_DATE;

-- 7. Atualizar user_cycles com dados corretos
UPDATE user_cycles 
SET 
  materias_estudadas_hoje = (
    SELECT COALESCE(array_agg(DISTINCT subject_id::text), ARRAY[]::text[])
    FROM study_sessions 
    WHERE user_id = user_cycles.user_id 
      AND study_date = CURRENT_DATE
  ),
  data_ultimo_reset = CURRENT_DATE,
  atualizado_em = NOW()
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';

-- 8. Estado final
SELECT 
  'ESTADO FINAL' as fase,
  array_length(materias_estudadas_hoje, 1) as materias_hoje,
  materias_por_dia,
  data_ultimo_reset,
  CASE 
    WHEN array_length(materias_estudadas_hoje, 1) >= materias_por_dia THEN 'SUCESSO - META CONCLUÍDA'
    ELSE 'PENDENTE - META NÃO CONCLUÍDA'
  END as resultado
FROM user_cycles 
WHERE user_id = 'e245ef9d-fc38-48f9-b3b2-e887a211a1b2';