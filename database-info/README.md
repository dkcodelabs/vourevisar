# 📊 Informações do Banco de Dados

Esta pasta contém informações importantes sobre a estrutura e dados do banco de produção.

## 📁 Arquivos:

- **`structure-query.sql`** - Query para analisar a estrutura do banco
- **`structure-result.md`** - Resultado da query com todas as informações
- **`user-data.md`** - Dados específicos do usuário darciliok@gmail.com
- **`fix-queries/`** - Pasta com queries de correção baseadas nos dados reais

## 🎯 Objetivo:

Manter um registro das informações do banco para criar queries de correção mais precisas e debugar problemas de inconsistência nas estatísticas.

## 📝 Como usar:

1. Execute `structure-query.sql` no banco de produção
2. Salve o resultado em `structure-result.md`
3. Use essas informações para criar queries de correção específicas