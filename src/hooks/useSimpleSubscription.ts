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

      console.log('🔍 Fetching subscription for user:', user.id)

      // Buscar diretamente da tabela
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('📊 Subscription data:', { data, error })

      if (error || !data) {
        console.log('❌ No subscription found, using default')
        setSubscription({
          plan: 'free_trial',
          status: 'trial',
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
          displayBadge = isActive ? `Free (${days}d)` : 'Expirado'
          badgeColor = isActive ? 'yellow' : 'red'
        }
      }

      console.log('🎯 Final subscription:', { 
        plan: data.plan, 
        status: data.status, 
        isActive, 
        displayBadge, 
        badgeColor 
      })

      setSubscription({
        plan: data.plan,
        status: data.status,
        isActive,
        displayBadge,
        badgeColor
      })

    } catch (err) {
      console.error('❌ Error fetching subscription:', err)
    } finally {
      if (!skipLoading) setLoading(false)
    }
  }

  // Buscar na montagem
  useEffect(() => {
    fetchSubscription()
  }, [])

  // Escutar eventos de mudança (OTIMIZADO)
  useEffect(() => {
    const handleChange = (event: CustomEvent) => {
      console.log('🔄 Subscription change event received:', event.detail)
      // Atualização IMEDIATA (sem loading para não piscar)
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