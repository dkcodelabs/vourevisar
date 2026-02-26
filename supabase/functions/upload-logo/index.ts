import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Fetch the logo from the preview URL
  const logoResponse = await fetch('https://id-preview--463be30c-e138-4f28-a5b6-49b5e7169340.lovable.app/images/logoEmail.png')
  
  if (!logoResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to fetch logo', status: logoResponse.status }), { status: 500 })
  }

  const logoBlob = await logoResponse.blob()
  const logoArrayBuffer = await logoBlob.arrayBuffer()
  const logoUint8Array = new Uint8Array(logoArrayBuffer)

  // Upload to storage (upsert to overwrite)
  const { data, error } = await supabase.storage
    .from('email-assets')
    .upload('logo.png', logoUint8Array, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '0',
    })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, data, size: logoUint8Array.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
