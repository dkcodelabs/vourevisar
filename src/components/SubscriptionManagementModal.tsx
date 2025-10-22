// =====================================================
// MODAL PARA GERENCIAR ASSINATURAS DOS USUÁRIOS
// =====================================================
import React, { useState, useEffect } from 'react'
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

interface UserWithSubscription {
  id: string
  email: string
  name: string | null
  role: 'owner' | 'admin' | 'moderator' | 'user' | null
  subscription_plan: 'free_trial' | 'monthly' | 'annual' | null
  subscription_status: 'trial' | 'active' | 'expired' | 'canceled' | 'suspended' | null
  is_active: boolean
  days_remaining: number | null
  subscription_ends_at: string | null
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

  // Buscar usuários e suas assinaturas
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Buscar usuários básicos primeiro
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .order('email')

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        throw profilesError
      }

      console.log('Profiles found:', profiles?.length || 0)

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
        .select('user_id, plan, status, trial_ends_at, subscription_ends_at, trial_started_at, subscription_started_at')

      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError)
        throw subscriptionsError
      }

      console.log('Subscriptions found:', subscriptions?.length || 0)

      // Processar dados para o formato esperado
      const processedUsers: UserWithSubscription[] = profiles.map(user => {
        const userRole = roles?.find(r => r.user_id === user.id)
        const subscription = subscriptions?.find(s => s.user_id === user.id)
        const role = userRole?.role || 'user'

        // Calcular se a assinatura está ativa e dias restantes
        let daysRemaining = null
        let isActive = false

        if (subscription) {
          const now = new Date()

          // Para trial, verificar trial_ends_at
          if (subscription.status === 'trial' && subscription.trial_ends_at) {
            const trialEndDate = new Date(subscription.trial_ends_at)
            isActive = trialEndDate > now
            daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          }

          // Para assinaturas pagas, verificar subscription_ends_at
          if (subscription.status === 'active' && subscription.subscription_ends_at) {
            const subEndDate = new Date(subscription.subscription_ends_at)
            isActive = subEndDate > now
            daysRemaining = Math.max(0, Math.ceil((subEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          }
        }

        const processedUser = {
          id: user.id,
          email: user.email,
          name: user.name || user.email?.split('@')[0] || 'Sem nome',
          role: role as any,
          subscription_plan: subscription?.plan || null,
          subscription_status: subscription?.status || null,
          is_active: isActive,
          days_remaining: daysRemaining,
          subscription_ends_at: subscription?.subscription_ends_at || subscription?.trial_ends_at || null
        }

        console.log('Processed user:', processedUser)
        return processedUser
      })

      setUsers(processedUsers)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  // Alterar assinatura de um usuário
  const changeSubscription = async (userId: string, action: 'activate_monthly' | 'activate_annual' | 'activate_trial' | 'deactivate') => {
    try {
      setProcessingUserId(userId)
      setError(null)

      if (action === 'deactivate') {
        // Desativar assinatura - marcar como expirada
        const { error } = await (supabase as any)
          .rpc('update_user_subscription', {
            target_user_id: userId,
            new_plan: 'free_trial',
            new_status: 'expired',
            new_trial_started_at: null,
            new_trial_ends_at: null,
            new_subscription_started_at: null,
            new_subscription_ends_at: null
          })

        if (error) throw error
      } else if (action === 'activate_trial') {
        // Ativar trial - 7 dias
        const now = new Date().toISOString()
        const trialEnd = new Date()
        trialEnd.setDate(trialEnd.getDate() + 7)

        const { error } = await (supabase as any)
          .rpc('update_user_subscription', {
            target_user_id: userId,
            new_plan: 'free_trial',
            new_status: 'trial',
            new_trial_started_at: now,
            new_trial_ends_at: trialEnd.toISOString(),
            new_subscription_started_at: null,
            new_subscription_ends_at: null
          })

        if (error) throw error
      } else {
        // Ativar assinatura paga
        const planMap = {
          'activate_monthly': 'monthly',
          'activate_annual': 'annual'
        }

        const plan = planMap[action]
        const now = new Date().toISOString()
        const endDate = new Date()

        if (plan === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1)
        } else if (plan === 'annual') {
          endDate.setFullYear(endDate.getFullYear() + 1)
        }

        const { error } = await (supabase as any)
          .rpc('update_user_subscription', {
            target_user_id: userId,
            new_plan: plan,
            new_status: 'active',
            new_trial_started_at: null,
            new_trial_ends_at: null,
            new_subscription_started_at: now,
            new_subscription_ends_at: endDate.toISOString()
          })

        if (error) throw error
      }

      // Recarregar dados
      await fetchUsers()
    } catch (err) {
      console.error('Error changing subscription:', err)
      setError(err instanceof Error ? err.message : 'Erro ao alterar assinatura')
    } finally {
      setProcessingUserId(null)
    }
  }

  useEffect(() => {
    if (isOpen) {
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
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><UserCheck className="w-3 h-3 mr-1" />Trial ({user.days_remaining || 0}d)</Badge>
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
            {/* Estatísticas rápidas - apenas usuários comuns */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {users.filter(u => 
                    u.role === 'user' && (!u.is_active || !u.subscription_plan)
                  ).length}
                </div>
                <div className="text-sm text-gray-500">Free</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {users.filter(u => 
                    u.role === 'user' && u.subscription_status === 'trial' && u.is_active
                  ).length}
                </div>
                <div className="text-sm text-yellow-600">Trial</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {users.filter(u => 
                    u.role === 'user' && u.is_active && u.subscription_status === 'active' && 
                    (u.subscription_plan === 'monthly' || u.subscription_plan === 'annual')
                  ).length}
                </div>
                <div className="text-sm text-green-600">Pagos</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">
                  {users.filter(u => 
                    u.role === 'user' && u.subscription_status === 'expired'
                  ).length}
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
                      onValueChange={(value) => changeSubscription(user.id, value as any)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Alterar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activate_trial">🆓 Ativar Trial</SelectItem>
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
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            🔄 Atualizar
          </Button>
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}