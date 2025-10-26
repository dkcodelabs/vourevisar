// =====================================================
// COMPONENTE PARA TESTAR HOOK DE ASSINATURA
// =====================================================
import React from 'react'
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, User, Calendar, Clock } from 'lucide-react'

export function SubscriptionTester() {
  const { subscriptionInfo, loading, error, refetch, forceRefresh } = useSubscriptionInfo()

  const getStatusBadge = () => {
    if (!subscriptionInfo) return <Badge variant="secondary">Sem dados</Badge>
    
    const { status, is_active, plan } = subscriptionInfo
    
    if (!is_active) {
      return <Badge variant="destructive">Inativo</Badge>
    }
    
    if (status === 'trial') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Trial</Badge>
    }
    
    if (status === 'active' && plan === 'monthly') {
      return <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200">Mensal</Badge>
    }
    
    if (status === 'active' && plan === 'annual') {
      return <Badge variant="default" className="bg-purple-50 text-purple-700 border-purple-200">Anual</Badge>
    }
    
    return <Badge variant="secondary">{status}</Badge>
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Teste do Hook de Assinatura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controles */}
        <div className="flex gap-2">
          <Button 
            onClick={refetch} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refetch
          </Button>
          <Button 
            onClick={forceRefresh} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <Clock className="w-4 h-4 mr-2" />
            Force Refresh
          </Button>
        </div>

        {/* Estado de carregamento */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Carregando...</span>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <strong>Erro:</strong> {error}
          </div>
        )}

        {/* Informações da assinatura */}
        {!loading && subscriptionInfo && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              {getStatusBadge()}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Plano:</span>
                <div className="text-gray-600">{subscriptionInfo.plan}</div>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <div className="text-gray-600">{subscriptionInfo.status}</div>
              </div>
              <div>
                <span className="font-medium">Ativo:</span>
                <div className="text-gray-600">{subscriptionInfo.is_active ? 'Sim' : 'Não'}</div>
              </div>
              <div>
                <span className="font-medium">Dias restantes:</span>
                <div className="text-gray-600">{subscriptionInfo.days_remaining ?? 'N/A'}</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Trial expira:</span>
                <span className="text-gray-600">{formatDate(subscriptionInfo.trial_ends_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Assinatura expira:</span>
                <span className="text-gray-600">{formatDate(subscriptionInfo.subscription_ends_at)}</span>
              </div>
            </div>

            {/* JSON completo para debug */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-600">
                Ver JSON completo
              </summary>
              <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                {JSON.stringify(subscriptionInfo, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Sem dados */}
        {!loading && !subscriptionInfo && !error && (
          <div className="text-center py-8 text-gray-500">
            Nenhuma informação de assinatura encontrada.
          </div>
        )}
      </CardContent>
    </Card>
  )
}