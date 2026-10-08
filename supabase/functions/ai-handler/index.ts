import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '')

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    let isAuthenticatedUser = false
    let userId = ''
    let isElevatedRole = false

    if (bearer && bearer !== serviceRoleKey) {
      const { data: userData } = await supabaseClient.auth.getUser(bearer)
      if (userData?.user?.id) {
        isAuthenticatedUser = true
        userId = userData.user.id
        const { data: userRole } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
        isElevatedRole = userRole?.role === 'admin' || userRole?.role === 'owner'
      }
    } else if (bearer === serviceRoleKey) {
      isAuthenticatedUser = true
      isElevatedRole = true
    }

    if (!isAuthenticatedUser) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const primaryKey = Deno.env.get('GEMINI_API_KEY') || ''
    const fallbackKey = Deno.env.get('GEMINI_FALLBACK_API_KEY') || ''
    const apiKeys = [primaryKey, fallbackKey].filter(Boolean)

    if (apiKeys.length === 0) throw new Error('GEMINI_API_KEY não configurada')

    const body = await req.json()
    const { action } = body

    // Buscar configurações globais do banco como fallback
    const { data: dbSettings } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'ai_edital_config')
      .maybeSingle()
    
    const globalConfig = dbSettings?.value || {}
    const defaultModel = globalConfig.model || "gemini-3.5-flash"
    const defaultGenConfig = {
      temperature: globalConfig.temperature ?? 0.1,
      topK: globalConfig.top_k,
      topP: globalConfig.top_p,
      maxOutputTokens: globalConfig.max_tokens,
      responseMimeType: globalConfig.responseMimeType || "text/plain"
    }

    if (action === 'generateContent') {
      const { prompt, contents, generationConfig, model } = body

      // Trava de segurança: tamanho máximo do prompt (30.000 caracteres)
      const rawPrompt = typeof prompt === 'string' ? prompt : JSON.stringify(contents || '')
      if (rawPrompt.length > 30000) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Prompt excede o limite máximo permitido (30.000 caracteres).'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Rate limit por usuário para chamadas de IA do ciclo (30 requisições/hora)
      if (!isElevatedRole && userId) {
        const { data: rateLimitOk } = await supabaseClient
          .rpc('check_rate_limit', {
            p_user_id: userId,
            p_endpoint: 'ai-handler:generateContent',
            p_max_per_hour: 30
          })

        if (rateLimitOk === false) {
          return new Response(JSON.stringify({
            success: false,
            code: 'AI_RATE_LIMITED',
            error: 'Limite de requisições de IA por hora atingido. Aguarde alguns minutos.'
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        await supabaseClient.rpc('log_api_usage', {
          p_user_id: userId,
          p_endpoint: 'ai-handler:generateContent'
        })
      }

      const targetModel = model || defaultModel
      const requestedMaxTokens = typeof generationConfig?.maxOutputTokens === 'number'
        ? generationConfig.maxOutputTokens
        : (defaultGenConfig.maxOutputTokens || 2048)
      // Teto seguro de tokens de saída para o ai-handler (máx 2048)
      const safeMaxTokens = Math.min(Math.max(requestedMaxTokens, 1), 2048)

      const payload = {
        contents: contents || [{ parts: [{ text: prompt }] }],
        generationConfig: {
          ...defaultGenConfig,
          ...generationConfig,
          maxOutputTokens: safeMaxTokens
        }
      }

      console.log(`🤖 Chamando Gemini (${targetModel})...`)
      
      for (let i = 0; i < apiKeys.length; i++) {
        const currentKey = apiKeys[i]
        const isFallback = i > 0
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 50000) // 50s timeout

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${currentKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal
            }
          )

          const result = await response.json().catch(() => null)
          if (result?.error) {
            const isBillingOrLimit = response.status === 402 || response.status === 429 ||
              String(result.error.message || '').toLowerCase().includes('prepayment credits are depleted')

            if (isBillingOrLimit && i < apiKeys.length - 1) {
              console.warn(`[ai-handler] Chave ${i + 1} falhou (${response.status}). Alternando para chave reserva de contingência...`)
              continue
            }

            if (isBillingOrLimit) {
              return new Response(JSON.stringify({
                success: false,
                code: 'AI_BILLING_DEPLETED',
                error: 'Créditos pré-pagos esgotados no Google AI Studio (Erro 402). Adicione créditos ao projeto vouRevisar para restabelecer a IA.'
              }), {
                status: 402,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              })
            }

            throw new Error(result.error.message)
          }

          const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || ''
          return new Response(JSON.stringify({ success: true, text, contingencyUsed: isFallback }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } catch (err) {
          if (err.name === 'AbortError') {
            throw new Error('Timeout: A API do Gemini demorou demais para responder.')
          }
          if (i < apiKeys.length - 1) {
            console.warn(`[ai-handler] Erro na requisição com chave ${i + 1}. Tentando chave reserva...`, err)
            continue
          }
          throw err
        } finally {
          clearTimeout(timeoutId)
        }
      }
    }

    if (action === 'checkStatus') {
      if (!isElevatedRole) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Acesso restrito a administradores.'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const activeKey = primaryKey || fallbackKey
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${activeKey}`
      )
      const data = await response.json()
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Falha ao consultar modelos Gemini')
      }

      const availableModels = Array.isArray(data.models) ? data.models : []
      const normalizedDefault = defaultModel.replace(/^models\//, '')
      const modelIsListed = availableModels.some((model: { name?: string }) =>
        String(model.name || '').replace(/^models\//, '') === normalizedDefault
      )

      // Test active generation capability to detect 402 depleted prepayment credits
      const probeModel = modelIsListed ? defaultModel : (availableModels.find((m: { name?: string }) => m.name?.includes('flash'))?.name?.replace(/^models\//, '') || 'gemini-3.5-flash')
      
      const probePayload = {
        contents: [{ parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 1 }
      }

      let primaryProbeDepleted = false
      if (primaryKey) {
        const probeResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${probeModel}:generateContent?key=${primaryKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(probePayload)
          }
        )
        const probeData = await probeResponse.json().catch(() => null)
        primaryProbeDepleted = probeResponse.status === 402 ||
          String(probeData?.error?.message || '').toLowerCase().includes('prepayment credits are depleted')

        if (!primaryProbeDepleted && probeResponse.ok) {
          return new Response(JSON.stringify({ success: true, data, model: defaultModel, modelIsListed }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      // If primary is depleted, test fallbackKey if available
      if (fallbackKey) {
        const fallbackProbe = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${probeModel}:generateContent?key=${fallbackKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(probePayload)
          }
        )

        if (fallbackProbe.ok) {
          return new Response(JSON.stringify({
            success: true,
            status: 'contingency',
            contingencyMode: true,
            warning: 'Chave primária sem créditos pré-pagos (Erro 402). O sistema está operando temporariamente com a chave reserva gratuita. Recarregue os créditos da chave principal para garantir alta disponibilidade.',
            data,
            model: defaultModel,
            modelIsListed
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      // Both failed or primary failed without fallback
      if (primaryProbeDepleted) {
        return new Response(JSON.stringify({
          success: false,
          status: 'billing_depleted',
          code: 'AI_BILLING_DEPLETED',
          error: 'Créditos pré-pagos esgotados no Google AI Studio (Erro 402). Adicione créditos ao projeto vouRevisar para restabelecer a IA.',
          model: defaultModel,
          modelIsListed
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      throw new Error('Falha na verificação de geração do Gemini')
    }

    throw new Error(`Ação inválida: ${action}`)
  } catch (error) {
    console.error('ERRO EDGE FUNCTION:', error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
