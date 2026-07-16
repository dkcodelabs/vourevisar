import { supabase } from '@/integrations/supabase/client';

type UpdateActiveCycleNameInput = {
  name: string;
  updatedAt?: string;
  userId: string;
};

type UpdatedCycleName = {
  id: string;
  name: string;
};

const sanitizeCycleName = (value: string): string => {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) throw new Error('Nome do ciclo obrigatório');
  return normalized.slice(0, 160);
};

export async function updateActiveCycleName({
  name,
  updatedAt = new Date().toISOString(),
  userId,
}: UpdateActiveCycleNameInput): Promise<UpdatedCycleName> {
  const cleanName = sanitizeCycleName(name);
  const { data, error } = await supabase
    .from('user_cycles')
    .update({
      name: cleanName,
      atualizado_em: updatedAt,
    })
    .eq('user_id', userId)
    .eq('status', 'active')
    .select('id, name')
    .single();

  if (error) throw error;
  return data;
}
