// =====================================================
// HOOK PARA GERENCIAR ASSINATURAS
// =====================================================
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { getSubscriptionEntitlement } from '@/utils/subscriptionEntitlement'
import { withTimeout } from '@/utils/withTimeout'

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
  hasSubscriptionRecord: boolean
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
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [hasSubscriptionRecord, setHasSubscriptionRecord] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setSubscription(null)
        setHasSubscriptionRecord(false)
        return
      }

      // Log removido para otimização

      // Buscar diretamente da tabela para garantir dados atualizados
      const { data: subscriptionData, error: directError } = await withTimeout(
        supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        10000,
        'Não foi possível confirmar sua assinatura. Tente novamente.',
      )

      if (directError) throw directError

      // Verificar se o usuário possui a role de admin ou owner ou se é email protegido
      const { data: rolesData } = await withTimeout(
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id),
        10000,
        'Não foi possível confirmar suas permissões. Tente novamente.',
      )

      const isOwnerOrAdmin = user.email === 'vourevisar@gmail.com' || 
                             user.email === 'darciliok@gmail.com' || 
                             (rolesData && rolesData.some(r => r.role === 'owner' || r.role === 'admin'));

      if (isOwnerOrAdmin) {
        setHasSubscriptionRecord(Boolean(subscriptionData))
        setSubscription({
          user_id: user.id,
          plan: 'annual',
          status: 'active',
          is_active: true,
          days_remaining: 99999,
          trial_ends_at: null,
          subscription_ends_at: null,
          created_at: subscriptionData?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        return
      }

      // Log removido para otimização

      if (!subscriptionData) {
        setHasSubscriptionRecord(false)
        // Usuário sem assinatura
        setSubscription({
          user_id: user.id,
          plan: 'free_trial',
          status: 'expired',
          is_active: false,
          days_remaining: 0,
          trial_ends_at: null,
          subscription_ends_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        return
      }

      // Aplicar a mesma regra efetiva usada pelo menu e pela conta.
      setHasSubscriptionRecord(true)
      const entitlement = getSubscriptionEntitlement({
        plan: subscriptionData.plan,
        status: subscriptionData.status,
        trialEndsAt: subscriptionData.trial_ends_at,
        subscriptionEndsAt: subscriptionData.subscription_ends_at,
        nextBillingAt: subscriptionData.next_billing_date,
        manualAccessUntil: subscriptionData.manual_access_until,
        manualAccessPlan: subscriptionData.manual_access_plan,
      })

      const processedSubscription = {
        ...subscriptionData,
        plan: entitlement.plan,
        status: entitlement.status,
        is_active: entitlement.isActive,
        days_remaining: entitlement.daysRemaining,
      }

      // Log removido para otimização
      setSubscription(processedSubscription)
    } catch (err) {
      console.error('Error fetching subscription:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar assinatura')
    } finally {
      setLoading(false)
    }
  }, [user])

  const startPaidSubscription = useCallback(async (plan: SubscriptionPlan): Promise<boolean> => {
    try {
      if (!user) throw new Error('Usuário não autenticado')

      const duration = plan === 'annual' ? 12 : 1

      const { data, error } = await supabase
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
  }, [fetchSubscription, user])

  const cancelSubscription = useCallback(async (immediate = false): Promise<boolean> => {
    try {
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
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
  }, [fetchSubscription, user])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  // Computed values
  const isActive = subscription?.is_active ?? false
  const isTrial = isActive && subscription?.status === 'trial'
  const isPaid = isActive && subscription?.status === 'active' && subscription?.plan !== 'free_trial'
  const isExpired = !isActive
  const daysRemaining = subscription?.days_remaining ?? 0

  const planName = !isActive && !isTrial
    ? 'Free'
    : subscription?.plan === 'free_trial'
    ? 'Teste Grátis'
    : subscription?.plan === 'monthly'
    ? 'Plano Mensal'
    : subscription?.plan === 'annual'
    ? 'Plano Anual'
    : 'Sem Plano'

  return {
    subscription,
    hasSubscriptionRecord,
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
