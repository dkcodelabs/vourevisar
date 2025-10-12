-- ========================================
-- DIAGNÓSTICO SIMPLES - DESCOBRIR O PROBLEMA
-- Execute uma query por vez
-- ========================================

-- 1. VERIFICAR SE SEU EMAIL EXISTE
SELECT COUNT(*) as usuarios_encontrados FROM auth.users WHERE email = 'darciliok@gmail.com';

-- 2. LISTAR TODOS OS EMAILS (para ver qual é o correto)
SELECT email FROM auth.users ORDER BY email;

-- 3. VERIFICAR SE HÁ MATÉRIAS NO SISTEMA
SELECT COUNT(*) as total_materias FROM subjects;

-- 4. VERIFICAR SE HÁ CICLOS NO SISTEMA  
SELECT COUNT(*) as total_ciclos FROM user_cycles;

-- 5. SE SEU EMAIL NÃO EXISTIR, TENTE ENCONTRAR POR PARTE DO EMAIL
SELECT email FROM auth.users WHERE email LIKE '%darcilio%' OR email LIKE '%gmail%';

-- 6. ESTRUTURA BÁSICA DA TABELA SUBJECTS
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'subjects' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. ESTRUTURA BÁSICA DA TABELA USER_CYCLES
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'user_cycles' AND table_schema = 'public'
ORDER BY ordinal_position;