// =====================================================
// HOOK COMBINADO - ROLES + ASSINATURAS
// =====================================================
import { useCallback } from 'react'
import { useUserRole } from './useUserRole'
import { useSubscription } from './useSubscription'

export function useUserAccess() {
  const roleData = useUserRole()
  const subscriptionData = useSubscription()
  const { refetch: refetchRoles } = roleData
  const { refetch: refetchSubscription } = subscriptionData

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchRoles(),
      refetchSubscription()
    ])
  }, [refetchRoles, refetchSubscription])

  // Combinar loading states
  const loading = roleData.loading || subscriptionData.loading

  // Falha ao buscar role não deve deixar usuário comum em limbo.
  // A assinatura continua sendo a fonte de acesso para rotas pagas.
  const error = subscriptionData.error

  // Verificações de acesso
  const hasFullAccess = () => {
    // Owners e admins sempre têm acesso
    if (roleData.isOwner || roleData.isAdmin) return true
    
    // Usuários normais precisam de assinatura ativa
    return subscriptionData.isActive
  }

  const canAccessPremiumFeatures = () => {
    // Owners e admins sempre podem
    if (roleData.isOwner || roleData.isAdmin) return true
    
    // Usuários normais precisam de assinatura paga (não trial)
    return subscriptionData.isPaid
  }

  const canManageUsers = () => {
    // Apenas admins e owners
    return roleData.isAdmin || roleData.isOwner
  }

  const getAccessLevel = () => {
    if (roleData.isOwner) return 'owner'
    if (roleData.isAdmin) return 'admin'
    if (roleData.isModerator) return 'moderator'
    if (subscriptionData.isPaid) return 'paid'
    if (subscriptionData.isTrial) return 'trial'
    return 'none'
  }

  const getAccessMessage = () => {
    if (roleData.isOwner) return 'Acesso total como proprietário'
    if (roleData.isAdmin) return 'Acesso administrativo'
    if (roleData.isModerator) return 'Acesso de moderador'
    if (subscriptionData.isPaid) return `Assinante ${subscriptionData.planName}`
    if (subscriptionData.isTrial) return `Trial - ${subscriptionData.daysRemaining} dias restantes`
    if (subscriptionData.isExpired) return 'Assinatura expirada'
    return 'Sem acesso'
  }

  return {
    // Estados
    loading,
    error,
    
    // Dados originais
    roles: roleData,
    subscription: subscriptionData,
    
    // Verificações combinadas
    hasFullAccess: hasFullAccess(),
    canAccessPremiumFeatures: canAccessPremiumFeatures(),
    canManageUsers: canManageUsers(),
    
    // Informações
    accessLevel: getAccessLevel(),
    accessMessage: getAccessMessage(),
    
    // Funções
    refetch
  }
}
