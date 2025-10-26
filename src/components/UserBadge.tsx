// =====================================================
// BADGE DE USUÁRIO INTEGRADO - ROLE + ASSINATURA
// =====================================================
import React from 'react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { Badge } from "@/components/ui/badge"
import { Crown, Shield, Users, User, UserCheck, Clock } from 'lucide-react'

interface UserBadgeProps {
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'compact'
}

export function UserBadge({ showIcon = true, size = 'md', variant = 'default' }: UserBadgeProps) {
  const { profile, loading, displayBadge, badgeColor, isOwner, isAdmin, isModerator, isPaidUser, isTrialUser } = useUserProfile()

  if (loading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        <Clock className="w-3 h-3 mr-1" />
        Carregando...
      </Badge>
    )
  }

  if (!profile) {
    return (
      <Badge variant="secondary">
        <User className="w-3 h-3 mr-1" />
        Não logado
      </Badge>
    )
  }

  // Escolher ícone baseado no tipo
  const getIcon = () => {
    if (!showIcon) return null
    
    if (isOwner) return <Crown className="w-3 h-3 mr-1" />
    if (isAdmin) return <Shield className="w-3 h-3 mr-1" />
    if (isModerator) return <Users className="w-3 h-3 mr-1" />
    if (isPaidUser) return <UserCheck className="w-3 h-3 mr-1" />
    if (isTrialUser) return <User className="w-3 h-3 mr-1" />
    return <User className="w-3 h-3 mr-1" />
  }

  // Escolher classe CSS baseado na cor
  const getColorClass = () => {
    switch (badgeColor) {
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
      case 'gray':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
    }
  }

  // Tamanho do badge
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1'
      case 'lg':
        return 'text-sm px-3 py-2'
      case 'md':
      default:
        return 'text-xs px-2.5 py-1.5'
    }
  }

  return (
    <Badge 
      className={`${getColorClass()} ${getSizeClass()} font-medium border transition-colors`}
      variant="outline"
    >
      {getIcon()}
      {displayBadge}
    </Badge>
  )
}

// Componente compacto para usar na barra superior
export function CompactUserBadge() {
  return <UserBadge size="sm" variant="compact" />
}

// Componente para mostrar informações completas
export function DetailedUserInfo() {
  const { profile, loading, error, displayBadge, hasActiveSubscription } = useUserProfile()

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-pulse bg-gray-200 rounded-full w-8 h-8"></div>
        <div className="animate-pulse bg-gray-200 rounded w-20 h-4"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Erro: {error}
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-gray-500 text-sm">
        Não logado
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{profile.name}</div>
        <div className="text-sm text-gray-500">{profile.email}</div>
      </div>
      <UserBadge />
      {hasActiveSubscription && profile.subscription?.subscription_ends_at && (
        <div className="text-xs text-gray-400">
          Expira: {new Date(profile.subscription.subscription_ends_at).toLocaleDateString('pt-BR')}
        </div>
      )}
    </div>
  )
}