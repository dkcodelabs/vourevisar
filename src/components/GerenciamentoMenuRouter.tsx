// =====================================================
// MENU GERENCIAMENTO COM REACT ROUTER
// =====================================================
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserRole } from '@/hooks/useUserRole'
import { AdminOnly, OwnerOnly } from '@/components/ProtectedComponent'
import { ProtectedButton } from '@/components/RoleBasedUI'

export default function GerenciamentoMenuRouter() {
  const { isAdmin, loading } = useUserRole()
  const navigate = useNavigate()

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
          <MenuItemRouter
            icon="👥"
            label="Gerenciar Usuários"
            onClick={() => navigate('/admin/usuarios')}
            requiredRole="admin"
          />
          
          <MenuItemRouter
            icon="📊"
            label="Relatórios"
            onClick={() => navigate('/admin/relatorios')}
            requiredRole="admin"
          />
          
          <MenuItemRouter
            icon="🔧"
            label="Configurações"
            onClick={() => navigate('/admin/configuracoes')}
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
          
          <MenuItemRouter
            icon="🔑"
            label="Gerenciar Roles"
            onClick={() => navigate('/owner/roles')}
            requiredRole="owner"
            isOwnerOnly={true}
          />
          
          <MenuItemRouter
            icon="⚙️"
            label="Sistema"
            onClick={() => navigate('/owner/sistema')}
            requiredRole="owner"
            isOwnerOnly={true}
          />
          
          <MenuItemRouter
            icon="🗄️"
            label="Backup"
            onClick={() => navigate('/owner/backup')}
            requiredRole="owner"
            isOwnerOnly={true}
          />
        </div>
      </OwnerOnly>
    </div>
  )
}

// Componente para cada item do menu com React Router
interface MenuItemRouterProps {
  icon: string
  label: string
  onClick: () => void
  requiredRole: 'admin' | 'owner'
  isOwnerOnly?: boolean
}

function MenuItemRouter({ icon, label, onClick, requiredRole, isOwnerOnly = false }: MenuItemRouterProps) {
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