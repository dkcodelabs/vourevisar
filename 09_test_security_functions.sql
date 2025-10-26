-- =====================================================
-- 9. TESTES DAS SECURITY DEFINER FUNCTIONS
-- =====================================================
-- Scripts para testar se tudo está funcionando corretamente

-- =====================================================
-- TESTES BÁSICOS (Execute um por vez)
-- =====================================================

-- Teste 1: Verificar se você é owner
SELECT public.is_owner('e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID) as is_owner;
-- Esperado: true

-- Teste 2: Verificar role específica
SELECT public.has_role('e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID, 'owner') as has_owner_role;
-- Esperado: true

-- Teste 3: Verificar hierarquia
SELECT public.has_role_or_higher('e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID, 'admin') as has_admin_or_higher;
-- Esperado: true (owner é maior que admin)

-- =====================================================
-- TESTES ADMINISTRATIVOS (Simule contexto autenticado)
-- =====================================================

-- Simula estar logado como owner
SELECT set_config('request.jwt.claims', '{"sub":"e2de8e3b-9484-4064-b9ae-771a576091e1"}', true);

-- Teste 4: Listar usuários (deve funcionar)
SELECT * FROM public.list_users_with_roles();

-- Teste 5: Ver informações de usuário específico
SELECT * FROM public.get_user_info('e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID);

-- Teste 6: Ver log de auditoria
SELECT * FROM public.get_role_audit_log(10);

-- =====================================================
-- TESTES DE SEGURANÇA (Simule usuário não-owner)
-- =====================================================

-- Crie um usuário de teste primeiro (substitua por um UUID real se tiver)
-- INSERT INTO auth.users (id, email) VALUES ('test-user-id', 'test@example.com');

-- Simula estar logado como usuário comum
-- SELECT set_config('request.jwt.claims', '{"sub":"test-user-id"}', true);

-- Teste 7: Tentar listar usuários (deve falhar)
-- SELECT * FROM public.list_users_with_roles();
-- Esperado: ERROR: Only owners can list users

-- Teste 8: Tentar atribuir role (deve falhar)
-- SELECT public.assign_role('test-user-id'::UUID, 'admin');
-- Esperado: ERROR: Only owners can assign roles

-- =====================================================
-- TESTES DE ATRIBUIÇÃO DE ROLES (Como owner)
-- =====================================================

-- Volta para contexto de owner
SELECT set_config('request.jwt.claims', '{"sub":"e2de8e3b-9484-4064-b9ae-771a576091e1"}', true);

-- Teste 9: Atribuir role de admin para si mesmo (vai manter owner também)
-- NOTA: Como já é owner, vamos adicionar admin como role adicional
SELECT public.assign_role('e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID, 'admin');

-- Teste 10: Verificar se agora tem múltiplas roles
SELECT * FROM public.get_user_info('e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID);

-- Teste 11: Tentar remover própria role de owner (deve falhar)
-- SELECT public.remove_role('e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID, 'owner');
-- Esperado: ERROR: Owners cannot remove their own owner role

-- =====================================================
-- LIMPEZA DOS TESTES
-- =====================================================

-- Remove role de admin adicionada no teste
SELECT public.remove_role('e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID, 'admin');

-- Verifica se voltou ao estado original (apenas owner)
SELECT * FROM public.get_user_info('e2de8e3b-9484-4064-b9ae-771a576091e1'::UUID);

-- =====================================================
-- RESULTADOS ESPERADOS
-- =====================================================
/*
✅ Teste 1-3: Verificações básicas funcionam
✅ Teste 4-6: Funções administrativas funcionam para owners
❌ Teste 7-8: Funções administrativas falham para não-owners
✅ Teste 9-10: Atribuição de roles funciona
❌ Teste 11: Proteção contra auto-remoção funciona
✅ Limpeza: Sistema volta ao estado original
*/