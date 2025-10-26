// =====================================================
// COMPONENTES DE UI BASEADOS EM ROLE
// =====================================================
import React from 'react'
import { useUserRole, AppRole } from '@/hooks/useUserRole'

// =====================================================
// BADGE DE ROLE DO USUÁRIO
// =====================================================
export function UserRoleBadge({ className = '' }: { className?: string }) {
  const { highestRole, loading } = useUserRole()

  if (loading) {
    return <div className={`animate-pulse bg-gray-200 rounded px-2 py-1 ${className}`} />
  }

  if (!highestRole) return null

  const roleColors = {
    owner: 'bg-purple-100 text-purple-800 border-purple-200',
    admin: 'bg-red-100 text-red-800 border-red-200',
    moderator: 'bg-blue-100 text-blue-800 border-blue-200',
    user: 'bg-green-100 text-green-800 border-green-200'
  }

  const roleLabels = {
    owner: 'Proprietário',
    admin: 'Administrador',
    moderator: 'Moderador',
    user: 'Usuário'
  }

  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
      ${roleColors[highestRole]} ${className}
    `}>
      {roleLabels[highestRole]}
    </span>
  )
}

// =====================================================
// BOTÃO COM VERIFICAÇÃO DE PERMISSÃO
// =====================================================
interface ProtectedButtonProps {
  children: React.ReactNode
  requiredRole: AppRole
  orHigher?: boolean
  onClick?: () => void
  className?: string
  disabledText?: string
}

export function ProtectedButton({
  children,
  requiredRole,
  orHigher = false,
  onClick,
  className = '',
  disabledText = 'Sem permissão'
}: ProtectedButtonProps) {
  const { hasRole, hasRoleOrHigher, loading } = useUserRole()

  const hasPermission = orHigher ? hasRoleOrHigher(requiredRole) : hasRole(requiredRole)

  if (loading) {
    return (
      <button disabled className={`opacity-50 cursor-not-allowed ${className}`}>
        Carregando...
      </button>
    )
  }

  if (!hasPermission) {
    return (
      <button 
        disabled 
        className={`opacity-50 cursor-not-allowed ${className}`}
        title={disabledText}
      >
        {children}
      </button>
    )
  }

  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  )
}

// =====================================================
// INFORMAÇÕES DO USUÁRIO COM ROLES
// =====================================================
export function UserInfo({ className = '' }: { className?: string }) {
  const { user, roles, highestRole, loading, error } = useUserRole()

  if (loading) {
    return <div className={`animate-pulse bg-gray-200 h-16 rounded ${className}`} />
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        Erro ao carregar informações: {error}
      </div>
    )
  }

  if (!user) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        Usuário não autenticado
      </div>
    )
  }

  return (
    <div className={`user-info ${className}`}>
      <div className="flex items-center gap-3">
        <div>
          <p className="font-medium">{user.email}</p>
          <div className="flex gap-1 mt-1">
            <UserRoleBadge />
            {roles.length > 1 && (
              <span className="text-xs text-gray-500">
                +{roles.length - 1} roles
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}