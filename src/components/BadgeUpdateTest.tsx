// =====================================================
// TESTE DE ATUALIZAÇÃO DO BADGE
// =====================================================
import { useState } from 'react'
import { UserBadge } from './UserBadge'
import { useUserProfile } from '@/hooks/useUserProfile'
import { Button } from "@/components/ui/button"

export function BadgeUpdateTest() {
  const [updateCount, setUpdateCount] = useState(0)
  const profile = useUserProfile()

  const forceUpdate = () => {
    console.log('🧪 Forcing badge update test...')
    
    // Disparar eventos de atualização
    window.dispatchEvent(new CustomEvent('force-profile-refresh', { 
      detail: { forceAll: true, timestamp: Date.now() } 
    }))
    
    setUpdateCount(prev => prev + 1)
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
      <h3 className="font-bold">🧪 Teste de Atualização do Badge</h3>
      
      <div className="flex items-center gap-4">
        <span>Badge Atual:</span>
        <UserBadge />
      </div>
      
      <div className="text-sm space-y-1">
        <div><strong>Loading:</strong> {profile.loading ? 'Sim' : 'Não'}</div>
        <div><strong>Display Badge:</strong> {profile.displayBadge}</div>
        <div><strong>Badge Color:</strong> {profile.badgeColor}</div>
        <div><strong>Updates:</strong> {updateCount}</div>
        <div><strong>Subscription Status:</strong> {profile.profile?.subscription?.status || 'N/A'}</div>
        <div><strong>Subscription Plan:</strong> {profile.profile?.subscription?.plan || 'N/A'}</div>
      </div>
      
      <div className="flex gap-2">
        <Button onClick={forceUpdate} size="sm">
          🔄 Forçar Atualização
        </Button>
        <Button 
          onClick={() => {
            console.log('📊 Current profile state:', profile)
          }} 
          size="sm" 
          variant="outline"
        >
          🔍 Debug Profile
        </Button>
      </div>
    </div>
  )
}