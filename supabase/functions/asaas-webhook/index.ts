// @ts-expect-error - Deno compatibility
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno compatibility
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-expect-error - Deno request type
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-expect-error - Deno env
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // Para segurança, validar um token no header customizado do Asaas
    // @ts-expect-error - Deno env
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configurações de ambiente ausentes');
    }
    
    // Validar token se estiver configurado
    if (webhookToken) {
        const authHeader = req.headers.get('asaas-access-token');
        if (authHeader !== webhookToken) {
            return new Response('Não autorizado', { status: 401 });
        }
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const event = body.event;
    const payment = body.payment;
    
    if (!event || !payment || !payment.subscription) {
       return new Response('Ignorado: Não é evento de assinatura', { status: 200 });
    }

    // Busca o usuário correspondente a esta assinatura
    const { data: subData, error: subError } = await supabase
      .from('user_subscriptions')
      .select('user_id, plan')
      .eq('asaas_subscription_id', payment.subscription)
      .single();

    if (subError || !subData) {
      console.error(`Assinatura ${payment.subscription} não encontrada no DB`);
      return new Response('Assinatura não encontrada', { status: 200 });
    }

    const userId = subData.user_id;
    const plan = subData.plan || 'monthly';
    const billingType = payment.billingType; // e.g. 'PIX', 'CREDIT_CARD'

    console.log(`Webhook Evento: ${event} para Usuário: ${userId}, Plano: ${plan}, Tipo: ${billingType}`);

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const endsAt = new Date();
      if (plan === 'annual') {
        endsAt.setFullYear(endsAt.getFullYear() + 1);
      } else {
        endsAt.setMonth(endsAt.getMonth() + 1);
      }

      // Atualiza status para 'active'
      await supabase.from('user_subscriptions')
        .update({
           status: 'active',
           billing_type: billingType,
           subscription_started_at: new Date().toISOString(),
           subscription_ends_at: endsAt.toISOString(),
           updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
        
    } else if (event === 'PAYMENT_OVERDUE') {
      await supabase.from('user_subscriptions')
        .update({
           status: 'suspended',
           updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
        
    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
       await supabase.from('user_subscriptions')
        .update({
           status: 'canceled',
           updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook erro:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
