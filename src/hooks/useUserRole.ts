// =====================================================
// HOOK PARA VERIFICAR ROLES DO USUÁRIO
// =====================================================
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { User } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'

export type AppRole = 'owner' | 'admin' | 'moderator' | 'user'

interface UserRoleData {
  roles: AppRole[]
  highestRole: AppRole | null
  loading: boolean
  error: string | null
  user: User | null
}

export function useUserRole(): UserRoleData & {
  isOwner: boolean
  isAdmin: boolean
  isModerator: boolean
  hasRole: (role: AppRole) => boolean
  hasRoleOrHigher: (minRole: AppRole) => boolean
  refetch: () => Promise<void>
} {
  const [roles, setRoles] = useState<AppRole[]>([])
  const [highestRole, setHighestRole] = useState<AppRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const currentUser = user

      if (!currentUser) {
        setRoles([])
        setHighestRole(null)
        return
      }

      // Busca roles do usuário
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)

      if (roleError) {
        throw roleError
      }

      if (userRoles && userRoles.length > 0) {
        const rolesList = userRoles.map(r => r.role as AppRole)
        setRoles(rolesList)

        // Determina a role mais alta
        const hierarchy: Record<AppRole, number> = {
          user: 1,
          moderator: 2,
          admin: 3,
          owner: 4
        }

        const highest = rolesList.reduce((prev, current) => 
          hierarchy[current] > hierarchy[prev] ? current : prev
        )
        setHighestRole(highest)
      } else {
        setRoles([])
        setHighestRole(null)
      }
    } catch (err) {
      console.error('Error fetching user roles:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setRoles([])
      setHighestRole(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Função para verificar hierarquia de roles
  const hasRoleOrHigher = useCallback((minRole: AppRole): boolean => {
    const hierarchy: Record<AppRole, number> = {
      user: 1,
      moderator: 2,
      admin: 3,
      owner: 4
    }

    const userLevel = highestRole ? hierarchy[highestRole] : 0
    const requiredLevel = hierarchy[minRole]

    return userLevel >= requiredLevel
  }, [highestRole])

  // Função para verificar role específica
  const hasRole = useCallback((role: AppRole): boolean => {
    return roles.includes(role)
  }, [roles])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  return {
    roles,
    highestRole,
    loading,
    error,
    user,
    isOwner: hasRole('owner'),
    isAdmin: hasRoleOrHigher('admin'),
    isModerator: hasRoleOrHigher('moderator'),
    hasRole,
    hasRoleOrHigher,
    refetch: fetchRoles
  }
}
