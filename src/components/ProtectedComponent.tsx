// =====================================================
// COMPONENTES PROTEGIDOS POR ROLE
// =====================================================
import React from 'react'
import { useUserRole, AppRole } from '@/hooks/useUserRole'

interface ProtectedComponentProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingComponent?: React.ReactNode
}

// =====================================================
// OWNER ONLY
// =====================================================
export function OwnerOnly({ 
  children, 
  fallback = null,
  loadingComponent = <div className="animate-pulse">Verificando permissões...</div>
}: ProtectedComponentProps) {
  const { isOwner, loading } = useUserRole()

  if (loading) return <>{loadingComponent}</>
  if (!isOwner) return <>{fallback}</>

  return <>{children}</>
}

// =====================================================
// ADMIN OR HIGHER
// =====================================================
export function AdminOnly({ 
  children, 
  fallback = null,
  loadingComponent = <div className="animate-pulse">Verificando permissões...</div>
}: ProtectedComponentProps) {
  const { isAdmin, loading } = useUserRole()

  if (loading) return <>{loadingComponent}</>
  if (!isAdmin) return <>{fallback}</>

  return <>{children}</>
}

// =====================================================
// MODERATOR OR HIGHER
// =====================================================
export function ModeratorOnly({ 
  children, 
  fallback = null,
  loadingComponent = <div className="animate-pulse">Verificando permissões...</div>
}: ProtectedComponentProps) {
  const { isModerator, loading } = useUserRole()

  if (loading) return <>{loadingComponent}</>
  if (!isModerator) return <>{fallback}</>

  return <>{children}</>
}

// =====================================================
// COMPONENTE GENÉRICO COM ROLE ESPECÍFICA
// =====================================================
interface RequireRoleProps extends ProtectedComponentProps {
  role: AppRole
  orHigher?: boolean
}

export function RequireRole({ 
  children, 
  role,
  orHigher = false,
  fallback = null,
  loadingComponent = <div className="animate-pulse">Verificando permissões...</div>
}: RequireRoleProps) {
  const { hasRole, hasRoleOrHigher, loading } = useUserRole()

  if (loading) return <>{loadingComponent}</>

  const hasPermission = orHigher ? hasRoleOrHigher(role) : hasRole(role)
  if (!hasPermission) return <>{fallback}</>

  return <>{children}</>
}

// =====================================================
// COMPONENTE PARA USUÁRIOS AUTENTICADOS
// =====================================================
export function AuthenticatedOnly({ 
  children, 
  fallback = <div>Você precisa estar logado para ver este conteúdo.</div>,
  loadingComponent = <div className="animate-pulse">Carregando...</div>
}: ProtectedComponentProps) {
  const { user, loading } = useUserRole()

  if (loading) return <>{loadingComponent}</>
  if (!user) return <>{fallback}</>

  return <>{children}</>
}