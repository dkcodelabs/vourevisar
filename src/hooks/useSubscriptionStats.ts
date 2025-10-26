// =====================================================
// HOOK PARA ESTATÍSTICAS DE ASSINATURA
// =====================================================
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

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
      console.log('📊 Fetching subscription stats...')

      // Buscar todos os usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')

      console.log('👥 Profiles found:', profiles?.length || 0)
      if (profilesError) {
        console.error('❌ Profiles error:', profilesError)
        throw profilesError
      }

      // Buscar todas as assinaturas
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, plan, status, trial_ends_at, subscription_ends_at')

      console.log('💳 Subscriptions found:', subscriptions?.length || 0)
      if (subscriptionsError) {
        console.error('❌ Subscriptions error:', subscriptionsError)
        throw subscriptionsError
      }

      const totalUsers = profiles?.length || 0
      const now = new Date()

      let freeActiveUsers = 0  // Free (7d) - trials ativos
      let monthlyUsers = 0     // Mensal - assinaturas mensais ativas
      let annualUsers = 0      // Anual - assinaturas anuais ativas
      let expiredUsers = 0     // Expirados - qualquer coisa vencida

      // Processar cada usuário
      profiles?.forEach(profile => {
        const subscription = subscriptions?.find(s => s.user_id === profile.id)

        if (!subscription) {
          // Usuário sem assinatura = considerado expirado
          expiredUsers++
          return
        }

        // Verificar se está ativo
        let isActive = false
        if (subscription.status === 'trial' && subscription.trial_ends_at) {
          const trialEnd = new Date(subscription.trial_ends_at)
          isActive = trialEnd > now
        } else if (subscription.status === 'active' && subscription.subscription_ends_at) {
          const subEnd = new Date(subscription.subscription_ends_at)
          isActive = subEnd > now
        } else if (subscription.status === 'active' && !subscription.subscription_ends_at) {
          isActive = true // Assinatura vitalícia
        }

        // Categorizar baseado no novo padrão
        if (!isActive || subscription.status === 'expired') {
          expiredUsers++
        } else if (subscription.status === 'trial') {
          freeActiveUsers++ // Free (7d)
        } else if (subscription.status === 'active' && subscription.plan === 'monthly') {
          monthlyUsers++ // Mensal
        } else if (subscription.status === 'active' && subscription.plan === 'annual') {
          annualUsers++ // Anual
        } else {
          expiredUsers++ // Qualquer outro caso
        }
      })

      console.log('📊 Subscription stats calculated:', {
        totalUsers,
        freeActiveUsers,
        monthlyUsers,
        annualUsers,
        expiredUsers
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
      console.log('🔄 Refreshing subscription stats')
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