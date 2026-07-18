// =====================================================
// HOOK PARA ESTATÍSTICAS DE ASSINATURA
// =====================================================
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getSubscriptionEntitlement } from '@/utils/subscriptionEntitlement'

interface SubscriptionStats {
  freeActiveUsers: number  // Free (7d)
  monthlyUsers: number     // Mensal
  annualUsers: number      // Anual
  expiredUsers: number     // Expirados
  totalUsers: number
}

export function useSubscriptionStats() {
  const [stats, setStats] = useState<SubscriptionStats>({
    freeActiveUsers: 0,  // Free (7d)
    monthlyUsers: 0,     // Mensal
    annualUsers: 0,      // Anual
    expiredUsers: 0,     // Expirados
    totalUsers: 0
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)

      // Buscar todos os usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')


      if (profilesError) {
        console.error('❌ Profiles error:', profilesError)
        throw profilesError
      }

      // Buscar todas as assinaturas
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, plan, status, trial_ends_at, subscription_ends_at, next_billing_date')


      if (subscriptionsError) {
        console.error('❌ Subscriptions error:', subscriptionsError)
        throw subscriptionsError
      }

      const totalUsers = profiles?.length || 0
      let freeActiveUsers = 0  // Free (7d) - trials ativos
      let monthlyUsers = 0     // Mensal - assinaturas mensais ativas
      let annualUsers = 0      // Anual - assinaturas anuais ativas
      let expiredUsers = 0     // Expirados - qualquer coisa vencida

      // Buscar roles para alinhar com a visualização da tela
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')

      // Processar cada usuário
      profiles?.forEach(profile => {
        const subscription = subscriptions?.find(s => s.user_id === profile.id)
        const userRole = roles?.find(r => r.user_id === profile.id)?.role

        // Se for proprietário ou admin ignorar das contagens de planos/expirados (já que não mostram badge de plano)
        if (userRole === 'owner' || userRole === 'admin') {
          return
        }

        if (subscription) {
          const entitlement = getSubscriptionEntitlement({
            plan: subscription.plan,
            status: subscription.status,
            trialEndsAt: subscription.trial_ends_at,
            subscriptionEndsAt: subscription.subscription_ends_at,
            nextBillingAt: subscription.next_billing_date,
          });

          if (!entitlement.isActive) {
          expiredUsers++
          } else if (entitlement.status === 'trial') {
          freeActiveUsers++ // Trial (7d)
          } else if (entitlement.plan === 'monthly') {
          monthlyUsers++ // Mensal
          } else if (entitlement.plan === 'annual') {
          annualUsers++ // Anual
          }
        }
        // Usuários "Free" (sem subscription ou subscription inativa e sem 'expired' explícito caso exista) não contam para 'Expirados' 
      })


      setStats({
        freeActiveUsers,
        monthlyUsers,
        annualUsers,
        expiredUsers,
        totalUsers
      })
    } catch (err) {
      console.error('❌ Error fetching subscription stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // Buscar na montagem
  useEffect(() => {
    fetchStats()
  }, [])

  // Escutar mudanças
  useEffect(() => {
    const handleChange = () => {
      setTimeout(() => fetchStats(), 500)
    }

    window.addEventListener('subscription-changed', handleChange)
    window.addEventListener('force-profile-refresh', handleChange)

    return () => {
      window.removeEventListener('subscription-changed', handleChange)
      window.removeEventListener('force-profile-refresh', handleChange)
    }
  }, [])

  return {
    ...stats,
    loading,
    refresh: fetchStats
  }
}
