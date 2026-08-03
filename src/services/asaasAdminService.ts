import { supabase } from '@/integrations/supabase/client';
import { errorService } from '@/lib/errors/errorService';

// Interfaces for Asaas Data
export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  nextDueDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE' | 'OVERDUE' | 'SUSPENDED';
  cycle: 'MONTHLY' | 'YEARLY' | 'WEEKLY';
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  description?: string;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription: string;
  value: number;
  netValue: number;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'REFUND_IN_PROGRESS' | 'REFUND_REQUESTED' | 'RECEIVED_IN_CASH' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  dueDate: string;
  paymentDate?: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
  description?: string;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj: string;
}

export const asaasAdminService = {
  /**
   * Invoca a Edge Function asaas-admin
   */
  async invokeAdminFunction<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    try {
      const { data, error } = await supabase.functions.invoke('asaas-admin', {
        body: { action, params }
      });

      if (error) {
        throw new Error(error.message || `Erro ao chamar asaas-admin: ${action}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || `Erro retornado pelo asaas-admin: ${action}`);
      }

      return data.data as T;
    } catch (error: unknown) {
      errorService.report(error as Error, {
        module: 'asaasAdminService',
        action,
        userMessage: `Erro ao buscar dados do Asaas (${action})`,
        metadata: params
      });
      throw error;
    }
  },

  async getSubscription(subscriptionId: string): Promise<AsaasSubscription | null> {
    if (!subscriptionId) return null;
    return await this.invokeAdminFunction('get_subscription', { id: subscriptionId });
  },

  async getSubscriptionPayments(subscriptionId: string): Promise<AsaasPayment[]> {
    if (!subscriptionId) return [];
    const res = await this.invokeAdminFunction('get_payments', { id: subscriptionId }) as { data?: AsaasPayment[] };
    return res?.data || [];
  },

  async getCustomer(customerId: string): Promise<AsaasCustomer | null> {
    if (!customerId) return null;
    return await this.invokeAdminFunction('get_customer', { id: customerId });
  },
  
  async getPayment(paymentId: string): Promise<AsaasPayment | null> {
    if (!paymentId) return null;
    return await this.invokeAdminFunction('get_payment', { id: paymentId });
  }
};
