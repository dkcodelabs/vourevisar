import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the logo from the public URL of this project
    const logoResponse = await fetch('https://id-preview--463be30c-e138-4f28-a5b6-49b5e7169340.lovable.app/images/logoEmail.png')
    
    if (!logoResponse.ok) {
      throw new Error(`Failed to fetch logo: ${logoResponse.status}`)
    }

    const logoBlob = await logoResponse.blob()
    const logoArrayBuffer = await logoBlob.arrayBuffer()
    const logoUint8 = new Uint8Array(logoArrayBuffer)

    // Upload to email-assets bucket
    const { data, error } = await supabase.storage
      .from('email-assets')
      .upload('logo.png', logoUint8, {
        contentType: 'image/png',
        upsert: true,
      })

    if (error) throw error

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/email-assets/logo.png`

    return new Response(
      JSON.stringify({ success: true, url: publicUrl, data }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
