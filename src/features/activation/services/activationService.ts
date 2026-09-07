import { supabase } from '@/integrations/supabase/client';
import type { ActivationSnapshot } from '@/features/activation/types';

export async function getActivationSnapshot(userId: string): Promise<ActivationSnapshot> {
  const [editaisResult, cycleResult] = await Promise.all([
    supabase
      .from('user_editais')
      .select('id, name, subject_ids')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('user_cycles')
      .select('id, name, ciclo_atual, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  ]);

  if (editaisResult.error) throw editaisResult.error;
  if (cycleResult.error) throw cycleResult.error;

  const cycleSubjectIds = cycleResult.data?.ciclo_atual ?? [];
  let hasFirstStudy = false;

  if (cycleSubjectIds.length > 0) {
    const { count, error } = await supabase
      .from('topics')
      .select('id', { count: 'exact', head: true })
      .in('subject_id', cycleSubjectIds)
      .or('first_studied_at.not.is.null,review_count.gt.0');

    if (error) throw error;
    hasFirstStudy = (count ?? 0) > 0;
  }

  return {
    editais: (editaisResult.data ?? []).map((edital) => ({
      id: edital.id,
      name: edital.name,
      subjectCount: edital.subject_ids?.length ?? 0,
    })),
    hasActiveCycle: cycleSubjectIds.length > 0,
    cycleName: cycleResult.data?.name?.trim() || null,
    cycleSubjectCount: cycleSubjectIds.length,
    hasFirstStudy,
  };
}
