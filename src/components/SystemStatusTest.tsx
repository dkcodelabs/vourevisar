// =====================================================
// TESTE DE STATUS DO SISTEMA - DIAGNÓSTICO COMPLETO
// =====================================================
import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { invokeUserRpc } from '@/services/userRpcService'
import { useUserRole } from '@/hooks/useUserRole'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserBadge } from '@/components/UserBadge'
import type { PostgrestError } from '@supabase/supabase-js'
import type { Json } from '@/integrations/supabase/types'

type DiagnosticError = PostgrestError | Error | unknown

interface SystemDiagnosticResults {
  currentUser?: {
    id?: string
    email?: string
    status: string
  }
  role?: {
    data: { role: string } | null
    error: PostgrestError | null
    isOwner: boolean
    isAdmin: boolean
  }
  subscription?: {
    rpcData: Json
    rpcError: DiagnosticError
    hookData: ReturnType<typeof useSubscriptionInfo>['subscriptionInfo']
  }
  directSubscription?: {
    data: Record<string, unknown> | null
    error: PostgrestError | null
  }
  rpcTest?: {
    data: Json
    error: DiagnosticError
    status: string
  }
  error?: DiagnosticError
}

export function SystemStatusTest() {
  const [testResults, setTestResults] = useState<SystemDiagnosticResults>({})
  const [loading, setLoading] = useState(false)
  
  const { user, isOwner, isAdmin, loading: roleLoading } = useUserRole()
  const { profile, displayBadge, badgeColor } = useUserProfile()
  const { subscriptionInfo } = useSubscriptionInfo()

  const runDiagnostic = useCallback(async () => {
    setLoading(true)
    const results: SystemDiagnosticResults = {}

    try {
      // 1. Verificar usuário atual
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      results.currentUser = {
        id: currentUser?.id,
        email: currentUser?.email,
        status: currentUser ? 'Logado' : 'Não logado'
      }

      if (currentUser) {
        // 2. Verificar role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .maybeSingle()

        results.role = {
          data: roleData,
          error: roleError,
          isOwner,
          isAdmin
        }

        // 3. Verificar assinatura via fronteira segura
        let subData: Json = null
        let subError: DiagnosticError = null
        try {
          subData = await invokeUserRpc<Json>('get_subscription_info', { check_user_id: currentUser.id })
        } catch (error) {
          subError = error
        }

        results.subscription = {
          rpcData: subData,
          rpcError: subError,
          hookData: subscriptionInfo
        }

        // 4. Verificar tabela user_subscriptions diretamente
        const { data: directSubData, error: directSubError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle()

        results.directSubscription = {
          data: directSubData as Record<string, unknown> | null,
          error: directSubError
        }

        // 5. Testar função get_subscription_info pela fronteira segura
        try {
          const testRpc = await invokeUserRpc<Json>('get_subscription_info', { check_user_id: currentUser.id })

          results.rpcTest = {
            data: testRpc,
            error: null,
            status: 'Função funcionando'
          }
        } catch (err) {
          results.rpcTest = {
            data: null,
            error: err,
            status: 'Erro ao testar função'
          }
        }
      }

    } catch (error) {
      results.error = error
    }

    setTestResults(results)
    setLoading(false)
  }, [isAdmin, isOwner, subscriptionInfo])

  useEffect(() => {
    runDiagnostic()
  }, [runDiagnostic])

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🔍 Diagnóstico do Sistema
            <Button onClick={runDiagnostic} disabled={loading}>
              {loading ? 'Testando...' : 'Executar Teste'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Status do Usuário */}
          <div>
            <h3 className="font-semibold mb-2">👤 Status do Usuário</h3>
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p><strong>Email:</strong> {testResults.currentUser?.email || 'N/A'}</p>
              <p><strong>Status:</strong> {testResults.currentUser?.status || 'N/A'}</p>
              <p><strong>ID:</strong> {testResults.currentUser?.id || 'N/A'}</p>
            </div>
          </div>

          {/* Badge Atual */}
          <div>
            <h3 className="font-semibold mb-2">🏷️ Badge Atual</h3>
            <div className="flex items-center gap-2">
              <UserBadge />
              <span className="text-sm text-gray-600">
                ({displayBadge} - {badgeColor})
              </span>
            </div>
          </div>

          {/* Role/Permissões */}
          <div>
            <h3 className="font-semibold mb-2">🔑 Permissões</h3>
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <p><strong>É Owner:</strong> {isOwner ? '✅ Sim' : '❌ Não'}</p>
              <p><strong>É Admin:</strong> {isAdmin ? '✅ Sim' : '❌ Não'}</p>
              <p><strong>Role na DB:</strong> {testResults.role?.data?.role || 'Nenhuma'}</p>
              {testResults.role?.error && (
                <p className="text-red-600"><strong>Erro:</strong> {testResults.role.error.message}</p>
              )}
            </div>
          </div>

          {/* Assinatura */}
          <div>
            <h3 className="font-semibold mb-2">💳 Assinatura</h3>
            <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
              <div>
                <strong>Via Hook:</strong>
                {subscriptionInfo ? (
                  <div className="ml-2">
                    <p>Plano: {subscriptionInfo.plan}</p>
                    <p>Status: {subscriptionInfo.status}</p>
                    <p>Ativo: {subscriptionInfo.is_active ? 'Sim' : 'Não'}</p>
                  </div>
                ) : (
                  <span className="text-gray-500"> Nenhuma</span>
                )}
              </div>
              
              <div>
                <strong>Via RPC:</strong>
                {testResults.subscription?.rpcData ? (
                  <pre className="ml-2 text-xs bg-white p-2 rounded">
                    {JSON.stringify(testResults.subscription.rpcData, null, 2)}
                  </pre>
                ) : (
                  <span className="text-gray-500"> Nenhuma</span>
                )}
                {testResults.subscription?.rpcError && (
                  <p className="text-red-600 ml-2">
                    Erro: {testResults.subscription.rpcError instanceof Error ? testResults.subscription.rpcError.message : String(testResults.subscription.rpcError)}
                  </p>
                )}
              </div>

              <div>
                <strong>Tabela Direta:</strong>
                {testResults.directSubscription?.data ? (
                  <pre className="ml-2 text-xs bg-white p-2 rounded">
                    {JSON.stringify(testResults.directSubscription.data, null, 2)}
                  </pre>
                ) : (
                  <span className="text-gray-500"> Nenhuma</span>
                )}
              </div>
            </div>
          </div>

          {/* Links de Teste */}
          <div>
            <h3 className="font-semibold mb-2">🔗 Links de Teste</h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.location.href = '/gerenciamento'}
              >
                📋 Ir para Gerenciamento
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  // Forçar refresh do badge
                  window.dispatchEvent(new CustomEvent('force-profile-refresh', { 
                    detail: { forceAll: true, timestamp: Date.now() } 
                  }))
                }}
              >
                🔄 Forçar Refresh Badge
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={async () => {
                  // Testar função SQL diretamente
                  try {
                    if (!user?.id) throw new Error('Usuário não está logado')
                    const data = await invokeUserRpc('get_subscription_info', { check_user_id: user.id })
                    alert(`Resultado: ${JSON.stringify({ data, error: null }, null, 2)}`)
                  } catch (err) {
                    alert(`Erro: ${err}`)
                  }
                }}
              >
                🧪 Testar RPC
              </Button>
            </div>
          </div>

          {/* Resultado Completo */}
          <details>
            <summary className="cursor-pointer font-semibold">🔍 Resultado Completo (Debug)</summary>
            <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-96">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </details>

        </CardContent>
      </Card>
    </div>
  )
}
