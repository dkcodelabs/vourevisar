import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlanConfig {
  id: string;
  slug: 'monthly' | 'annual';
  name: string;
  value: number;
  description: string;
  features: string[];
  badge: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface UsePlanConfigsReturn {
  plans: PlanConfig[];
  monthly: PlanConfig | null;
  annual: PlanConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePlanConfigs(): UsePlanConfigsReturn {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('plan_configs')
        .select('*')
        .eq('active', true)
        .order('slug');

      if (fetchError) throw fetchError;

      const parsed: PlanConfig[] = (data || []).map((row: any) => ({
        ...row,
        value: parseFloat(row.value),
        features: Array.isArray(row.features) ? row.features : JSON.parse(row.features || '[]'),
      }));

      setPlans(parsed);
    } catch (err) {
      console.error('Erro ao buscar plan_configs:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const monthly = plans.find(p => p.slug === 'monthly') || null;
  const annual = plans.find(p => p.slug === 'annual') || null;

  return { plans, monthly, annual, loading, error, refetch: fetchPlans };
}
