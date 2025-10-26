// =====================================================
// PÁGINA DE TESTE - USE PARA VERIFICAR SE FUNCIONA
// =====================================================
'use client'

import React from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { OwnerOnly, AdminOnly, AuthenticatedOnly } from '@/components/ProtectedComponent'
import { UserRoleBadge, ProtectedButton, UserInfo } from '@/components/RoleBasedUI'

export default function TestePage() {
  const { user, roles, isOwner, isAdmin, loading, error } = useUserRole()

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">🧪 Teste do Sistema de Roles</h1>

      {/* Seção de Debug */}
      <div className="bg-gray-100 p-4 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">📊 Informações de Debug</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Loading:</strong> {loading ? '✅ Sim' : '❌ Não'}</p>
            <p><strong>Erro:</strong> {error || '❌ Nenhum'}</p>
            <p><strong>Usuário Logado:</strong> {user ? '✅ Sim' : '❌ Não'}</p>
            <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Roles:</strong> {roles.join(', ') || 'Nenhuma'}</p>
            <p><strong>É Admin:</strong> {isAdmin ? '✅ Sim' : '❌ Não'}</p>
            <p><strong>É Owner:</strong> {isOwner ? '✅ Sim' : '❌ Não'}</p>
            <p><strong>User ID:</strong> {user?.id?.slice(0, 8) || 'N/A'}...</p>
          </div>
        </div>
      </div>

      {/* Teste de Loading */}
      {loading && (
        <div className="bg-blue-100 p-4 rounded-lg mb-8">
          <p>⏳ Carregando informações do usuário...</p>
        </div>
      )}

      {/* Teste de Erro */}
      {error && (
        <div className="bg-red-100 p-4 rounded-lg mb-8">
          <p>❌ Erro: {error}</p>
        </div>
      )}

      {/* Teste de Usuário Não Logado */}
      {!loading && !user && (
        <div className="bg-yellow-100 p-4 rounded-lg mb-8">
          <p>⚠️ Usuário não está logado. Faça login para testar as permissões.</p>
        </div>
      )}

      {/* Testes de Componentes */}
      <div className="space-y-8">
        {/* Teste AuthenticatedOnly */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">🔐 Teste: AuthenticatedOnly</h3>
          <AuthenticatedOnly fallback={<p className="text-red-600">❌ Você precisa estar logado</p>}>
            <div className="bg-green-100 p-3 rounded">
              ✅ Sucesso! Você está logado e pode ver este conteúdo.
            </div>
          </AuthenticatedOnly>
        </div>

        {/* Teste AdminOnly */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">🛡️ Teste: AdminOnly</h3>
          <AdminOnly fallback={<p className="text-red-600">❌ Você precisa ser admin ou owner</p>}>
            <div className="bg-blue-100 p-3 rounded">
              ✅ Sucesso! Você é admin ou owner e pode ver este conteúdo.
            </div>
          </AdminOnly>
        </div>

        {/* Teste OwnerOnly */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">👑 Teste: OwnerOnly</h3>
          <OwnerOnly fallback={<p className="text-red-600">❌ Você precisa ser owner</p>}>
            <div className="bg-purple-100 p-3 rounded">
              ✅ Sucesso! Você é owner e pode ver este conteúdo exclusivo.
            </div>
          </OwnerOnly>
        </div>

        {/* Teste UserRoleBadge */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">🏷️ Teste: UserRoleBadge</h3>
          <p>Sua role atual: <UserRoleBadge /></p>
        </div>

        {/* Teste ProtectedButton */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">🔘 Teste: ProtectedButton</h3>
          <div className="space-x-2">
            <ProtectedButton
              requiredRole="admin"
              orHigher={true}
              onClick={() => alert('Ação de admin executada!')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Botão Admin
            </ProtectedButton>
            
            <ProtectedButton
              requiredRole="owner"
              onClick={() => alert('Ação de owner executada!')}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Botão Owner
            </ProtectedButton>
          </div>
        </div>

        {/* Teste UserInfo */}
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">👤 Teste: UserInfo</h3>
          <UserInfo />
        </div>
      </div>

      {/* Instruções */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">📝 Como Interpretar os Resultados:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>✅ Verde:</strong> Você tem permissão e pode ver o conteúdo</li>
          <li><strong>❌ Vermelho:</strong> Você não tem permissão para ver o conteúdo</li>
          <li><strong>Botões desabilitados:</strong> Você não tem permissão para usar a função</li>
          <li><strong>Badge de role:</strong> Mostra sua role mais alta no sistema</li>
        </ul>
      </div>
    </div>
  )
}