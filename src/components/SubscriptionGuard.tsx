// =====================================================
// COMPONENTES PARA PROTEGER CONTEÚDO POR ASSINATURA
// =====================================================
import React from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { AlertTriangle, Crown, Clock, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SubscriptionGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingComponent?: React.ReactNode
  requiresPaid?: boolean // Se true, trial não é suficiente
}

// =====================================================
// GUARD PRINCIPAL - REQUER ASSINATURA ATIVA
// =====================================================
export function SubscriptionGuard({ 
  children, 
  fallback,
  loadingComponent = <div className="animate-pulse">Verificando assinatura...</div>,
  requiresPaid = false
}: SubscriptionGuardProps) {
  const { isActive, isTrial, loading, daysRemaining, planName } = useSubscription()

  if (loading) return <>{loadingComponent}</>

  // Se requer pago e está em trial, bloquear
  if (requiresPaid && isTrial) {
    return <>{fallback || <PaidOnlyMessage />}</>
  }

  // Se não tem assinatura ativa, bloquear
  if (!isActive) {
    return <>{fallback || <ExpiredMessage />}</>
  }

  return <>{children}</>
}

// =====================================================
// GUARD PARA CONTEÚDO APENAS PAGO
// =====================================================
export function PaidOnlyGuard({ 
  children, 
  fallback,
  loadingComponent = <div className="animate-pulse">Verificando assinatura...</div>
}: Omit<SubscriptionGuardProps, 'requiresPaid'>) {
  const { isPaid, loading } = useSubscription()

  if (loading) return <>{loadingComponent}</>
  if (!isPaid) return <>{fallback || <PaidOnlyMessage />}</>

  return <>{children}</>
}

// =====================================================
// COMPONENTE DE AVISO - TRIAL EXPIRANDO
// =====================================================
export function TrialExpiringWarning() {
  const { isTrial, daysRemaining, isActive } = useSubscription()
  const navigate = useNavigate()

  if (!isTrial || !isActive || daysRemaining > 3) return null

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 font-sans">
      <div className="flex items-center">
        <Clock className="w-5 h-5 text-orange-600 mr-3" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-orange-800">
            Seu teste grátis expira em {daysRemaining} dia(s)
          </h3>
          <p className="text-sm text-orange-700 mt-1">
            Assine um plano para continuar usando todas as funcionalidades.
          </p>
        </div>
        <button 
          onClick={() => navigate('/planos')}
          className="ml-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs font-semibold"
        >
          Assinar Agora
        </button>
      </div>
    </div>
  )
}

// =====================================================
// COMPONENTE DE STATUS DA ASSINATURA
// =====================================================
export function SubscriptionStatus() {
  const navigate = useNavigate()
  const { 
    subscription, 
    loading, 
    isActive, 
    isTrial, 
    isPaid, 
    isExpired, 
    daysRemaining, 
    planName 
  } = useSubscription()

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-sans">
        <div className="animate-pulse flex items-center">
          <div className="w-5 h-5 bg-gray-300 rounded mr-3"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 font-sans">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
          <span className="text-red-700">Erro ao carregar assinatura</span>
        </div>
      </div>
    )
  }

  const getStatusColor = () => {
    if (isExpired) return 'red'
    if (isTrial) return 'orange'
    if (isPaid) return 'green'
    return 'gray'
  }

  const getStatusIcon = () => {
    if (isExpired) return <AlertTriangle className="w-5 h-5" />
    if (isTrial) return <Clock className="w-5 h-5" />
    if (isPaid) return <Crown className="w-5 h-5" />
    return <CreditCard className="w-5 h-5" />
  }

  const color = getStatusColor()

  return (
    <div className={`bg-${color}-50 border border-${color}-200 rounded-lg p-4 font-sans`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`text-${color}-600 mr-3`}>
            {getStatusIcon()}
          </div>
          <div>
            <h3 className={`text-sm font-medium text-${color}-800`}>
              {planName}
            </h3>
            <p className={`text-sm text-${color}-700`}>
              {isActive 
                ? (daysRemaining > 50000 ? 'Acesso ilimitado (Administrador)' : `${daysRemaining} dias restantes`)
                : 'Assinatura expirada'
              }
            </p>
          </div>
        </div>
        
        {(isTrial || isExpired) && (
          <button 
            onClick={() => navigate('/planos')}
            className={`px-4 py-2 bg-${color}-600 hover:bg-${color}-700 text-white rounded-lg transition-colors text-xs font-semibold`}
          >
            {isTrial ? 'Assinar' : 'Renovar'}
          </button>
        )}
      </div>
    </div>
  )
}

// =====================================================
// MENSAGENS DE BLOQUEIO
// =====================================================
function PaidOnlyMessage() {
  const navigate = useNavigate()
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center font-sans">
      <Crown className="w-12 h-12 text-blue-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-blue-900 mb-2">
        Conteúdo Premium
      </h3>
      <p className="text-blue-700 mb-4">
        Esta funcionalidade está disponível apenas para assinantes pagos.
      </p>
      <button 
        onClick={() => navigate('/planos')}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-md shadow-blue-500/20"
      >
        Assinar Plano Premium
      </button>
    </div>
  )
}

function ExpiredMessage() {
  const navigate = useNavigate()
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center font-sans">
      <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-red-900 mb-2">
        Assinatura Expirada
      </h3>
      <p className="text-red-700 mb-4">
        Sua assinatura expirou. Renove para continuar usando o sistema.
      </p>
      <button 
        onClick={() => navigate('/planos')}
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold shadow-md shadow-red-500/20"
      >
        Renovar Assinatura
      </button>
    </div>
  )
}