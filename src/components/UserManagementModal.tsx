// =====================================================
// MODAL DE GERENCIAMENTO DE USUÁRIOS E ROLES
// =====================================================
import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUserRole, AppRole } from '@/hooks/useUserRole'
import { X, Crown, Shield, Users, User, AlertTriangle, Check } from 'lucide-react'
import { SubscriptionManagementModal } from './SubscriptionManagementModal'
import { UserAvatar } from '@/components/ui/UserAvatar'

interface UserWithRoles {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  roles: AppRole[]
  highestRole: AppRole | null
}

interface UserManagementModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'list' | 'assign' | 'manage'
  title: string
}

// Função para determinar se deve mostrar botões de ação
const shouldShowActions = (mode: string) => mode !== 'list'
const shouldShowRemoveActions = (mode: string) => mode === 'manage'

export function UserManagementModal({ isOpen, onClose, mode, title }: UserManagementModalProps) {
  const [users, setUsers] = useState<UserWithRoles[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const { refetch } = useUserRole()

  // Buscar usuários
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Buscar usuários do profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name, avatar_url, created_at')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Buscar roles usando RPC (ignorando tipos TypeScript)
      const { data: userRoles, error: rolesError } = await (supabase as any)
        .rpc('get_all_user_roles_admin')

      // Se RPC não funcionar, usar query SQL direta
      let rolesData = userRoles
      if (rolesError || !userRoles) {
        console.log('Tentando query SQL direta...')
        const { data: directRoles } = await (supabase as any)
          .from('user_roles')
          .select('user_id, role')
        rolesData = directRoles || []
      }

      // Combinar dados
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => {
        const roles = (rolesData || [])
          .filter((ur: any) => ur.user_id === profile.id)
          .map((ur: any) => ur.role as AppRole)

        const hierarchy: Record<AppRole, number> = {
          user: 1,
          moderator: 2,
          admin: 3,
          owner: 4
        }

        const highestRole = roles.length > 0 
          ? roles.reduce((prev, current) => 
              hierarchy[current] > hierarchy[prev] ? current : prev
            )
          : null

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          roles,
          highestRole
        }
      })

      setUsers(usersWithRoles)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  // Atribuir role
  const assignRole = async (userId: string, role: AppRole) => {
    try {
      setActionLoading(`assign-${userId}-${role}`)
      
      // Usar RPC function para atribuir role (ignorando tipos TypeScript)
      const { error } = await (supabase as any).rpc('assign_user_role_admin', {
        target_user_id: userId,
        new_role: role
      })

      if (error) throw error

      await fetchUsers()
      await refetch()
      
      alert(`✅ Role "${role}" atribuída com sucesso!`)
    } catch (err) {
      console.error('Error assigning role:', err)
      alert(`❌ Erro ao atribuir role: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Remover role
  const removeRole = async (userId: string, role: AppRole) => {
    try {
      setActionLoading(`remove-${userId}-${role}`)
      
      // Usar RPC function para remover role (ignorando tipos TypeScript)
      const { error } = await (supabase as any).rpc('remove_user_role_admin', {
        target_user_id: userId,
        role_to_remove: role
      })

      if (error) throw error

      await fetchUsers()
      await refetch()
      
      alert(`✅ Role "${role}" removida com sucesso!`)
    } catch (err) {
      console.error('Error removing role:', err)
      alert(`❌ Erro ao remover role: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  if (!isOpen) return null

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-purple-600" />
      case 'admin': return <Shield className="w-4 h-4 text-blue-600" />
      case 'moderator': return <Users className="w-4 h-4 text-green-600" />
      case 'user': return <User className="w-4 h-4 text-gray-600" />
    }
  }

  const getRoleColor = (role: AppRole) => {
    switch (role) {
      case 'owner': return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-300'
      case 'admin': return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-300'
      case 'moderator': return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300'
      case 'user': return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-300'
    }
  }

  // Se for modal de assinaturas, mostrar o modal específico
  if (title.includes('Assinaturas')) {
    return <SubscriptionManagementModal isOpen={isOpen} onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="relative">
            <input
              type="text"
              placeholder="Pesquisar usuários por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm">Carregando usuários...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
              <button
                onClick={fetchUsers}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {users
                .filter(user => 
                  user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map(user => (
                <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                  {/* Header com info do usuário e roles */}
                  <div className="flex items-center justify-between mb-3">
                    {/* User Info */}
                    <div className="flex items-center space-x-3">
                      <UserAvatar 
                        src={user.avatar_url} 
                        name={user.full_name || user.email} 
                        className="w-8 h-8 border border-gray-200"
                        fallbackClassName="text-xs"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                          {user.full_name || user.email.split('@')[0]}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        <p className="text-xs text-gray-400">
                          Membro desde {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Current Roles - Badges Reorganizados */}
                    <div className="flex flex-wrap gap-1 justify-end">
                      {user.roles.length > 0 ? (
                        <>
                          {/* Roles administrativas primeiro (esquerda) */}
                          {user.roles
                            .filter(role => role !== 'user')
                            .sort((a, b) => {
                              const order = { owner: 0, admin: 1, moderator: 2 }
                              return order[a] - order[b]
                            })
                            .map(role => (
                              <span
                                key={role}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(role)}`}
                              >
                                {getRoleIcon(role)}
                                <span className="ml-1 capitalize">
                                  {role === 'owner' ? 'Proprietário' : role === 'admin' ? 'Admin' : 'Moderador'}
                                </span>
                              </span>
                            ))}
                          
                          {/* Usuário padrão por último (direita) */}
                          {user.roles.includes('user') && (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor('user')} opacity-75`}
                            >
                              {getRoleIcon('user')}
                              <span className="ml-1">Usuário (padrão)</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Sem permissões
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role Management - Condicional baseado no modo */}
                  {shouldShowActions(mode) && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <h4 className="text-xs font-medium text-gray-600 mb-2">
                        {mode === 'assign' ? 'Atribuir Permissões:' : 'Gerenciar Permissões:'}
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {(['user', 'moderator', 'admin', 'owner'] as AppRole[]).map(role => {
                          const hasRole = user.roles.includes(role)
                          const isLoading = actionLoading === `assign-${user.id}-${role}` || actionLoading === `remove-${user.id}-${role}`
                          
                          // No modo 'assign', só mostra botões para atribuir
                          if (mode === 'assign' && hasRole) {
                            return (
                              <span
                                key={role}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                <span className="capitalize">{role} ✓</span>
                              </span>
                            )
                          }
                          
                          // No modo 'assign', só mostra botões para roles que não tem
                          if (mode === 'assign' && !hasRole) {
                            return (
                              <button
                                key={role}
                                onClick={() => assignRole(user.id, role)}
                                disabled={isLoading}
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-all duration-200 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 ${isLoading ? 'opacity-50' : ''}`}
                              >
                                {isLoading ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent mr-1"></div>
                                ) : (
                                  getRoleIcon(role)
                                )}
                                <span className="capitalize ml-1">+ {role}</span>
                              </button>
                            )
                          }
                          
                          // No modo 'manage', mostra botões completos
                          if (mode === 'manage') {
                            return (
                              <button
                                key={role}
                                onClick={() => {
                                  if (hasRole && role !== 'user') {
                                    removeRole(user.id, role)
                                  } else if (!hasRole) {
                                    assignRole(user.id, role)
                                  }
                                }}
                                disabled={isLoading || (hasRole && role === 'user')}
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                  hasRole
                                    ? role === 'user'
                                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed border border-gray-200'
                                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 hover:border-blue-300'
                                } ${isLoading ? 'opacity-50' : ''}`}
                              >
                                {isLoading ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent mr-1"></div>
                                ) : hasRole ? (
                                  role === 'user' ? (
                                    <Check className="w-3 h-3 mr-1" />
                                  ) : (
                                    <X className="w-3 h-3 mr-1" />
                                  )
                                ) : (
                                  getRoleIcon(role)
                                )}
                                <span className="capitalize">
                                  {hasRole 
                                    ? role === 'user' 
                                      ? `${role} (padrão)` 
                                      : `- ${role}`
                                    : `+ ${role}`
                                  }
                                </span>
                              </button>
                            )
                          }
                          
                          return null
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Modo apenas visualização */}
                  {mode === 'list' && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-center py-1">
                        <span className="text-xs text-gray-500 italic">
                          👁️ Modo apenas visualização
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {users.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum usuário encontrado
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            Total: {users.length} usuário(s)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              🔄 Atualizar
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}