import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { PlanConfig } from '@/hooks/usePlanConfigs';

export type AdminCoupon = Tables<'coupons'>;
export async function fetchAdminPlans(): Promise<PlanConfig[]> {
  const { data, error } = await supabase.from('plan_configs').select('*').order('value', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanConfig[];
}
export async function fetchAdminCoupons(): Promise<AdminCoupon[]> {
  const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function updateAdminPlan(plan: PlanConfig) {
  const { error } = await supabase.from('plan_configs').update({ name: plan.name, value: plan.value, description: plan.description, features: plan.features, badge: plan.badge, active: plan.active }).eq('id', plan.id);
  if (error) throw error;
}
export async function createAdminCoupon(payload: Record<string, unknown>) {
  const { error } = await supabase.from('coupons').insert(payload as never);
  if (error) throw error;
}
export async function toggleAdminCoupon(id: string, active: boolean) {
  const { error } = await supabase.from('coupons').update({ active }).eq('id', id);
  if (error) throw error;
}
