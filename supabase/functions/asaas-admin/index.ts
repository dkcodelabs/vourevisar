// @ts-expect-error - Deno request type
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno syntax
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// @ts-expect-error - Deno request type
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado (Missing Token)');
    }

    // @ts-expect-error
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-expect-error
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // @ts-expect-error
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    const asaasUrl = 'https://sandbox.asaas.com/api/v3';

    if (!supabaseUrl || !supabaseKey || !asaasApiKey) {
      throw new Error('Configurações de ambiente ausentes');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) throw new Error('Sessão inválida');

    // Ensure user is an admin or owner
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner'])
      .single();

    if (roleError || !roleData) {
      throw new Error('Permissão negada (Apenas administradores)');
    }

    const body = await req.json();
    const { action, params } = body;

    let responseData = null;

    if (action === 'get_subscription') {
      const { id } = params;
      if (!id) throw new Error('Subscription ID is required');
      const res = await fetch(`${asaasUrl}/subscriptions/${id}`, {
        headers: { 'access_token': asaasApiKey }
      });
      responseData = await res.json();
    } else if (action === 'get_payments') {
      const { id } = params;
      if (!id) throw new Error('Subscription ID is required');
      const res = await fetch(`${asaasUrl}/subscriptions/${id}/payments`, {
        headers: { 'access_token': asaasApiKey }
      });
      responseData = await res.json();
    } else if (action === 'get_customer') {
      const { id } = params;
      if (!id) throw new Error('Customer ID is required');
      const res = await fetch(`${asaasUrl}/customers/${id}`, {
        headers: { 'access_token': asaasApiKey }
      });
      responseData = await res.json();
    } else if (action === 'get_payment') {
      const { id } = params;
      if (!id) throw new Error('Payment ID is required');
      const res = await fetch(`${asaasUrl}/payments/${id}`, {
        headers: { 'access_token': asaasApiKey }
      });
      responseData = await res.json();
    } else {
      throw new Error(`Invalid action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[asaas-admin]', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
