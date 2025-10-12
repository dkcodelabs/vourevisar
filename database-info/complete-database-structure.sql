-- ========================================
-- MAPEAMENTO COMPLETO DA ESTRUTURA DO BANCO
-- Retorna TODAS as informações estruturais
-- ========================================

-- 1. TODAS AS TABELAS DO BANCO
SELECT 
  'TODAS_TABELAS' as tipo,
  table_schema as schema,
  table_name as tabela,
  table_type as tipo_tabela
FROM information_schema.tables 
WHERE table_schema IN ('public', 'auth', 'storage')
ORDER BY table_schema, table_name;

-- 2. TODAS AS COLUNAS DE TODAS AS TABELAS
SELECT 
  'TODAS_COLUNAS' as tipo,
  table_schema as schema,
  table_name as tabela,
  column_name as coluna,
  data_type as tipo_dados,
  is_nullable as permite_null,
  column_default as valor_padrao,
  character_maximum_length as tamanho_max,
  ordinal_position as posicao
FROM information_schema.columns 
WHERE table_schema IN ('public', 'auth', 'storage')
ORDER BY table_schema, table_name, ordinal_position;

-- 3. TODAS AS CONSTRAINTS (PRIMARY KEYS, FOREIGN KEYS, etc)
SELECT 
  'CONSTRAINTS' as tipo,
  tc.table_schema as schema,
  tc.table_name as tabela,
  tc.constraint_name as nome_constraint,
  tc.constraint_type as tipo_constraint,
  kcu.column_name as coluna,
  ccu.table_name as tabela_referenciada,
  ccu.column_name as coluna_referenciada
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema IN ('public', 'auth', 'storage')
ORDER BY tc.table_schema, tc.table_name, tc.constraint_type;

-- 4. ÍNDICES
SELECT 
  'INDICES' as tipo,
  schemaname as schema,
  tablename as tabela,
  indexname as nome_indice,
  indexdef as definicao_indice
FROM pg_indexes 
WHERE schemaname IN ('public', 'auth', 'storage')
ORDER BY schemaname, tablename;

-- 5. FUNÇÕES E PROCEDURES
SELECT 
  'FUNCOES' as tipo,
  routine_schema as schema,
  routine_name as nome_funcao,
  routine_type as tipo_rotina,
  data_type as tipo_retorno
FROM information_schema.routines 
WHERE routine_schema IN ('public', 'auth', 'storage')
ORDER BY routine_schema, routine_name;

-- 6. VIEWS
SELECT 
  'VIEWS' as tipo,
  table_schema as schema,
  table_name as nome_view,
  view_definition as definicao_view
FROM information_schema.views 
WHERE table_schema IN ('public', 'auth', 'storage')
ORDER BY table_schema, table_name;

-- 7. TRIGGERS
SELECT 
  'TRIGGERS' as tipo,
  trigger_schema as schema,
  trigger_name as nome_trigger,
  event_object_table as tabela,
  action_timing as momento,
  event_manipulation as evento
FROM information_schema.triggers 
WHERE trigger_schema IN ('public', 'auth', 'storage')
ORDER BY trigger_schema, event_object_table;

-- 8. ENUMS (tipos customizados)
SELECT 
  'ENUMS' as tipo,
  n.nspname as schema,
  t.typname as nome_enum,
  e.enumlabel as valor_enum
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname IN ('public', 'auth', 'storage')
ORDER BY n.nspname, t.typname, e.enumsortorder;

-- 9. SEQUÊNCIAS
SELECT 
  'SEQUENCIAS' as tipo,
  sequence_schema as schema,
  sequence_name as nome_sequencia,
  data_type as tipo_dados,
  start_value as valor_inicial,
  increment as incremento
FROM information_schema.sequences 
WHERE sequence_schema IN ('public', 'auth', 'storage')
ORDER BY sequence_schema, sequence_name;