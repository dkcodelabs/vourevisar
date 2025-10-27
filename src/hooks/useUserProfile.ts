// =====================================================
// HOOK INTEGRADO - ROLE + ASSINATURA
// =====================================================
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

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
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Verificar se está autenticado
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setProfile(null)
        return
      }

      console.log('Fetching profile for user:', user.id)

      // Buscar role do usuário
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Role error:', roleError)
      }

      // Buscar informações da assinatura
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .rpc('get_subscription_info', { check_user_id: user.id })

      if (subscriptionError) {
        console.error('Subscription error:', subscriptionError)
      }

      // Buscar perfil básico
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile error:', profileError)
      }

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email || '',
        name: profileData?.name || user.email?.split('@')[0] || 'Usuário',
        avatar_url: profileData?.avatar_url || null,
        role: roleData?.role || 'user',
        subscription: subscriptionData && typeof subscriptionData === 'object' && !Array.isArray(subscriptionData) && !('error' in subscriptionData) 
          ? subscriptionData as UserProfile['subscription']
          : null
      }

      console.log('Complete profile:', userProfile)
      setProfile(userProfile)

    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }, [refreshTrigger])

  const forceRefresh = useCallback(() => {
    console.log('Force refreshing profile...')
    setRefreshTrigger(prev => prev + 1)
  }, [])

  const refetch = useCallback(async () => {
    await fetchProfile()
  }, [fetchProfile])

  // Buscar na montagem
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Escutar mudanças de auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('Auth state changed:', event)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        forceRefresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [forceRefresh])

  // Escutar mudanças nas tabelas e eventos customizados
  useEffect(() => {
    if (!profile?.id) return

    console.log('Setting up real-time listeners for user:', profile.id)

    // Listener para mudanças de role
    const roleSubscription = supabase
      .channel('role_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('Role changed:', payload)
          forceRefresh()
        }
      )
      .subscribe()

    // Listener para mudanças de assinatura
    const subscriptionSubscription = supabase
      .channel('subscription_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('Subscription changed:', payload)
          forceRefresh()
        }
      )
      .subscribe()

    // Listener para eventos customizados (quando admin altera assinatura)
    const handleSubscriptionChange = (event: CustomEvent) => {
      console.log('Custom subscription change event:', event.detail)
      if (event.detail?.userId === profile.id) {
        setTimeout(() => forceRefresh(), 500)
      }
    }

    window.addEventListener('subscription-changed', handleSubscriptionChange as EventListener)

    return () => {
      supabase.removeChannel(roleSubscription)
      supabase.removeChannel(subscriptionSubscription)
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