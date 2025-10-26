// =====================================================
// COMPONENTE DE TESTE DE ROLES - SIMPLES
// =====================================================
import React from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { OwnerOnly, AdminOnly } from '@/components/ProtectedComponent'
import { UserRoleBadge } from '@/components/RoleBasedUI'

export default function RoleTest() {
  const { user, roles, isOwner, isAdmin, loading, error } = useUserRole()

  return (
    <div style={{ 
      border: '2px solid #e2e8f0', 
      borderRadius: '8px', 
      padding: '16px', 
      margin: '16px 0',
      backgroundColor: '#f8fafc'
    }}>
      <h3 style={{ color: '#1e293b', marginBottom: '12px' }}>
        🧪 Teste do Sistema de Roles
      </h3>

      {/* Informações de Debug */}
      <div style={{ 
        backgroundColor: '#e2e8f0', 
        padding: '12px', 
        borderRadius: '6px',
        marginBottom: '16px',
        fontSize: '14px'
      }}>
        <p><strong>Loading:</strong> {loading ? '✅ Sim' : '❌ Não'}</p>
        <p><strong>Erro:</strong> {error || '❌ Nenhum'}</p>
        <p><strong>Usuário:</strong> {user?.email || 'Não logado'}</p>
        <p><strong>Roles:</strong> {roles.join(', ') || 'Nenhuma'}</p>
        <p><strong>É Owner:</strong> {isOwner ? '✅ Sim' : '❌ Não'}</p>
        <p><strong>É Admin:</strong> {isAdmin ? '✅ Sim' : '❌ Não'}</p>
      </div>

      {/* Badge de Role */}
      <div style={{ marginBottom: '16px' }}>
        <strong>Sua Role: </strong>
        <UserRoleBadge />
      </div>

      {/* Teste AdminOnly */}
      <AdminOnly fallback={
        <div style={{ color: '#dc2626', padding: '8px', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
          ❌ Você precisa ser admin ou owner para ver conteúdo administrativo
        </div>
      }>
        <div style={{ color: '#059669', padding: '8px', backgroundColor: '#ecfdf5', borderRadius: '4px' }}>
          ✅ Sucesso! Você é admin ou owner e pode ver conteúdo administrativo
        </div>
      </AdminOnly>

      <br />

      {/* Teste OwnerOnly */}
      <OwnerOnly fallback={
        <div style={{ color: '#dc2626', padding: '8px', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
          ❌ Você precisa ser owner para ver conteúdo exclusivo
        </div>
      }>
        <div style={{ color: '#7c3aed', padding: '8px', backgroundColor: '#f3e8ff', borderRadius: '4px' }}>
          ✅ Sucesso! Você é owner e pode ver conteúdo exclusivo do proprietário
        </div>
      </OwnerOnly>
    </div>
  )
}