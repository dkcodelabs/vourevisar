// =====================================================
// MENU GERENCIAMENTO - SÓ APARECE PARA ADMINS/OWNERS
// =====================================================
import React from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { AdminOnly, OwnerOnly } from '@/components/ProtectedComponent'
import { ProtectedButton } from '@/components/RoleBasedUI'

export default function GerenciamentoMenu() {
  const { isAdmin, loading } = useUserRole()

  // Se não for admin, não mostra nada
  if (loading || !isAdmin) {
    return null
  }

  return (
    <div className="gerenciamento-menu">
      {/* Título do Menu */}
      <div style={{
        padding: '12px 16px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        fontWeight: '600',
        color: '#1e293b',
        fontSize: '14px'
      }}>
        ⚙️ Gerenciamento
      </div>

      {/* Itens do Menu para Admins */}
      <AdminOnly>
        <div style={{ padding: '8px 0' }}>
          <MenuItem
            icon="👥"
            label="Gerenciar Usuários"
            onClick={() => window.location.href = '/admin/usuarios'}
            requiredRole="admin"
          />
          
          <MenuItem
            icon="📊"
            label="Relatórios"
            onClick={() => window.location.href = '/admin/relatorios'}
            requiredRole="admin"
          />
          
          <MenuItem
            icon="🔧"
            label="Configurações"
            onClick={() => window.location.href = '/admin/configuracoes'}
            requiredRole="admin"
          />
        </div>
      </AdminOnly>

      {/* Separador */}
      <OwnerOnly>
        <div style={{
          height: '1px',
          background: '#e2e8f0',
          margin: '8px 16px'
        }} />
      </OwnerOnly>

      {/* Itens EXCLUSIVOS para Owners */}
      <OwnerOnly>
        <div style={{ padding: '8px 0' }}>
          <div style={{
            padding: '8px 16px',
            fontSize: '12px',
            color: '#7c3aed',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            👑 Proprietário
          </div>
          
          <MenuItem
            icon="🔑"
            label="Gerenciar Roles"
            onClick={() => window.location.href = '/owner/roles'}
            requiredRole="owner"
            isOwnerOnly={true}
          />
          
          <MenuItem
            icon="⚙️"
            label="Sistema"
            onClick={() => window.location.href = '/owner/sistema'}
            requiredRole="owner"
            isOwnerOnly={true}
          />
          
          <MenuItem
            icon="🗄️"
            label="Backup"
            onClick={() => window.location.href = '/owner/backup'}
            requiredRole="owner"
            isOwnerOnly={true}
          />
        </div>
      </OwnerOnly>
    </div>
  )
}

// Componente para cada item do menu
interface MenuItemProps {
  icon: string
  label: string
  onClick: () => void
  requiredRole: 'admin' | 'owner'
  isOwnerOnly?: boolean
}

function MenuItem({ icon, label, onClick, requiredRole, isOwnerOnly = false }: MenuItemProps) {
  return (
    <ProtectedButton
      requiredRole={requiredRole}
      orHigher={!isOwnerOnly}
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '14px',
        color: isOwnerOnly ? '#7c3aed' : '#374151',
        transition: 'background-color 0.2s'
      }}
      className="menu-item"
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span>{label}</span>
    </ProtectedButton>
  )
}