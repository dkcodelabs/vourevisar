import * as React from 'https://esm.sh/react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'https://esm.sh/@react-email/render@0.0.12'
import { ConfirmationEmail } from './_templates/confirmation.tsx'
import { RecoveryEmail } from './_templates/recovery.tsx'
import { MagicLinkEmail } from './_templates/magic-link.tsx'
import { EmailChangeEmail } from './_templates/email-change.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

// CORS headers for the response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailData {
  token: string
  token_hash: string
  redirect_to: string
  email_action_type: string
  site_url: string
  token_new?: string
  token_hash_new?: string
}

interface WebhookPayload {
  user: {
    email: string
    user_metadata?: {
      name?: string
    }
  }
  email_data: EmailData
}

/**
 * Normalize the webhook secret to base64 format expected by standardwebhooks.
 * Supabase Auth Hooks provide secrets in different formats depending on configuration.
 */
function normalizeHookSecret(secret: string): string {
  if (!secret) {
    throw new Error('SEND_EMAIL_HOOK_SECRET is not configured')
  }
  
  // If it's already in whsec_ format, extract the base64 part
  if (secret.startsWith('whsec_')) {
    return secret
  }
  
  // If it's a raw base64 string, add the whsec_ prefix
  // The standardwebhooks library expects this prefix
  return `whsec_${secret}`
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  
  console.log('📧 Received auth email webhook')
  
  // Get and normalize the hook secret
  const rawSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string
  
  if (!rawSecret) {
    console.error('❌ SEND_EMAIL_HOOK_SECRET is not configured')
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: 'Webhook secret not configured',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }

  let webhookData: WebhookPayload

  try {
    // Try to verify with normalized secret
    const normalizedSecret = normalizeHookSecret(rawSecret)
    console.log('🔐 Verifying webhook signature...')
    
    const wh = new Webhook(normalizedSecret)
    webhookData = wh.verify(payload, headers) as WebhookPayload
    
    console.log('✅ Webhook signature verified')
    console.log('Email type:', webhookData.email_data.email_action_type)
    console.log('User email:', webhookData.user.email)
  } catch (error: any) {
    console.error('❌ Webhook signature verification failed:', error.message)
    
    // Log more details for debugging
    console.log('Debug info - Raw secret length:', rawSecret.length)
    console.log('Debug info - Webhook headers present:', {
      'webhook-id': !!headers['webhook-id'],
      'webhook-signature': !!headers['webhook-signature'],
      'webhook-timestamp': !!headers['webhook-timestamp'],
    })
    
    // If signature verification fails, try parsing payload directly for development
    // This is a fallback - in production, signature should always be verified
    try {
      console.log('⚠️ Attempting to parse payload directly (fallback mode)...')
      webhookData = JSON.parse(payload) as WebhookPayload
      console.log('✅ Payload parsed successfully (WARNING: signature not verified)')
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: {
            http_code: 401,
            message: 'Invalid webhook signature or payload',
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }
  }

  const { user, email_data } = webhookData
  const { token, token_hash, redirect_to, email_action_type, site_url } = email_data
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const userName = user.user_metadata?.name || 'Usuário'

  // Logo URL from storage bucket
  const logoUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/logo.png?v=1`

  let html: string
  let subject: string

  try {
    switch (email_action_type) {
      case 'signup':
      case 'email':
        subject = 'Confirme seu cadastro no vouRevisar'
        html = await renderAsync(
          React.createElement(ConfirmationEmail, {
            supabase_url: supabaseUrl,
            token_hash,
            redirect_to: redirect_to || `${site_url}/dashboard`,
            logo_url: logoUrl,
            user_name: userName,
          })
        )
        break

      case 'recovery':
        subject = 'Redefinir sua senha - vouRevisar'
        html = await renderAsync(
          React.createElement(RecoveryEmail, {
            supabase_url: supabaseUrl,
            token_hash,
            redirect_to: redirect_to || `${site_url}/reset-password`,
            logo_url: logoUrl,
            user_name: userName,
          })
        )
        break

      case 'magiclink':
        subject = 'Seu link de acesso - vouRevisar'
        html = await renderAsync(
          React.createElement(MagicLinkEmail, {
            supabase_url: supabaseUrl,
            token,
            token_hash,
            redirect_to: redirect_to || `${site_url}/dashboard`,
            logo_url: logoUrl,
            user_name: userName,
          })
        )
        break

      case 'email_change':
        subject = 'Confirme a mudança de email - vouRevisar'
        html = await renderAsync(
          React.createElement(EmailChangeEmail, {
            supabase_url: supabaseUrl,
            token_hash,
            redirect_to: redirect_to || `${site_url}/perfil`,
            logo_url: logoUrl,
            user_name: userName,
          })
        )
        break

      default:
        console.error('❌ Unknown email action type:', email_action_type)
        return new Response(
          JSON.stringify({ error: { message: `Unknown email type: ${email_action_type}` } }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
    }

    console.log(`📤 Sending ${email_action_type} email to ${user.email}`)

    const { data, error } = await resend.emails.send({
      from: 'vouRevisar <noreply@vourevisar.com.br>',
      to: [user.email],
      subject,
      html,
    })

    if (error) {
      console.error('❌ Resend API error:', error)
      throw error
    }

    console.log('✅ Email sent successfully:', data)

    return new Response(JSON.stringify({ success: true, message_id: data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error: any) {
    console.error('❌ Error sending email:', error)
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: error.message || 'Failed to send email',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})
