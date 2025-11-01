// =====================================================
// SETUP RÁPIDO PARA TORNAR VOCÊ ADMIN/OWNER
// =====================================================
import React, { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function QuickAdminSetup() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const makeOwner = async () => {
    setLoading(true)
    setResult('')

    try {
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setResult('❌ Você precisa estar logado')
        return
      }

      console.log('🔧 Tentando tornar owner:', user.email)

      // Verificar se já tem role primeiro (pode ter múltiplas)
      const { data: existingRoles, error: checkError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (checkError) {
        console.error('❌ Erro ao verificar role existente:', checkError)
        setResult(`❌ Erro ao verificar roles: ${checkError.message}`)
        return
      }

      if (existingRoles && existingRoles.length > 0) {
        const roles = existingRoles.map(r => r.role).join(', ')
        const hasOwner = existingRoles.some(r => r.role === 'owner')
        
        if (hasOwner) {
          setResult(`✅ Você já é OWNER! Roles atuais: ${roles}`)
        } else {
          setResult(`⚠️ Você já tem roles: ${roles}. Para ser owner, use o gerenciamento de usuários.`)
        }
        return
      }

      // Método 1: Inserir diretamente na tabela user_roles
      const { data: insertData, error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'owner',
          assigned_by: user.id,
          assigned_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('❌ Erro no insert:', insertError)
        setResult(`❌ Erro ao inserir role: ${insertError.message}`)
        return
      }

      console.log('✅ Role inserida:', insertData)

      // Verificar se funcionou
      const { data: checkData, error: checkError2 } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (checkError2) {
        setResult(`⚠️ Role inserida mas erro na verificação: ${checkError2.message}`)
        return
      }

      if (checkData?.role === 'owner') {
        setResult(`✅ Sucesso! Você agora é OWNER. Recarregue a página.`)
        
        // Forçar refresh dos hooks
        window.dispatchEvent(new CustomEvent('force-profile-refresh', { 
          detail: { forceAll: true, timestamp: Date.now() } 
        }))
        
        // Recarregar após 2 segundos
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setResult(`❌ Algo deu errado. Role encontrada: ${checkData?.role}`)
      }

    } catch (error) {
      console.error('❌ Erro geral:', error)
      setResult(`❌ Erro: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const setupSubscription = async () => {
    setLoading(true)
    setResult('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setResult('❌ Você precisa estar logado')
        return
      }

      console.log('💳 Configurando assinatura anual para:', user.email)

      // Criar assinatura anual
      const subscriptionEndDate = new Date()
      subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1) // 1 ano

      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          plan: 'annual',
          status: 'active',
          subscription_started_at: new Date().toISOString(),
          subscription_ends_at: subscriptionEndDate.toISOString(),
          updated_at: new Date().toISOString()
        })

      if (subError) {
        setResult(`❌ Erro ao criar assinatura: ${subError.message}`)
        return
      }

      setResult(`✅ Assinatura anual criada! Expira em ${subscriptionEndDate.toLocaleDateString('pt-BR')}`)
      
      // Forçar refresh
      window.dispatchEvent(new CustomEvent('subscription-changed', { 
        detail: { userId: user.id, action: 'activate_annual', timestamp: Date.now() } 
      }))

    } catch (error) {
      setResult(`❌ Erro: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const checkCurrentStatus = async () => {
    setLoading(true)
    setResult('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setResult('❌ Você precisa estar logado')
        return
      }

      // Verificar roles (pode ter múltiplas)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      // Verificar assinatura
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      const roles = roleData && roleData.length > 0 
        ? roleData.map(r => r.role).join(', ')
        : 'Nenhuma'

      const status = `
📧 Email: ${user.email}
🔑 Roles: ${roles} ${roleData && roleData.length > 1 ? '⚠️ (MÚLTIPLAS!)' : ''}
💳 Plano: ${subData?.plan || 'Nenhum'}
📊 Status: ${subData?.status || 'Inativo'}
📅 Expira: ${subData?.subscription_ends_at ? new Date(subData.subscription_ends_at).toLocaleDateString('pt-BR') : 'N/A'}
      `

      setResult(status)

    } catch (error) {
      setResult(`❌ Erro: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const fixDuplicateRoles = async () => {
    setLoading(true)
    setResult('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setResult('❌ Você precisa estar logado')
        return
      }

      console.log('🔧 Corrigindo roles duplicadas para:', user.email)

      // Buscar todas as roles do usuário
      const { data: allRoles, error: fetchError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        setResult(`❌ Erro ao buscar roles: ${fetchError.message}`)
        return
      }

      if (!allRoles || allRoles.length <= 1) {
        setResult('✅ Não há roles duplicadas para corrigir.')
        return
      }

      console.log('🔧 Roles encontradas:', allRoles.length)

      // Manter apenas a role mais alta (owner > admin > moderator > user)
      const roleHierarchy = { owner: 4, admin: 3, moderator: 2, user: 1 }
      const bestRole = allRoles.reduce((prev, current) => 
        roleHierarchy[current.role] > roleHierarchy[prev.role] ? current : prev
      )

      // Deletar todas as outras roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)
        .neq('id', bestRole.id)

      if (deleteError) {
        setResult(`❌ Erro ao deletar roles duplicadas: ${deleteError.message}`)
        return
      }

      setResult(`✅ Roles duplicadas removidas! Mantida: ${bestRole.role.toUpperCase()}`)

      // Forçar refresh
      window.dispatchEvent(new CustomEvent('force-profile-refresh', { 
        detail: { forceAll: true, timestamp: Date.now() } 
      }))

    } catch (error) {
      setResult(`❌ Erro: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚡ Setup Rápido - Recuperar Acesso Admin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Use estes botões para recuperar o acesso administrativo perdido. 
            <strong> Execute apenas se você é o proprietário do sistema!</strong>
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={checkCurrentStatus}
            disabled={loading}
            variant="outline"
          >
            🔍 Verificar Status Atual
          </Button>
          
          <Button 
            onClick={makeOwner}
            disabled={loading}
            variant="default"
          >
            👑 Tornar-me Owner
          </Button>
          
          <Button 
            onClick={setupSubscription}
            disabled={loading}
            variant="secondary"
          >
            💎 Ativar Assinatura Anual
          </Button>
          
          <Button 
            onClick={fixDuplicateRoles}
            disabled={loading}
            variant="destructive"
          >
            🔧 Corrigir Roles Duplicadas
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm whitespace-pre-line">
            {result}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <strong>Como usar:</strong>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Clique em "Verificar Status Atual" para ver sua situação</li>
            <li>Se não for owner, clique em "Tornar-me Owner"</li>
            <li>Se quiser assinatura anual, clique em "Ativar Assinatura Anual"</li>
            <li>Recarregue a página após as alterações</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}