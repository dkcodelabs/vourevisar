// =====================================================
// EXEMPLO DE NAVEGAÇÃO COM MENU GERENCIAMENTO
// =====================================================
import React, { useState } from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { AdminOnly } from '@/components/ProtectedComponent'
import GerenciamentoMenu from '@/components/GerenciamentoMenu'
import { UserRoleBadge } from '@/components/RoleBasedUI'

export default function NavigationWithGerenciamento() {
  const { user, isAdmin, loading } = useUserRole()
  const [isGerenciamentoOpen, setIsGerenciamentoOpen] = useState(false)

  return (
    <nav style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '0 16px',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px'
      }}>
        {/* Logo/Título */}
        <div style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#1e293b'
        }}>
          📚 Vou Revisar
        </div>

        {/* Menu Principal */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          {/* Links normais */}
          <a href="/" style={{ color: '#64748b', textDecoration: 'none' }}>
            🏠 Início
          </a>
          
          <a href="/dashboard" style={{ color: '#64748b', textDecoration: 'none' }}>
            📊 Dashboard
          </a>

          {/* Menu Gerenciamento - SÓ APARECE PARA ADMINS */}
          <AdminOnly>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsGerenciamentoOpen(!isGerenciamentoOpen)}
                style={{
                  background: isGerenciamentoOpen ? '#f1f5f9' : 'transparent',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ⚙️ Gerenciamento
                <span style={{ 
                  transform: isGerenciamentoOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}>
                  ▼
                </span>
              </button>

              {/* Dropdown do Gerenciamento */}
              {isGerenciamentoOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '8px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  minWidth: '220px',
                  zIndex: 1000
                }}>
                  <GerenciamentoMenu />
                </div>
              )}
            </div>
          </AdminOnly>

          {/* Informações do Usuário */}
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: '#f8fafc',
              borderRadius: '6px'
            }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {user.email}
              </span>
              <UserRoleBadge />
            </div>
          )}
        </div>
      </div>

      {/* Overlay para fechar dropdown */}
      {isGerenciamentoOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsGerenciamentoOpen(false)}
        />
      )}
    </nav>
  )
}