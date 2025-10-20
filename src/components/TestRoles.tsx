// =====================================================
// COMPONENTE DE TESTE PARA VERIFICAR ROLES
// =====================================================
import React from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { OwnerOnly, AdminOnly, ModeratorOnly } from '@/components/ProtectedComponent'

export function TestRoles() {
  const { 
    user, 
    roles, 
    highestRole, 
    isOwner, 
    isAdmin, 
    isModerator, 
    loading, 
    error,
    refetch 
  } = useUserRole()

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-blue-50">
        <div className="animate-pulse">🔄 Carregando informações de roles...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 border-red-200">
        <div className="text-red-700">
          <strong>❌ Erro ao carregar roles:</strong> {error}
        </div>
        <button 
          onClick={refetch}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          🔄 Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-gray-50">
        <h3 className="font-bold text-lg mb-3">🔐 Teste do Sistema de Roles</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Informações do Usuário */}
          <div className="space-y-2">
            <h4 className="font-semibold">👤 Informações do Usuário</h4>
            <div className="text-sm space-y-1">
              <div><strong>Email:</strong> {user?.email || 'Não logado'}</div>
              <div><strong>ID:</strong> {user?.id || 'N/A'}</div>
              <div><strong>Roles:</strong> {roles.length > 0 ? roles.join(', ') : 'Nenhuma'}</div>
              <div><strong>Role Mais Alta:</strong> {highestRole || 'Nenhuma'}</div>
            </div>
          </div>

          {/* Status das Permissões */}
          <div className="space-y-2">
            <h4 className="font-semibold">🛡️ Status das Permissões</h4>
            <div className="text-sm space-y-1">
              <div className={`flex items-center gap-2 ${isOwner ? 'text-purple-700' : 'text-gray-500'}`}>
                {isOwner ? '✅' : '❌'} <strong>Owner:</strong> {isOwner ? 'Sim' : 'Não'}
              </div>
              <div className={`flex items-center gap-2 ${isAdmin ? 'text-blue-700' : 'text-gray-500'}`}>
                {isAdmin ? '✅' : '❌'} <strong>Admin:</strong> {isAdmin ? 'Sim' : 'Não'}
              </div>
              <div className={`flex items-center gap-2 ${isModerator ? 'text-green-700' : 'text-gray-500'}`}>
                {isModerator ? '✅' : '❌'} <strong>Moderator:</strong> {isModerator ? 'Sim' : 'Não'}
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Atualizar Roles
        </button>
      </div>

      {/* Testes de Componentes Protegidos */}
      <div className="space-y-3">
        <h4 className="font-semibold">🧪 Teste de Componentes Protegidos</h4>
        
        <OwnerOnly fallback={
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
            ❌ Conteúdo OWNER não visível (você não é owner)
          </div>
        }>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded text-purple-700">
            👑 <strong>OWNER ONLY:</strong> Este conteúdo só é visível para proprietários!
          </div>
        </OwnerOnly>

        <AdminOnly fallback={
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
            ❌ Conteúdo ADMIN não visível (você não é admin)
          </div>
        }>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-700">
            🛡️ <strong>ADMIN ONLY:</strong> Este conteúdo é visível para admins e owners!
          </div>
        </AdminOnly>

        <ModeratorOnly fallback={
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
            ❌ Conteúdo MODERATOR não visível (você não é moderator)
          </div>
        }>
          <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700">
            🛡️ <strong>MODERATOR ONLY:</strong> Este conteúdo é visível para moderators, admins e owners!
          </div>
        </ModeratorOnly>
      </div>

      {/* Instruções */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="font-semibold text-yellow-800 mb-2">💡 Como Testar</h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <div>1. Se você não vê nenhuma role, execute os scripts SQL primeiro</div>
          <div>2. Configure seu email como owner no script <code>05_insert_initial_owner.sql</code></div>
          <div>3. Faça logout e login novamente após executar os scripts</div>
          <div>4. O link "Gerenciamento" deve aparecer no menu se você for admin/owner</div>
        </div>
      </div>
    </div>
  )
}