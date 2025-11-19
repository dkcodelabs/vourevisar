# 🔒 Correção de Políticas RLS (Row Level Security)

## 📋 Problema Identificado

Erro **406 (Not Acceptable)** ao acessar a tabela `user_cycles`:
```
GET /rest/v1/user_cycles?select=*&user_id=eq.xxx 406 (Not Acceptable)
```

Este erro ocorre quando as políticas RLS (Row Level Security) não estão configuradas corretamente ou estão faltando.

## ✅ Solução

Execute os scripts SQL no painel do Supabase para corrigir as políticas RLS.

### Opção 1: Corrigir apenas user_cycles (Rápido)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo do arquivo: `database/migrations/fix_user_cycles_rls.sql`
4. Clique em **Run** para executar

### Opção 2: Corrigir todas as tabelas (Recomendado)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo do arquivo: `database/migrations/fix_all_rls_policies.sql`
4. Clique em **Run** para executar

## 🔍 Verificação

Após executar os scripts, você deve ver:

1. ✅ Nenhum erro 406 no console do navegador
2. ✅ Dados do ciclo de estudos carregando corretamente
3. ✅ Todas as funcionalidades do sistema funcionando

## 🛡️ Segurança

As políticas RLS garantem que:

- ✅ Cada usuário vê **apenas seus próprios dados**
- ✅ Ninguém pode acessar dados de outros usuários
- ✅ Todas as operações (SELECT, INSERT, UPDATE, DELETE) são protegidas
- ✅ O sistema é seguro mesmo com acesso direto à API do Supabase

## 📊 Tabelas Protegidas

As seguintes tabelas terão políticas RLS aplicadas:

1. **user_cycles** - Dados do ciclo de estudos do usuário
2. **subjects** - Matérias do usuário
3. **topics** - Tópicos das matérias
4. **user_settings** - Configurações do usuário
5. **study_sessions** - Sessões de estudo

## 🔧 Troubleshooting

### Se ainda houver erro 406:

1. Verifique se o RLS está habilitado:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_cycles' 
AND schemaname = 'public';
```

2. Verifique se as políticas foram criadas:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'user_cycles';
```

3. Teste o acesso:
```sql
SELECT * FROM user_cycles WHERE user_id = auth.uid() LIMIT 1;
```

### Se o erro persistir:

- Limpe o cache do navegador (Ctrl + Shift + R)
- Faça logout e login novamente
- Verifique se o token de autenticação está válido

## 📞 Suporte

Se precisar de ajuda, verifique:
- Logs do Supabase Dashboard
- Console do navegador (F12)
- Network tab para ver detalhes da requisição
