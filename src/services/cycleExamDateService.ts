import { supabase } from '@/integrations/supabase/client';

type UpdateActiveCycleExamDateInput = {
  examDate: string;
  updatedAt?: string;
  userId: string;
};

type UpdatedCycleExamDate = {
  exam_date: string | null;
  id: string;
};

const sanitizeCycleExamDate = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) throw new Error('Data da prova inválida');

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isValid = parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() === Number(month) - 1
    && parsed.getUTCDate() === Number(day);

  if (!isValid) throw new Error('Data da prova inválida');
  return normalized;
};

export async function updateActiveCycleExamDate({
  examDate,
  updatedAt = new Date().toISOString(),
  userId,
}: UpdateActiveCycleExamDateInput): Promise<UpdatedCycleExamDate> {
  const cleanExamDate = sanitizeCycleExamDate(examDate);
  const { data, error } = await supabase
    .from('user_cycles')
    .update({
      exam_date: cleanExamDate,
      atualizado_em: updatedAt,
    })
    .eq('user_id', userId)
    .eq('status', 'active')
    .select('id, exam_date')
    .single();

  if (error) throw error;
  return data;
}
