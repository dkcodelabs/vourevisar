// =====================================================
// HOOK PERSONALIZADO PARA INFORMAÇÕES DE ASSINATURA
// =====================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { invokeUserRpc } from '@/services/userRpcService'
import { useAuth } from '@/contexts/AuthContext'

interface SubscriptionInfo {
  user_id: string
  plan: 'free_trial' | 'monthly' | 'annual'
  status: 'trial' | 'active' | 'expired' | 'canceled' | 'suspended'
  is_active: boolean
  days_remaining: number | null
  billing_type: string | null
  next_billing_date: string | null
  last_payment_at: string | null
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

const calculateDaysRemaining = (dateString?: string | null) => {
  if (!dateString) return 0;

  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return 0;

  const now = new Date();
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
};

export function useSubscriptionInfo(): UseSubscriptionInfoReturn {
  const { user } = useAuth()
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const channelInstanceId = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  )

  const fetchSubscriptionInfo = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setSubscriptionInfo(null)
        return
      }

      // Log removido para otimização

      // Chamar a fronteira segura para obter informações da assinatura
      const dataPromise = invokeUserRpc<SubscriptionInfo | { error?: string } | null>('get_subscription_info', {
        check_user_id: user.id,
      }).catch((error: unknown) => ({
        error: error instanceof Error ? error.message : 'Erro ao carregar informações da assinatura',
      }))
      const localSubscriptionPromise = supabase
        .from('user_subscriptions')
        .select('plan, status, billing_type, next_billing_date, last_payment_at, trial_started_at, trial_ends_at, subscription_started_at, subscription_ends_at, created_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle()

      // Verificar se o usuário possui a role de admin ou owner ou se é email protegido
      const rolesPromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      const [data, localSubscriptionResult, rolesResult] = await Promise.all([
        dataPromise,
        localSubscriptionPromise,
        rolesPromise,
      ])

      // Log removido para otimização

      // Se a resposta contém erro
      if (data && typeof data === 'object' && 'error' in data) {
        throw new Error(String(data.error))
      }

      const rpcSubscription = data as unknown as SubscriptionInfo | null;
      const localSubscription = localSubscriptionResult.data;
      const rolesData = rolesResult.data;

      if (localSubscription) {
        const dueDate =
          localSubscription.status === 'trial'
            ? localSubscription.trial_ends_at
            : localSubscription.next_billing_date || localSubscription.subscription_ends_at;
        const daysRemaining = calculateDaysRemaining(dueDate);
        const isRecurringPaid = localSubscription.status === 'active' && localSubscription.plan !== 'free_trial';

        setSubscriptionInfo({
          user_id: user.id,
          plan: localSubscription.plan,
          status: localSubscription.status,
          is_active: isRecurringPaid || daysRemaining > 0,
          days_remaining: isRecurringPaid && daysRemaining === 0 ? null : daysRemaining,
          billing_type: localSubscription.billing_type,
          next_billing_date: localSubscription.next_billing_date,
          last_payment_at: localSubscription.last_payment_at,
          trial_started_at: localSubscription.trial_started_at,
          trial_ends_at: localSubscription.trial_ends_at,
          subscription_started_at: localSubscription.subscription_started_at,
          subscription_ends_at: localSubscription.subscription_ends_at,
          created_at: localSubscription.created_at,
          updated_at: localSubscription.updated_at,
        });
        return;
      }

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
          billing_type: null,
          next_billing_date: null,
          last_payment_at: null,
          trial_started_at: null,
          trial_ends_at: null,
          subscription_started_at: new Date().toISOString(),
          subscription_ends_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        return
      }

      setSubscriptionInfo(rpcSubscription)
    } catch (err) {
      console.error('Error fetching subscription info:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar informações da assinatura')
    } finally {
      setLoading(false)
    }
  }, [user])

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
    let channel: ReturnType<typeof supabase.channel> | null = null
    
    const setupListener = () => {
      if (!user || !isMounted) return

      // Log removido para otimização

      channel = supabase
        .channel(`subscription_changes:${user.id}:${channelInstanceId.current}`)
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
    }
    
    setupListener()

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [forceRefresh, user])

  return {
    subscriptionInfo,
    loading,
    error,
    refetch,
    forceRefresh
  }
}
