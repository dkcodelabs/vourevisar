import { supabase } from '@/integrations/supabase/client';
import type { CycleComparisonSnapshotRow } from '@/types/cycleComparison';
import { buildCycleComparison } from '@/utils/cycleComparison';

export async function fetchCycleComparison(params: {
  userId: string;
  userCycleId: string;
}) {
  const { data, error } = await supabase
    .from('cycle_rotation_snapshots')
    .select('id, cycle_number, started_at, completed_at, subject_count, studied_subject_count, topics_started_count, topics_completed_count, cycle_subject_ids, per_subject')
    .eq('user_id', params.userId)
    .eq('user_cycle_id', params.userCycleId)
    .order('cycle_number', { ascending: false })
    .limit(6);

  if (error) throw error;
  return buildCycleComparison((data ?? []) as CycleComparisonSnapshotRow[]);
}
