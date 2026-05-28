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
  trial_started_at: string | null
  trial_ends_at: string | null
  subscription_started_at: string | null
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

      // Log removido para otimização

      // Chamar a função RPC para obter informações da assinatura
      const { data, error: rpcError } = await supabase
        .rpc('get_subscription_info', { check_user_id: user.id })

      // Verificar se o usuário possui a role de admin ou owner ou se é email protegido
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      const isOwnerOrAdmin = user.email === 'vourevisar@gmail.com' || 
                             user.email === 'darciliok@gmail.com' || 
                             (rolesData && rolesData.some(r => r.role === 'owner' || r.role === 'admin'));

      if (isOwnerOrAdmin) {
        setSubscriptionInfo({
          user_id: user.id,
          plan: 'annual',
          status: 'active',
          is_active: true,
          days_remaining: 99999,
          trial_started_at: null,
          trial_ends_at: null,
          subscription_started_at: new Date().toISOString(),
          subscription_ends_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        return
      }

      if (rpcError) {
        console.error('RPC Error:', rpcError)
        throw rpcError
      }

      // Log removido para otimização

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
  }, [])

  // Função para forçar atualização
  const forceRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // Função para refetch manual
  const refetch = useCallback(async () => {
    await fetchSubscriptionInfo()
  }, [fetchSubscriptionInfo])

  // Buscar informações na montagem e quando refreshTrigger mudar
  useEffect(() => {
    fetchSubscriptionInfo()
  }, [fetchSubscriptionInfo, refreshTrigger])

  // Escutar mudanças de autenticação
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Log removido para otimização
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

      // Log removido para otimização

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
          () => {
            forceRefresh()
          }
        )
        .subscribe()

      return () => {
        isMounted = false
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