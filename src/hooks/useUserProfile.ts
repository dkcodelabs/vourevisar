// =====================================================
// HOOK INTEGRADO - ROLE + ASSINATURA
// =====================================================
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { invokeUserRpc } from '@/services/userRpcService'
import { useAuth } from '@/contexts/AuthContext'

interface UserProfile {
  id: string
  email: string
  name: string | null
  avatar_url?: string | null
  role: 'owner' | 'admin' | 'moderator' | 'user'
  subscription: {
    plan: 'free_trial' | 'monthly' | 'annual'
    status: 'trial' | 'active' | 'expired' | 'canceled' | 'suspended'
    is_active: boolean
    days_remaining: number | null
    trial_ends_at: string | null
    subscription_ends_at: string | null
  } | null
}

interface UseUserProfileReturn {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  forceRefresh: () => void

  // Helpers para role
  isOwner: boolean
  isAdmin: boolean
  isModerator: boolean
  isUser: boolean

  // Helpers para assinatura
  hasActiveSubscription: boolean
  isPaidUser: boolean
  isTrialUser: boolean

  // Badge display
  displayBadge: string
  badgeColor: string
}

export function useUserProfile(): UseUserProfileReturn {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      // 2. Executar consultas em PARALELO (Otimização de Performance)
      const [roleResult, subscriptionResult, profileResult] = await Promise.all([
        // Consulta 1: Roles
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle(),

        // Consulta 2: Assinatura via Edge Function, sem expor RPC SECURITY DEFINER no REST
        invokeUserRpc<UserProfile['subscription'] | { error?: string } | null>('get_subscription_info', {
          check_user_id: user.id,
        }),

        // Consulta 3: Perfil (Avatar + Nome)
        supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', user.id)
          .maybeSingle()
      ])

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email || '',
        name: profileResult.data?.name || user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
        avatar_url: profileResult.data?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        role: roleResult.data?.role || 'user',
        subscription: subscriptionResult && typeof subscriptionResult === 'object' && !Array.isArray(subscriptionResult) && !('error' in subscriptionResult)
          ? subscriptionResult as UserProfile['subscription']
          : null
      }

      setProfile(userProfile)

    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }, [user])

  const forceRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  const refetch = useCallback(async () => {
    await fetchProfile()
  }, [fetchProfile])

  // Buscar na montagem e quando forçar refresh
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile, refreshTrigger])

  // Escutar mudanças nas tabelas e eventos customizados
  useEffect(() => {
    if (!profile?.id) return

    // Log removido para otimização

    let userChannel: ReturnType<typeof supabase.channel> | null = null

    try {
      const channelId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(36).slice(2)}`

      userChannel = supabase
        .channel(`user_data_${profile.id}_${channelId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_roles',
            filter: `user_id=eq.${profile.id}`
          },
          () => forceRefresh()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_subscriptions',
            filter: `user_id=eq.${profile.id}`
          },
          () => forceRefresh()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${profile.id}`
          },
          () => forceRefresh()
        )
        .subscribe()
    } catch (err) {
      console.error('Error subscribing to user profile changes:', err)
    }

    // Listener para eventos customizados (otimizado)
    const handleSubscriptionChange = (event: CustomEvent) => {
      if (event.detail?.userId === profile.id) {
        setTimeout(() => forceRefresh(), 500)
      }
    }

    window.addEventListener('subscription-changed', handleSubscriptionChange as EventListener)

    return () => {
      if (userChannel) {
        supabase.removeChannel(userChannel)
      }
      window.removeEventListener('subscription-changed', handleSubscriptionChange as EventListener)
    }
  }, [profile?.id, forceRefresh])

  // Computed values
  const isOwner = profile?.role === 'owner'
  const isAdmin = profile?.role === 'admin' || isOwner
  const isModerator = profile?.role === 'moderator' || isAdmin
  const isUser = profile?.role === 'user'

  const hasActiveSubscription = profile?.subscription?.is_active || false
  const isPaidUser = hasActiveSubscription && profile?.subscription?.plan !== 'free_trial'
  const isTrialUser = hasActiveSubscription && profile?.subscription?.plan === 'free_trial'

  // Badge display logic
  let displayBadge = 'Free'
  let badgeColor = 'gray'

  if (profile) {
    // Prioridade: Role administrativo > Assinatura paga > Trial > Free
    if (isOwner) {
      displayBadge = 'Proprietário'
      badgeColor = 'purple'
    } else if (profile.role === 'admin') {
      displayBadge = 'Administrador'
      badgeColor = 'blue'
    } else if (profile.role === 'moderator') {
      displayBadge = 'Moderador'
      badgeColor = 'green'
    } else if (isPaidUser) {
      if (profile.subscription?.plan === 'annual') {
        displayBadge = 'Anual'
        badgeColor = 'purple'
      } else if (profile.subscription?.plan === 'monthly') {
        displayBadge = 'Mensal'
        badgeColor = 'blue'
      }
    } else if (isTrialUser) {
      const days = profile.subscription?.days_remaining || 0
      displayBadge = `Trial (${days}d)`
      badgeColor = 'yellow'
    } else {
      displayBadge = 'Free'
      badgeColor = 'gray'
    }
  }

  return {
    profile,
    loading,
    error,
    refetch,
    forceRefresh,

    // Role helpers
    isOwner,
    isAdmin,
    isModerator,
    isUser,

    // Subscription helpers
    hasActiveSubscription,
    isPaidUser,
    isTrialUser,

    // Badge display
    displayBadge,
    badgeColor
  }
}
