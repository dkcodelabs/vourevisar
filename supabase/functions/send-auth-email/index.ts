import * as React from 'https://esm.sh/react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { renderAsync } from 'https://esm.sh/@react-email/render@0.0.12?deps=react@18.3.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'
import { ConfirmationEmail } from './_templates/confirmation.tsx'
import { RecoveryEmail } from './_templates/recovery.tsx'
import { MagicLinkEmail } from './_templates/magic-link.tsx'
import { EmailChangeEmail } from './_templates/email-change.tsx'
import type { JsonBoundary } from '../_shared/jsonBoundary.ts'

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
    id: string
    email: string
    new_email?: string
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

  const secretValue = secret.includes(',') ? secret.split(',').pop() ?? secret : secret

  // If it's already in whsec_ format, extract the base64 part
  if (secretValue.startsWith('whsec_')) {
    return secretValue
  }

  // If it's a raw base64 string, add the whsec_ prefix
  // The standardwebhooks library expects this prefix
  return `whsec_${secretValue}`
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
  } catch (error: JsonBoundary) {
    console.error('❌ Webhook signature verification failed:', error.message)

    console.log('Webhook headers present:', {
      'webhook-id': !!headers['webhook-id'],
      'webhook-signature': !!headers['webhook-signature'],
      'webhook-timestamp': !!headers['webhook-timestamp'],
    })

    return new Response(
      JSON.stringify({
        error: {
          http_code: 401,
          message: 'Invalid webhook signature',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }

  const { user, email_data } = webhookData
  const { token, token_hash, token_hash_new, redirect_to, email_action_type, site_url } = email_data
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const userName = user.user_metadata?.name || 'Usuário'

  // Versioned path avoids stale email-client and CDN caches when the brand changes.
  const logoUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/vourevisar-mark-dark-v1.png`

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

      case 'recovery': {
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        if (!supabaseUrl || !serviceRoleKey) {
          throw new Error('Supabase service configuration is unavailable')
        }

        const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
        const { data: authMethods, error: authMethodsError } = await serviceClient
          .rpc('internal_get_auth_methods', { p_user_id: user.id })

        if (authMethodsError || !authMethods?.[0]) {
          throw authMethodsError ?? new Error('Authentication methods not found')
        }

        // A Google-only account has no vouRevisar password to recover. Returning
        // success without delivery keeps the public endpoint enumeration-safe
        // and prevents recovery from silently creating a new password method.
        if (!authMethods[0].has_password) {
          console.log('Recovery email suppressed for account without password method', {
            user_id: user.id,
          })
          return new Response(JSON.stringify({ success: true, delivery: 'suppressed' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }

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
      }

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

        if (token_hash_new && user.new_email) {
          const currentEmailHtml = await renderAsync(
            React.createElement(EmailChangeEmail, {
              supabase_url: supabaseUrl,
              token_hash: token_hash_new,
              redirect_to: redirect_to || `${site_url}/perfil`,
              logo_url: logoUrl,
              user_name: userName,
            })
          )

          const newEmailHtml = await renderAsync(
            React.createElement(EmailChangeEmail, {
              supabase_url: supabaseUrl,
              token_hash,
              redirect_to: redirect_to || `${site_url}/perfil`,
              logo_url: logoUrl,
              user_name: userName,
            })
          )

          const [currentEmailResult, newEmailResult] = await Promise.all([
            resend.emails.send({
              from: 'vouRevisar <noreply@vourevisar.com.br>',
              to: [user.email],
              subject,
              html: currentEmailHtml,
            }),
            resend.emails.send({
              from: 'vouRevisar <noreply@vourevisar.com.br>',
              to: [user.new_email],
              subject,
              html: newEmailHtml,
            }),
          ])

          if (currentEmailResult.error) {
            console.error('❌ Resend API error sending email change to current address:', currentEmailResult.error)
            throw currentEmailResult.error
          }

          if (newEmailResult.error) {
            console.error('❌ Resend API error sending email change to new address:', newEmailResult.error)
            throw newEmailResult.error
          }

          console.log('✅ Secure email change emails sent successfully')

          return new Response(
            JSON.stringify({
              success: true,
              message_ids: [currentEmailResult.data?.id, newEmailResult.data?.id].filter(Boolean),
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          )
        }

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

    console.log(`📤 Sending ${email_action_type} email`)

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
  } catch (error: JsonBoundary) {
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
