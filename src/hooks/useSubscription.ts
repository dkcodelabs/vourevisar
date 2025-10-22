// =====================================================
// HOOK PARA GERENCIAR ASSINATURAS
// =====================================================
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { User } from '@supabase/supabase-js'

export type SubscriptionPlan = 'free_trial' | 'monthly' | 'annual'
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled' | 'suspended'

interface SubscriptionInfo {
  user_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  is_active: boolean
  days_remaining: number
  trial_ends_at: string | null
  subscription_ends_at: string | null
  created_at: string
  updated_at: string
}

interface UseSubscriptionReturn {
  subscription: SubscriptionInfo | null
  loading: boolean
  error: string | null
  isActive: boolean
  isTrial: boolean
  isPaid: boolean
  isExpired: boolean
  daysRemaining: number
  planName: string
  hasActiveSubscription: boolean
  refetch: () => Promise<void>
  startPaidSubscription: (plan: SubscriptionPlan) => Promise<boolean>
  cancelSubscription: (immediate?: boolean) => Promise<boolean>
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Verificar se usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSubscription(null)
        return
      }

      // Buscar informações da assinatura
      const { data, error: subscriptionError } = await (supabase as any)
        .rpc('get_subscription_info')

      if (subscriptionError) {
        throw subscriptionError
      }

      setSubscription(data)
    } catch (err) {
      console.error('Error fetching subscription:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar assinatura')
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const startPaidSubscription = useCallback(async (plan: SubscriptionPlan): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const duration = plan === 'annual' ? 12 : 1

      const { data, error } = await (supabase as any)
        .rpc('start_paid_subscription', {
          target_user_id: user.id,
          new_plan: plan,
          duration_months: duration
        })

      if (error) throw error

      await fetchSubscription()
      return true
    } catch (err) {
      console.error('Error starting subscription:', err)
      setError(err instanceof Error ? err.message : 'Erro ao iniciar assinatura')
      return false
    }
  }, [fetchSubscription])

  const cancelSubscription = useCallback(async (immediate = false): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await (supabase as any)
        .rpc('cancel_subscription', {
          target_user_id: user.id,
          immediate
        })

      if (error) throw error

      await fetchSubscription()
      return true
    } catch (err) {
      console.error('Error canceling subscription:', err)
      setError(err instanceof Error ? err.message : 'Erro ao cancelar assinatura')
      return false
    }
  }, [fetchSubscription])

  useEffect(() => {
    fetchSubscription()

    // Escutar mudanças de autenticação
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          fetchSubscription()
        }
      }
    )

    return () => authSubscription.unsubscribe()
  }, [fetchSubscription])

  // Computed values
  const isActive = subscription?.is_active ?? false
  const isTrial = subscription?.status === 'trial'
  const isPaid = subscription?.status === 'active' && subscription?.plan !== 'free_trial'
  const isExpired = subscription?.status === 'expired'
  const daysRemaining = subscription?.days_remaining ?? 0

  const planName = subscription?.plan === 'free_trial' 
    ? 'Teste Grátis'
    : subscription?.plan === 'monthly'
    ? 'Plano Mensal'
    : subscription?.plan === 'annual'
    ? 'Plano Anual'
    : 'Sem Plano'

  return {
    subscription,
    loading,
    error,
    isActive,
    isTrial,
    isPaid,
    isExpired,
    daysRemaining,
    planName,
    hasActiveSubscription: isActive, // Alias para compatibilidade
    refetch: fetchSubscription,
    startPaidSubscription,
    cancelSubscription
  }
}