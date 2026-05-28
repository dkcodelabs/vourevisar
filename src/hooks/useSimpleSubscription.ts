// =====================================================
// HOOK SIMPLES PARA ASSINATURA - SEM COMPLICAÇÃO
// =====================================================
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface SimpleSubscription {
  plan: string
  status: string
  isActive: boolean
  displayBadge: string
  badgeColor: string
}

export function useSimpleSubscription() {
  const [subscription, setSubscription] = useState<SimpleSubscription>({
    plan: 'free_trial',
    status: 'trial',
    isActive: false,
    displayBadge: 'Free',
    badgeColor: 'gray'
  })
  const [loading, setLoading] = useState(true)

  const fetchSubscription = async (skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSubscription({
          plan: 'free_trial',
          status: 'trial',
          isActive: false,
          displayBadge: 'Free',
          badgeColor: 'gray'
        })
        return
      }

      // Log removido para otimização

      // Buscar diretamente da tabela
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      // Verificar se o usuário possui a role de admin ou owner ou se é email protegido
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      const isOwnerOrAdmin = user.email === 'vourevisar@gmail.com' || 
                             user.email === 'darciliok@gmail.com' || 
                             (rolesData && rolesData.some(r => r.role === 'owner' || r.role === 'admin'));

      if (isOwnerOrAdmin) {
        setSubscription({
          plan: 'annual',
          status: 'active',
          isActive: true,
          displayBadge: 'Acesso Vitalício',
          badgeColor: 'purple'
        })
        return
      }

      // Log removido para otimização

      if (error || !data) {
        setSubscription({
          plan: 'free_trial',
          status: 'expired',
          isActive: false,
          displayBadge: 'Free',
          badgeColor: 'gray'
        })
        return
      }

      // Calcular se está ativo
      const now = new Date()
      let isActive = false
      let displayBadge = 'Free'
      let badgeColor = 'gray'

      if (data.status === 'active') {
        if (data.subscription_ends_at) {
          const endDate = new Date(data.subscription_ends_at)
          isActive = endDate > now
        } else {
          isActive = true
        }

        if (isActive) {
          if (data.plan === 'annual') {
            displayBadge = 'Anual'
            badgeColor = 'purple'
          } else if (data.plan === 'monthly') {
            displayBadge = 'Mensal'
            badgeColor = 'blue'
          }
        } else {
          displayBadge = 'Expirado'
          badgeColor = 'red'
        }
      } else if (data.status === 'trial') {
        if (data.trial_ends_at) {
          const endDate = new Date(data.trial_ends_at)
          isActive = endDate > now
          const days = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          displayBadge = isActive ? `Trial (${days}d)` : 'Free'
          badgeColor = isActive ? 'yellow' : 'gray'
        }
      }

      // Log removido para otimização

      setSubscription({
        plan: data.plan,
        status: data.status,
        isActive,
        displayBadge,
        badgeColor
      })

    } catch (err) {
      console.error('Error fetching subscription:', err)
    } finally {
      if (!skipLoading) setLoading(false)
    }
  }

  // Buscar na montagem
  useEffect(() => {
    fetchSubscription()
  }, [])

  // Escutar eventos de mudança (otimizado)
  useEffect(() => {
    const handleChange = () => {
      fetchSubscription(true)
    }

    window.addEventListener('subscription-changed', handleChange as EventListener)
    window.addEventListener('force-profile-refresh', handleChange as EventListener)

    return () => {
      window.removeEventListener('subscription-changed', handleChange as EventListener)
      window.removeEventListener('force-profile-refresh', handleChange as EventListener)
    }
  }, [])

  return {
    ...subscription,
    loading,
    refresh: fetchSubscription,
    quickRefresh: () => fetchSubscription(true)
  }
}
