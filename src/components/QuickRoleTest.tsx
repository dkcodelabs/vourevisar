// =====================================================
// TESTE RÁPIDO DE ROLES - ADICIONE EM QUALQUER LUGAR
// =====================================================
import React from 'react'

// Teste básico sem dependências externas
export default function QuickRoleTest() {
  const [testResult, setTestResult] = React.useState('Testando...')

  React.useEffect(() => {
    // Teste simples de conexão com Supabase
    const testSupabase = async () => {
      try {
        // Importa dinamicamente para evitar erros
        const { supabase } = await import('@/lib/supabase')
        
        // Testa conexão
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          setTestResult(`❌ Erro de conexão: ${error.message}`)
          return
        }

        if (!user) {
          setTestResult('⚠️ Usuário não está logado')
          return
        }

        // Testa busca de roles
        const { data: roles, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)

        if (roleError) {
          setTestResult(`❌ Erro ao buscar roles: ${roleError.message}`)
          return
        }

        const userRoles = roles?.map(r => r.role) || []
        const isOwner = userRoles.includes('owner')
        const isAdmin = userRoles.includes('admin')

        setTestResult(`
✅ SUCESSO! Sistema funcionando!
👤 Usuário: ${user.email}
🏷️ Roles: ${userRoles.join(', ') || 'Nenhuma'}
👑 É Owner: ${isOwner ? 'SIM' : 'NÃO'}
🛡️ É Admin: ${isAdmin ? 'SIM' : 'NÃO'}
        `)

      } catch (err) {
        setTestResult(`❌ Erro geral: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      }
    }

    testSupabase()
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#1f2937',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 9999,
      whiteSpace: 'pre-line'
    }}>
      <h4 style={{ margin: '0 0 8px 0', color: '#60a5fa' }}>
        🧪 Teste de Roles
      </h4>
      <div>{testResult}</div>
    </div>
  )
}