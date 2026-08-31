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

    if (bearer && bearer !== serviceRoleKey) {
      const { data: userData } = await supabaseClient.auth.getUser(bearer)
      isAuthenticatedUser = Boolean(userData?.user?.id)
    }

    if (!isAuthenticatedUser && bearer !== serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada')

    const body = await req.json()
    const { action } = body

    // Buscar configurações globais do banco como fallback
    const { data: dbSettings } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'ai_edital_config')
      .maybeSingle()
    
    const globalConfig = dbSettings?.value || {}
    const defaultModel = globalConfig.model || "gemini-2.5-flash"
    const defaultGenConfig = {
      temperature: globalConfig.temperature ?? 0.1,
      topK: globalConfig.top_k,
      topP: globalConfig.top_p,
      maxOutputTokens: globalConfig.max_tokens,
      responseMimeType: globalConfig.responseMimeType || "text/plain"
    }

    if (action === 'generateContent') {
      const { prompt, contents, generationConfig, model } = body
      const targetModel = model || defaultModel
      
      const payload = {
        contents: contents || [{ parts: [{ text: prompt }] }],
        generationConfig: { ...defaultGenConfig, ...generationConfig }
      }

      console.log(`🤖 Chamando Gemini (${targetModel})...`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 50000) // 50s timeout

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          }
        )

        const result = await response.json()
        if (result.error) throw new Error(result.error.message)

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        return new Response(JSON.stringify({ success: true, text }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (err) {
        if (err.name === 'AbortError') {
          throw new Error('Timeout: A API do Gemini demorou demais para responder.')
        }
        throw err;
      } finally {
        clearTimeout(timeoutId)
      }
    }

    if (action === 'uploadFile') {
      const { fileBase64, fileName, fileType } = body
      console.log(`📤 Proxying file upload to Google AI: ${fileName}`)

      const metadataRes = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': (fileBase64.length * 0.75).toString(), // Aprox
            'X-Goog-Upload-Header-Content-Type': fileType,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ file: { display_name: fileName } })
        }
      )

      const uploadUrl = metadataRes.headers.get('X-Goog-Upload-URL')
      if (!uploadUrl) throw new Error('Falha ao obter URL de upload')

      const binary = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0))
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize',
        },
        body: binary
      })

      const uploadResult = await uploadRes.json()
      return new Response(JSON.stringify({ success: true, data: uploadResult.file }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'checkStatus') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
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

      return new Response(JSON.stringify({ success: true, data, model: defaultModel, modelIsListed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
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
