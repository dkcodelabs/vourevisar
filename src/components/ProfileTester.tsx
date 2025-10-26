// =====================================================
// TESTE COMPLETO DO SISTEMA INTEGRADO
// =====================================================
import React from 'react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { UserBadge, CompactUserBadge, DetailedUserInfo } from '@/components/UserBadge'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, User, Settings } from 'lucide-react'

export function ProfileTester() {
  const { 
    profile, 
    loading, 
    error, 
    forceRefresh,
    isOwner,
    isAdmin,
    isModerator,
    hasActiveSubscription,
    isPaidUser,
    isTrialUser,
    displayBadge,
    badgeColor
  } = useUserProfile()

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Teste do Sistema Integrado - Role + Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controles */}
          <div className="flex gap-2">
            <Button 
              onClick={forceRefresh} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Forçar Refresh
            </Button>
          </div>

          {/* Estado de carregamento */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Carregando perfil...</span>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <strong>Erro:</strong> {error}
            </div>
          )}

          {/* Informações do perfil */}
          {!loading && profile && (
            <div className="space-y-6">
              {/* Badges de exemplo */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Badges:</h3>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Padrão:</span>
                    <UserBadge />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Compacto:</span>
                    <CompactUserBadge />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Grande:</span>
                    <UserBadge size="lg" />
                  </div>
                </div>
              </div>

              {/* Informações detalhadas */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Informações Completas:</h3>
                <DetailedUserInfo />
              </div>

              {/* Status detalhado */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Role:</h4>
                  <div className="space-y-1">
                    <div>Tipo: <span className="font-mono">{profile.role}</span></div>
                    <div>É Owner: {isOwner ? '✅' : '❌'}</div>
                    <div>É Admin: {isAdmin ? '✅' : '❌'}</div>
                    <div>É Moderador: {isModerator ? '✅' : '❌'}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Assinatura:</h4>
                  <div className="space-y-1">
                    <div>Plano: <span className="font-mono">{profile.subscription?.plan || 'N/A'}</span></div>
                    <div>Status: <span className="font-mono">{profile.subscription?.status || 'N/A'}</span></div>
                    <div>Ativo: {hasActiveSubscription ? '✅' : '❌'}</div>
                    <div>Pago: {isPaidUser ? '✅' : '❌'}</div>
                    <div>Trial: {isTrialUser ? '✅' : '❌'}</div>
                    <div>Dias restantes: {profile.subscription?.days_remaining ?? 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Badge display info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Badge Display:</h4>
                <div className="space-y-1 text-sm">
                  <div>Texto: <span className="font-mono">{displayBadge}</span></div>
                  <div>Cor: <span className="font-mono">{badgeColor}</span></div>
                </div>
              </div>

              {/* JSON completo para debug */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-600">
                  Ver dados completos (JSON)
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                  {JSON.stringify(profile, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Sem dados */}
          {!loading && !profile && !error && (
            <div className="text-center py-8 text-gray-500">
              Usuário não está logado.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Como Testar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>1. Teste básico:</strong> O badge deve mostrar seu role ou tipo de assinatura atual
            </div>
            <div>
              <strong>2. Teste de atualização:</strong> Vá no modal de gerenciamento, altere sua assinatura, e veja se o badge atualiza automaticamente
            </div>
            <div>
              <strong>3. Prioridade do badge:</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• Owner/Admin/Moderador sempre aparecem primeiro</li>
                <li>• Depois assinaturas pagas (Mensal/Anual)</li>
                <li>• Depois Free (7d)</li>
                <li>• Por último Free</li>
              </ul>
            </div>
            <div>
              <strong>4. Integração:</strong> Use <code>&lt;UserBadge /&gt;</code> ou <code>&lt;CompactUserBadge /&gt;</code> em qualquer lugar da sua aplicação
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}