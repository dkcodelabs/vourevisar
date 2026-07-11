import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { JsonBoundary } from '../_shared/jsonBoundary.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    const asaasUrl = Deno.env.get('ASAAS_API_URL') || 'https://api-sandbox.asaas.com/v3';
    const asaasHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'vourevisar/1.0 (Supabase Edge Function; sandbox)',
      'access_token': asaasApiKey,
    };

    if (!supabaseUrl || !supabaseKey || !asaasApiKey) {
      throw new Error('Configurações de ambiente ausentes');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) throw new Error('Sessão inválida');

    const body = await req.json();
    const { name, cpfCnpj, mobilePhone, plan, billingType, couponCode, creditCard } = body;

    // Buscar preço do plano na tabela plan_configs (dinâmico)
    const { data: planConfig, error: planError } = await supabase
      .from('plan_configs')
      .select('value, description, name')
      .eq('slug', plan)
      .eq('active', true)
      .single();

    if (planError || !planConfig) {
      throw new Error('Plano inválido ou indisponível');
    }

    let finalValue = parseFloat(planConfig.value);
    let appliedCoupon = null;

    // 1. Validar e Aplicar Cupom
    if (couponCode) {
      const { data: couponData, error: couponError } = await supabase
        .rpc('use_coupon', { 
          target_coupon_code: couponCode, 
          target_user_id: user.id 
        });

      if (couponError) throw new Error(`Erro ao validar cupom: ${couponError.message}`);
      if (!couponData.success) throw new Error(couponData.error);
      
      appliedCoupon = couponData;
      if (couponData.discount_type === 'PERCENTAGE') {
        finalValue = finalValue - (finalValue * (couponData.discount_value / 100));
      } else {
        finalValue = Math.max(0, finalValue - couponData.discount_value);
      }
    }

    // 2. Buscar/Criar Cliente no Asaas
    let asaasCustomerId;
    const { data: subData, error: subFetchError } = await supabase
      .from('user_subscriptions')
      .select('asaas_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log(`[Checkout] Buscando customer ID para ${user.id}:`, subData?.asaas_customer_id);

    if (subData?.asaas_customer_id) {
      asaasCustomerId = subData.asaas_customer_id;
    } else {
      console.log(`[Checkout] Criando/Buscando cliente no Asaas para ${user.email}...`);
      // Tentar criar no Asaas
      const customerRes = await fetch(`${asaasUrl}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          name: name || user.user_metadata?.full_name || user.email,
          email: user.email,
          cpfCnpj,
          mobilePhone
        })
      });
      
      let customerJson = await customerRes.json();
      
      if (!customerRes.ok) {
        // Se já existe um cliente com esse e-mail, vamos tentar buscar por e-mail
        if (customerJson.errors?.[0]?.description?.includes('e-mail informado já está em uso')) {
           console.log(`[Checkout] Cliente já existe no Asaas (${user.email}). Buscando por e-mail...`);
           const searchRes = await fetch(`${asaasUrl}/customers?email=${user.email}`, {
             headers: asaasHeaders
           });
           const searchJson = await searchRes.json();
           if (searchJson.data && searchJson.data.length > 0) {
             customerJson = searchJson.data[0];
           } else {
             throw new Error('Cliente existe no Asaas mas não foi encontrado na busca.');
           }
        } else {
           console.error(`[Checkout] Erro ao criar cliente:`, customerJson);
           throw new Error(`Erro Asaas Customer: ${customerJson.errors?.[0]?.description || JSON.stringify(customerJson)}`);
        }
      }
      
      asaasCustomerId = customerJson.id;
      console.log(`[Checkout] Customer ID definido: ${asaasCustomerId}`);
      
      // Salvar customer ID localmente
      const { error: updateSubError } = await supabase.from('user_subscriptions')
        .upsert({ 
          user_id: user.id,
          asaas_customer_id: asaasCustomerId 
        }, { onConflict: 'user_id' });
        
      if (updateSubError) console.error('[Checkout] Erro ao salvar customer_id no DB:', updateSubError);
    }

    // 3. Criar Subscrição/Cobrança no Asaas
    const nextDueDate = new Date();
    // nextDueDate.setDate(nextDueDate.getDate() + 1); // Removido para gerar cobrança imediata
    
    const subscriptionPayload: Record<string, unknown> = {
      customer: asaasCustomerId,
      billingType: billingType,
      value: finalValue,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      description: planConfig.description || `Plano ${planConfig.name} - vouRevisar`,
      cycle: plan === 'annual' ? 'YEARLY' : 'MONTHLY',
    };

    if (billingType === 'CREDIT_CARD' && creditCard) {
      subscriptionPayload.creditCard = {
        holderName: creditCard.holderName,
        number: creditCard.number,
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv
      };
      subscriptionPayload.creditCardHolderInfo = {
        name: name,
        email: user.email,
        cpfCnpj: cpfCnpj,
        postalCode: '13010151', // Pode ser dinâmico depois
        addressNumber: '123',
        phone: mobilePhone
      };
    }

    const subRes = await fetch(`${asaasUrl}/subscriptions`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify(subscriptionPayload)
    });
    
    const subJson = await subRes.json();
    if (!subRes.ok) {
      console.error(`[Checkout] Erro Asaas Subscription (${subRes.status}):`, subJson);
      throw new Error(`Erro Asaas Subscription: ${subJson.errors?.[0]?.description || JSON.stringify(subJson)}`);
    }

    // Atualizar no DB
    const { error: dbError } = await supabase.from('user_subscriptions')
      .update({ 
        asaas_subscription_id: subJson.id,
        billing_type: billingType,
        plan: plan
      })
      .eq('user_id', user.id);
    
    if (dbError) console.error('[Checkout] Erro ao salvar subscription no DB:', dbError);
      
    // Atualizar uso do cupom com o ID da assinatura
    if (appliedCoupon && appliedCoupon.coupon_id) {
       console.log(`[Checkout] Registrando uso do cupom ${couponCode} para sub ${subJson.id}`);
       const { error: couponUsageError } = await supabase.from('coupon_uses')
        .update({ asaas_subscription_id: subJson.id })
        .eq('user_id', user.id)
        .eq('coupon_id', appliedCoupon.coupon_id);
      
       if (couponUsageError) console.error('[Checkout] Erro ao registrar uso do cupom no DB:', couponUsageError);
    }

    // Se for PIX, precisamos buscar o QR Code da cobrança gerada pela subscription
    let pixData = null;
    if (billingType === 'PIX') {
      const chargesRes = await fetch(`${asaasUrl}/subscriptions/${subJson.id}/payments`, {
        headers: asaasHeaders
      });
      const chargesJson = await chargesRes.json();
      
      if (chargesJson.data && chargesJson.data.length > 0) {
        const paymentId = chargesJson.data[0].id;
        const qrCodeRes = await fetch(`${asaasUrl}/payments/${paymentId}/pixQrCode`, {
          headers: asaasHeaders
        });
        pixData = await qrCodeRes.json();
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      subscription: subJson,
      pix: pixData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
