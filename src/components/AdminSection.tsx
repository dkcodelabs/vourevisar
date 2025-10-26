// =====================================================
// SEÇÃO ADMINISTRATIVA - ADICIONE EM QUALQUER PÁGINA
// =====================================================
import React from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { OwnerOnly, AdminOnly } from '@/components/ProtectedComponent'
import { UserRoleBadge, ProtectedButton } from '@/components/RoleBasedUI'

export default function AdminSection() {
  const { user, isOwner, isAdmin, loading } = useUserRole()

  if (loading) {
    return (
      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', margin: '16px 0' }}>
        <p>⏳ Carregando permissões...</p>
      </div>
    )
  }

  if (!user) {
    return null // Não mostra nada se não estiver logado
  }

  return (
    <div style={{ 
      border: '1px solid #e2e8f0', 
      borderRadius: '8px', 
      padding: '16px', 
      margin: '16px 0',
      background: '#ffffff'
    }}>
      {/* Header com informações do usuário */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>
            👤 {user.email}
          </h3>
          <UserRoleBadge />
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          Sistema de Roles Ativo ✅
        </div>
      </div>

      {/* Seção para Admins */}
      <AdminOnly>
        <div style={{ 
          background: '#f0f9ff', 
          border: '1px solid #0ea5e9',
          borderRadius: '6px', 
          padding: '12px',
          marginBottom: '12px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#0c4a6e' }}>
            🛡️ Painel Administrativo
          </h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#075985' }}>
            Você tem acesso às funções administrativas do sistema.
          </p>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <ProtectedButton
              requiredRole="admin"
              orHigher={true}
              onClick={() => alert('🔧 Função: Gerenciar Usuários')}
              className="btn-admin"
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              👥 Gerenciar Usuários
            </ProtectedButton>
            
            <ProtectedButton
              requiredRole="admin"
              orHigher={true}
              onClick={() => alert('📊 Função: Ver Relatórios')}
              style={{
                background: '#059669',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📊 Relatórios
            </ProtectedButton>
          </div>
        </div>
      </AdminOnly>

      {/* Seção EXCLUSIVA para Owners */}
      <OwnerOnly>
        <div style={{ 
          background: '#faf5ff', 
          border: '1px solid #a855f7',
          borderRadius: '6px', 
          padding: '12px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#581c87' }}>
            👑 Painel do Proprietário
          </h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#7c3aed' }}>
            Controle total do sistema. Apenas você vê esta seção.
          </p>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <ProtectedButton
              requiredRole="owner"
              onClick={() => alert('⚙️ Função: Configurações do Sistema')}
              style={{
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ⚙️ Configurações
            </ProtectedButton>
            
            <ProtectedButton
              requiredRole="owner"
              onClick={() => alert('🔑 Função: Gerenciar Roles')}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔑 Gerenciar Roles
            </ProtectedButton>
          </div>
        </div>
      </OwnerOnly>

      {/* Informações de Debug (remova em produção) */}
      <details style={{ marginTop: '12px' }}>
        <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#64748b' }}>
          🔍 Debug Info (clique para expandir)
        </summary>
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          background: '#f1f5f9', 
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <p>User ID: {user.id}</p>
          <p>É Admin: {isAdmin ? 'SIM' : 'NÃO'}</p>
          <p>É Owner: {isOwner ? 'SIM' : 'NÃO'}</p>
          <p>Sistema: ✅ Funcionando</p>
        </div>
      </details>
    </div>
  )
}