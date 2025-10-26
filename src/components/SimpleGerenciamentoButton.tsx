// =====================================================
// BOTÃO SIMPLES DE GERENCIAMENTO - FÁCIL DE USAR
// =====================================================
import React, { useState } from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { AdminOnly } from '@/components/ProtectedComponent'
import GerenciamentoMenu from '@/components/GerenciamentoMenu'

export default function SimpleGerenciamentoButton() {
  const { isAdmin } = useUserRole()
  const [isOpen, setIsOpen] = useState(false)

  // Se não for admin, não mostra nada
  if (!isAdmin) {
    return null
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Botão Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '10px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        ⚙️ Gerenciamento
        <span style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          fontSize: '12px'
        }}>
          ▼
        </span>
      </button>

      {/* Menu Dropdown */}
      {isOpen && (
        <>
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            marginTop: '8px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            minWidth: '250px',
            zIndex: 1000
          }}>
            <GerenciamentoMenu />
          </div>

          {/* Overlay para fechar */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  )
}