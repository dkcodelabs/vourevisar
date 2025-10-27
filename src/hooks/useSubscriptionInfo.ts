// =====================================================
// HOOK PERSONALIZADO PARA INFORMAÇÕES DE ASSINATURA
// =====================================================
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface SubscriptionInfo {
  user_id: string
  plan: 'free_trial' | 'monthly' | 'annual'
  status: 'trial' | 'active' | 'expired' | 'canceled' | 'suspended'
  is_active: boolean
  days_remaining: number | null
  trial_ends_at: string | null
  subscription_ends_at: string | null
  created_at: string
  updated_at: string
}

interface UseSubscriptionInfoReturn {
  subscriptionInfo: SubscriptionInfo | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  forceRefresh: () => void
}

export function useSubscriptionInfo(): UseSubscriptionInfoReturn {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchSubscriptionInfo = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Primeiro, verificar se o usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setSubscriptionInfo(null)
        return
      }

      console.log('Fetching subscription info for user:', user.id)

      // Chamar a função RPC para obter informações da assinatura
      const { data, error: rpcError } = await supabase
        .rpc('get_subscription_info', { check_user_id: user.id })

      if (rpcError) {
        console.error('RPC Error:', rpcError)
        throw rpcError
      }

      console.log('Subscription info received:', data)

      // Se a resposta contém erro
      if (data && typeof data === 'object' && 'error' in data) {
        throw new Error(String(data.error))
      }

      setSubscriptionInfo(data as unknown as SubscriptionInfo)
    } catch (err) {
      console.error('Error fetching subscription info:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar informações da assinatura')
    } finally {
      setLoading(false)
    }
  }, [refreshTrigger])

  // Função para forçar atualização
  const forceRefresh = useCallback(() => {
    console.log('Force refreshing subscription info...')
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // Função para refetch manual
  const refetch = useCallback(async () => {
    await fetchSubscriptionInfo()
  }, [fetchSubscriptionInfo])

  // Buscar informações na montagem e quando refreshTrigger mudar
  useEffect(() => {
    fetchSubscriptionInfo()
  }, [fetchSubscriptionInfo])

  // Escutar mudanças de autenticação
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        forceRefresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [forceRefresh])

  // Escutar mudanças na tabela user_subscriptions
  useEffect(() => {
    let isMounted = true
    
    const setupListener = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !isMounted) return

      console.log('Setting up subscription listener for user:', user.id)

      const subscription = supabase
        .channel('subscription_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_subscriptions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Subscription changed:', payload)
            forceRefresh()
          }
        )
        .subscribe()

      return () => {
        isMounted = false
        console.log('Unsubscribing from subscription changes')
        supabase.removeChannel(subscription)
      }
    }
    
    setupListener()
  }, [forceRefresh])

  return {
    subscriptionInfo,
    loading,
    error,
    refetch,
    forceRefresh
  }
}