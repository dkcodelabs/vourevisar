import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { getConnectionErrorMessage, isConnectionError } from '@/lib/errors/networkError';

export interface CheckoutPayload {
  name: string;
  cpfCnpj: string;
  mobilePhone: string;
  plan: 'monthly' | 'annual';
  billingType: 'PIX' | 'CREDIT_CARD';
  couponCode?: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}

export interface CheckoutResponse {
  success: boolean;
  code?: string;
  subscription?: Record<string, unknown>;
  paymentId?: string | null;
  pix?: Record<string, unknown>;
  billingType?: 'PIX' | 'CREDIT_CARD';
  value?: number;
  error?: string;
}

export interface CouponValidationResponse {
  success: boolean;
  discount_type?: 'PERCENTAGE' | 'FIXED';
  discount_value?: number;
  error?: string;
}

export const asaasService = {
  /**
   * Valida um cupom de desconto remotamente via Supabase RPC
   */
  async validateCoupon(code: string): Promise<CouponValidationResponse> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.functions.invoke<{
        data?: CouponValidationResponse;
        error?: string;
      }>('billing-rpc', {
        body: {
          action: 'validate_coupon',
          args: { target_coupon_code: code },
        },
      });

      if (error) {
         console.error('Erro na Function billing-rpc:', error);
         throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data?.data || { success: false, error: 'Resposta inválida do servidor' };
    } catch (err: unknown) {
      console.error('Erro ao validar cupom:', err);
      const message = err instanceof Error ? err.message : 'Falha ao conectar com servidor';
      return { success: false, error: message };
    }
  },

  /**
   * Processa o checkout chamando a Edge Function 'asaas-checkout'
   */
  async processCheckout(payload: CheckoutPayload): Promise<CheckoutResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('asaas-checkout', {
        body: payload,
      });

      if (error) {
        console.error('Erro na Supabase Function:', error);
        
        // Extrair a mensagem de erro detalhada do corpo da resposta
        if (error instanceof FunctionsHttpError) {
          try {
            const errorBody = await error.context.json();
            console.error('Corpo do erro:', errorBody);
            if (errorBody?.error) {
              return { success: false, code: errorBody.code, error: errorBody.error };
            }
          } catch {
            // json() falhou, usar mensagem genérica
          }
        } else if (error instanceof FunctionsRelayError) {
          return { success: false, error: 'Erro de rede. Tente novamente.' };
        } else if (error instanceof FunctionsFetchError) {
          return { success: false, error: getConnectionErrorMessage(error) };
        } else if (isConnectionError(error)) {
          return { success: false, error: getConnectionErrorMessage(error) };
        }
        
        return { success: false, error: error.message || 'Falha ao processar pagamento' };
      }

      return data as CheckoutResponse;
    } catch (err: unknown) {
      console.error('Erro no processCheckout:', err);
      if (isConnectionError(err)) {
        return { success: false, error: getConnectionErrorMessage(err) };
      }
      const message = err instanceof Error ? err.message : 'Falha ao processar pagamento';
      return { success: false, error: message };
    }
  },

};
