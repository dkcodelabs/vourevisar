// =====================================================
// EXEMPLO DE BARRA SUPERIOR COM BADGE INTEGRADO
// =====================================================
import React from 'react'
import { CompactUserBadge, DetailedUserInfo } from '@/components/UserBadge'
import { useUserProfile } from '@/hooks/useUserProfile'

// Exemplo simples para barra superior
export function TopBarWithBadge() {
  const { profile, loading } = useUserProfile()

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-white border-b">
        <div className="animate-pulse bg-gray-200 rounded w-16 h-6"></div>
        <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center gap-3">
        <span className="font-medium">Vou</span>
        <CompactUserBadge />
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{profile?.name || 'Usuário'}</span>
        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {profile?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </div>
  )
}

// Exemplo para dropdown de usuário
export function UserDropdownExample() {
  return (
    <div className="w-80 bg-white border rounded-lg shadow-lg p-4">
      <DetailedUserInfo />
      
      <div className="mt-4 pt-4 border-t space-y-2">
        <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded">
          👤 Perfil
        </button>
        <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded">
          ⚙️ Configurações
        </button>
        <button className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-red-600">
          🚪 Sair
        </button>
      </div>
    </div>
  )
}