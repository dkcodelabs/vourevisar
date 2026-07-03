import { supabase } from '@/integrations/supabase/client';
import type { UserCycle } from '@/types';

export type StudyCycleResetFields = Pick<
  UserCycle,
  | 'atualizado_em'
  | 'ciclos_realizados'
  | 'data_fim_ciclo'
  | 'data_inicio_ciclo'
  | 'materias_estudadas_ciclo'
>;

type ResetStudyCycleInput = {
  fields: StudyCycleResetFields;
  userId: string;
};

export async function resetStudyCycle({ fields, userId }: ResetStudyCycleInput) {
  const { error } = await supabase
    .from('user_cycles')
    .update(fields)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw error;
}
