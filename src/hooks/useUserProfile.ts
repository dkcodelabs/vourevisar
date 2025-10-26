// =====================================================
// HOOK INTEGRADO - ROLE + ASSINATURA
// =====================================================
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface UserProfile {
  id: string
  email: string
  name: string | null
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
      console.log('🔄 Fetching user profile... Trigger:', refreshTrigger)

      // Verificar se está autenticado
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('❌ No authenticated user found')
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
      console.log('🔍 Calling get_subscription_info for user:', user.id)
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .rpc('get_subscription_info', { check_user_id: user.id })

      console.log('📊 Raw subscription response:', { subscriptionData, subscriptionError })

      if (subscriptionError) {
        console.error('❌ Subscription error:', subscriptionError)
      }

      // Buscar perfil básico
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile error:', profileError)
      }

      // Processar dados da assinatura
      let processedSubscription = null
      if (subscriptionData && typeof subscriptionData === 'object' && !('error' in subscriptionData)) {
        processedSubscription = subscriptionData
        console.log('✅ Subscription data processed:', processedSubscription)
      } else {
        console.log('❌ No valid subscription data:', subscriptionData)
      }

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email || '',
        name: profileData?.name || user.email?.split('@')[0] || 'Usuário',
        role: roleData?.role || 'user',
        subscription: processedSubscription
      }

      console.log('🔍 Complete profile loaded:', userProfile)
      console.log('📊 Subscription data:', subscriptionData)
      setProfile(userProfile)

    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }, [refreshTrigger])

  const forceRefresh = useCallback(() => {
    console.log('🔄 Force refreshing profile... Trigger:', refreshTrigger + 1)
    setRefreshTrigger(prev => prev + 1)
  }, [refreshTrigger])

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
          console.log('🔄 Real-time subscription changed:', payload)
          // Aguardar um pouco para garantir consistência
          setTimeout(() => {
            console.log('🎯 Refreshing profile after real-time change')
            forceRefresh()
          }, 500)
        }
      )
      .subscribe()

    // Listener para eventos customizados (quando admin altera assinatura)
    const handleSubscriptionChange = (event: CustomEvent) => {
      console.log('🔄 Custom subscription change event:', event.detail)
      if (event.detail?.userId === profile.id || event.detail?.forceAll) {
        console.log('🎯 Forcing immediate refresh for current user')
        // Aguardar um pouco para garantir que a mudança foi persistida
        setTimeout(() => {
          forceRefresh()
        }, 300)
      }
    }

    const handleForceRefresh = (event: CustomEvent) => {
      console.log('🚀 Force profile refresh event:', event.detail)
      if (event.detail?.userId === profile.id || event.detail?.forceAll) {
        console.log('🎯 Forcing refresh for current user')
        // Aguardar um pouco para garantir que a mudança foi persistida
        setTimeout(() => {
          forceRefresh()
        }, 300)
      }
    }

    window.addEventListener('subscription-changed', handleSubscriptionChange as EventListener)
    window.addEventListener('force-profile-refresh', handleForceRefresh as EventListener)

    return () => {
      supabase.removeChannel(roleSubscription)
      supabase.removeChannel(subscriptionSubscription)
      window.removeEventListener('subscription-changed', handleSubscriptionChange as EventListener)
      window.removeEventListener('force-profile-refresh', handleForceRefresh as EventListener)
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
    console.log('🏷️ Badge calculation:', {
      role: profile.role,
      isOwner,
      isAdmin,
      isModerator,
      isPaidUser,
      isTrialUser,
      hasActiveSubscription,
      subscriptionPlan: profile.subscription?.plan,
      subscriptionStatus: profile.subscription?.status,
      subscriptionActive: profile.subscription?.is_active
    })

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

    console.log('🎯 Final badge:', { displayBadge, badgeColor })
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