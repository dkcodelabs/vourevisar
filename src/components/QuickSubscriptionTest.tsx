// =====================================================
// TESTE RÁPIDO PARA VERIFICAR SE O HOOK FUNCIONA
// =====================================================
import React, { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Json } from '@/integrations/supabase/types'
import { invokeUserRpc } from '@/services/userRpcService'

export function QuickSubscriptionTest() {
  const [result, setResult] = useState<Json | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testFunction = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Testing get_subscription_info...')
      
      // Primeiro verificar se o usuário está logado
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuário não está logado')
      }
      
      console.log('User ID:', user.id)
      
      // Testar a função pela fronteira segura
      const data = await invokeUserRpc<Json>('get_subscription_info', { check_user_id: user.id })
      
      console.log('Function result:', data)
      setResult(data)
      
    } catch (err) {
      console.error('Test error:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #ccc', 
      borderRadius: '8px',
      margin: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>🧪 Teste Rápido - Função get_subscription_info</h3>
      
      <button 
        onClick={testFunction}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Testando...' : 'Testar Função'}
      </button>

      {error && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #f44336',
          borderRadius: '4px',
          color: '#d32f2f'
        }}>
          <strong>❌ Erro:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#e8f5e8', 
          border: '1px solid #4caf50',
          borderRadius: '4px'
        }}>
          <strong>✅ Resultado:</strong>
          <pre style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
        <strong>Instruções:</strong>
        <ol>
          <li><strong>Execute o arquivo <code>database/29_fix_subscription_types.sql</code> no Supabase Dashboard</strong></li>
          <li>Certifique-se de que você está logado no sistema</li>
          <li>Clique em "Testar Função" acima</li>
          <li>Se funcionar: ✅ JSON com dados da assinatura</li>
          <li>Se der 404: ❌ Função não foi criada</li>
          <li>Se der erro de tipo: ❌ Execute o SQL novamente</li>
        </ol>
        
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
          <strong>⚠️ Importante:</strong> Execute o arquivo <code>29_fix_subscription_types.sql</code> (não o 28) - ele corrige os problemas de tipo de dados.
        </div>
      </div>
    </div>
  )
}
