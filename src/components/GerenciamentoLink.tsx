// =====================================================
// LINK GERENCIAMENTO - PARA ADICIONAR NA BARRA DE MENU
// =====================================================
import React from 'react'
import { Link } from 'react-router-dom'
import { useUserRole } from '@/hooks/useUserRole'
import { AdminOnly } from '@/components/ProtectedComponent'

export default function GerenciamentoLink() {
  const { isAdmin } = useUserRole()

  // Se não for admin, não mostra o link
  if (!isAdmin) {
    return null
  }

  return (
    <AdminOnly>
      <Link 
        to="/gerenciamento"
        style={{
          color: '#64748b',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          padding: '8px 12px',
          borderRadius: '6px',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f1f5f9'
          e.currentTarget.style.color = '#1e293b'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#64748b'
        }}
      >
        ⚙️ Gerenciamento
      </Link>
    </AdminOnly>
  )
}