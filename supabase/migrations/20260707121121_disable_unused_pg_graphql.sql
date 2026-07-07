-- The app uses supabase-js/PostgREST, not Supabase GraphQL. Keeping pg_graphql
-- enabled exposes table metadata to roles with table grants and keeps advisor
-- warnings such as pg_graphql_authenticated_table_exposed alive for study data.
drop extension if exists pg_graphql;
