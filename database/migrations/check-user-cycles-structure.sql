-- Verificar estrutura da tabela user_cycles
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_cycles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar dados atuais (primeiras 3 linhas)
SELECT * FROM user_cycles LIMIT 3;