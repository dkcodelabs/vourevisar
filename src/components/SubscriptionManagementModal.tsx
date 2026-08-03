// =====================================================
// MODAL PARA GERENCIAR ASSINATURAS DOS USUÁRIOS
// =====================================================
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserCheck, User, Crown, Shield, Users, Calendar, DollarSign, XCircle } from 'lucide-react'
import { useSubscriptionStats } from '@/hooks/useSubscriptionStats'
import type { Database } from '@/integrations/supabase/types'
import { invokeAdminRpc } from '@/services/adminRpcService'
import { invokeUserRpc } from '@/services/userRpcService'
import { getSubscriptionEntitlement } from '@/utils/subscriptionEntitlement'

type AppRole = Database['public']['Enums']['app_role']
type SubscriptionPlan = Database['public']['Enums']['subscription_plan']
type SubscriptionStatus = Database['public']['Enums']['subscription_status']
type SubscriptionAction = 'activate_monthly' | 'activate_annual' | 'activate_trial' | 'deactivate'

interface UserWithSubscription {
  id: string
  email: string
  name: string | null
  role: AppRole | null
  subscription_plan: SubscriptionPlan | null
  subscription_status: SubscriptionStatus | null
  is_active: boolean
  days_remaining: number | null
  subscription_ends_at: string | null
  manual_access_until: string | null
  manual_access_plan: SubscriptionPlan | null
  manual_access_reason: string | null
  manual_access_granted_at: string | null
}

interface SubscriptionManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SubscriptionManagementModal({ isOpen, onClose }: SubscriptionManagementModalProps) {
  const [users, setUsers] = useState<UserWithSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const stats = useSubscriptionStats()

  // Buscar usuários e suas assinaturas
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 MODAL: Starting to fetch users...')

      // Buscar usuários básicos primeiro
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .order('email')

      if (profilesError) {
        console.error('❌ MODAL: Error fetching profiles:', profilesError)
        throw profilesError
      }

      console.log('👥 MODAL: Profiles found:', profiles?.length || 0)

      // Buscar roles separadamente
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')

      if (rolesError) {
        console.error('Error fetching roles:', rolesError)
        throw rolesError
      }

      console.log('Roles found:', roles?.length || 0)

      // Buscar assinaturas separadamente
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, plan, status, trial_ends_at, subscription_ends_at, trial_started_at, subscription_started_at, manual_access_until, manual_access_plan, manual_access_reason, manual_access_granted_at')

      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError)
        throw subscriptionsError
      }

      console.log('💳 MODAL: Subscriptions found:', subscriptions?.length || 0)

      // Processar dados para o formato esperado
      const processedUsers: UserWithSubscription[] = profiles.map(user => {
        const userRole = roles?.find(r => r.user_id === user.id)
        const subscription = subscriptions?.find(s => s.user_id === user.id)
        const role = userRole?.role || 'user'

        const entitlement = subscription
          ? getSubscriptionEntitlement({
              plan: subscription.plan,
              status: subscription.status,
              trialEndsAt: subscription.trial_ends_at,
              subscriptionEndsAt: subscription.subscription_ends_at,
              manualAccessUntil: subscription.manual_access_until,
              manualAccessPlan: subscription.manual_access_plan,
            })
          : null

        const processedUser = {
          id: user.id,
          email: user.email,
          name: user.name || user.email?.split('@')[0] || 'Sem nome',
          role,
          subscription_plan: entitlement?.isActive ? entitlement.plan : subscription?.plan || null,
          subscription_status: subscription?.status || null,
          is_active: entitlement?.isActive ?? false,
          days_remaining: entitlement?.isActive ? entitlement.daysRemaining : null,
          subscription_ends_at: entitlement?.isActive
            ? (subscription?.manual_access_until || subscription?.subscription_ends_at || subscription?.trial_ends_at || null)
            : subscription?.subscription_ends_at || subscription?.trial_ends_at || null,
          manual_access_until: subscription?.manual_access_until || null,
          manual_access_plan: subscription?.manual_access_plan || null,
          manual_access_reason: subscription?.manual_access_reason || null,
          manual_access_granted_at: subscription?.manual_access_granted_at || null,
        }

        console.log('Processed user:', processedUser)
        return processedUser
      })

      console.log('✅ MODAL: Setting users data, total:', processedUsers.length)
      setUsers(processedUsers)
    } catch (err) {
      console.error('❌ MODAL: Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  // Alterar assinatura de um usuário
  const changeSubscription = async (userId: string, action: SubscriptionAction) => {
    try {
      setProcessingUserId(userId)
      setError(null)

      console.log(`Changing subscription for user ${userId} to ${action}`)

      const rpcAction = action === 'deactivate'
        ? 'deactivate_subscription'
        : action === 'activate_trial'
          ? 'activate_trial_subscription'
          : 'activate_paid_subscription'

      await invokeAdminRpc(rpcAction, {
        target_user_id: userId,
        ...(action === 'activate_trial' ? { trial_days: 7 } : {}),
        ...(action === 'activate_monthly' || action === 'activate_annual'
          ? { plan_type: action === 'activate_annual' ? 'annual' : 'monthly' }
          : {}),
      })

      // Forçar atualização IMEDIATA de todos os componentes
      console.log('🎯 Dispatching events for user:', userId, 'action:', action)
      
      // Aguardar um pouco para garantir que a transação foi commitada
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Evento específico de mudança de assinatura
      window.dispatchEvent(new CustomEvent('subscription-changed', { 
        detail: { userId, action, timestamp: Date.now() } 
      }))
      
      // Evento geral de refresh de perfil
      window.dispatchEvent(new CustomEvent('force-profile-refresh', { 
        detail: { userId, forceAll: true, timestamp: Date.now() } 
      }))
      
      // Aguardar mais um pouco antes de atualizar o modal
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Recarregar dados do modal e estatísticas
      await fetchUsers()
      stats.refresh()
      
      console.log('✅ All updates completed for user:', userId)
    } catch (err) {
      console.error('Error changing subscription:', err)
      setError(err instanceof Error ? err.message : 'Erro ao alterar assinatura')
    } finally {
      setProcessingUserId(null)
    }
  }

  useEffect(() => {
    console.log('🚪 MODAL: isOpen changed to:', isOpen)
    if (isOpen) {
      console.log('🔄 MODAL: Modal opened, calling fetchUsers...')
      fetchUsers()
    }
  }, [isOpen])



  // Função para obter badge da assinatura - DETALHADO
  const getSubscriptionBadge = (user: UserWithSubscription) => {
    // Se tem role administrativa, mostrar a role
    if (user.role === 'owner') {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200"><Crown className="w-3 h-3 mr-1" />Proprietário</Badge>
    }
    if (user.role === 'admin') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Shield className="w-3 h-3 mr-1" />Administrador</Badge>
    }
    if (user.role === 'moderator') {
      return <Badge className="bg-green-100 text-green-800 border-green-200"><Users className="w-3 h-3 mr-1" />Moderador</Badge>
    }

    // Para usuários comuns, verificar status de assinatura com mais detalhes
    if (user.subscription_status === 'expired' || (user.subscription_ends_at && new Date(user.subscription_ends_at) < new Date())) {
      return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Expirado</Badge>
    }

    if (user.is_active && user.subscription_status === 'trial') {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><UserCheck className="w-3 h-3 mr-1" />Free ({user.days_remaining || 0}d)</Badge>
    }

    if (user.is_active && user.subscription_plan === 'monthly') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><UserCheck className="w-3 h-3 mr-1" />Mensal</Badge>
    }

    if (user.is_active && user.subscription_plan === 'annual') {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200"><UserCheck className="w-3 h-3 mr-1" />Anual</Badge>
    }

    // Usuário sem assinatura
    return <Badge className="bg-gray-100 text-gray-800 border-gray-200"><User className="w-3 h-3 mr-1" />Free</Badge>
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Gerenciar Assinaturas dos Usuários
          </DialogTitle>
          <DialogDescription>
            Visualize e altere o status de assinatura dos usuários. Ative trials, assinaturas pagas ou desative conforme necessário.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo geral */}
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
          <div className="flex items-center justify-between">
            <span className="font-medium">📊 Total de Usuários no Sistema</span>
            <span className="text-2xl font-bold">{loading ? '...' : users.length}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <strong>Erro:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Carregando usuários...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Estatísticas reais usando o hook */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.loading ? '...' : stats.freeActiveUsers}
                </div>
                <div className="text-sm text-yellow-600">Free (7d)</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.loading ? '...' : stats.monthlyUsers}
                </div>
                <div className="text-sm text-blue-600">Mensal</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.loading ? '...' : stats.annualUsers}
                </div>
                <div className="text-sm text-purple-600">Anual</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.loading ? '...' : stats.expiredUsers}
                </div>
                <div className="text-sm text-red-600">Expirados</div>
              </div>
            </div>

            {/* Lista de usuários */}
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{user.name || 'Sem nome'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    {user.subscription_ends_at && (
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Expira: {new Date(user.subscription_ends_at).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Badge do tipo de assinatura */}
                    {getSubscriptionBadge(user)}

                    <Select
                      disabled={processingUserId === user.id}
                      onValueChange={(value) => changeSubscription(user.id, value as SubscriptionAction)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Alterar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activate_trial">🆓 Ativar Free (7 dias)</SelectItem>
                        <SelectItem value="activate_monthly">💰 Ativar Mensal</SelectItem>
                        <SelectItem value="activate_annual">💎 Ativar Anual</SelectItem>
                        <SelectItem value="deactivate">❌ Desativar</SelectItem>
                      </SelectContent>
                    </Select>

                    {processingUserId === user.id && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum usuário encontrado.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchUsers} disabled={loading}>
              🔄 Atualizar Lista
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // Forçar refresh de todos os componentes
                window.dispatchEvent(new CustomEvent('force-profile-refresh', { 
                  detail: { forceAll: true, timestamp: Date.now() } 
                }))
              }}
              disabled={loading}
            >
              🎯 Forçar Badge
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('🔄 MANUAL: Forcing fetchUsers and stats...')
                fetchUsers()
                stats.refresh()
              }}
              disabled={loading}
            >
              📊 Atualizar Stats
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('🔍 DEBUG: Current users state:', users.length, users)
              }}
              disabled={loading}
            >
              🔍 Debug Users
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                // Testar função SQL diretamente
                try {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user) {
                    console.log('🧪 Testing SQL function for user:', user.id)
                    let rpcData: unknown = null
                    
                    // Testar get_subscription_info pela fronteira segura
                    try {
                      rpcData = await invokeUserRpc('get_subscription_info', { check_user_id: user.id })
                      console.log('📊 SQL Result:', { data: rpcData, error: null })
                    } catch (error) {
                      console.log('📊 SQL Result:', { data: null, error })
                    }
                    
                    // Testar busca direta na tabela
                    const { data: directData, error: directError } = await supabase
                      .from('user_subscriptions')
                      .select('*')
                      .eq('user_id', user.id)
                      .single()
                    
                    console.log('📋 Direct table query:', { directData, directError })
                    
                    alert(`SQL Function: ${JSON.stringify(rpcData, null, 2)}\n\nDirect Query: ${JSON.stringify(directData, null, 2)}`)
                  }
                } catch (err) {
                  console.error('Erro no teste SQL:', err)
                  alert(`Erro: ${err}`)
                }
              }}
              disabled={loading}
            >
              🧪 Testar SQL
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                // Testar eventos de atualização para o usuário atual
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                  console.log('🧪 Testing update events for current user:', user.id)
                  window.dispatchEvent(new CustomEvent('subscription-changed', { 
                    detail: { userId: user.id, action: 'test', timestamp: Date.now() } 
                  }))
                  window.dispatchEvent(new CustomEvent('force-profile-refresh', { 
                    detail: { userId: user.id, forceAll: true, timestamp: Date.now() } 
                  }))
                  console.log('✅ Events dispatched for current user')
                } else {
                  console.log('❌ No current user found')
                }
              }}
              disabled={loading}
            >
              🧪 Testar Badge Atual
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // Forçar atualização completa
                window.location.reload()
              }}
              disabled={loading}
            >
              🔄 Recarregar Página
            </Button>
          </div>
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
