import { supabase } from '@/integrations/supabase/client';

/**
 * SERVIÇO DE INTEGRIDADE DE DADOS
 * 
 * Este serviço gerencia a integridade das relações entre editais, matérias e tópicos.
 */

export const performGlobalCleanup = async () => {
  console.log('ℹ️ performGlobalCleanup: Ignorado (Serviço Desativado)');
  return;
};

/**
 * Repara matérias que ficaram sem edital_id (órfãs).
 * Busca o edital proprietário através do array subject_ids em user_editais.
 */
export const repairOrphanedSubjects = async (userId: string) => {
  try {
    console.log('[DataIntegrity] Iniciando reparo de matérias órfãs para o usuário:', userId);

    // 1. Buscar todos os editais do usuário
    const { data: editais, error: editaisError } = await supabase
      .from('user_editais')
      .select('id, name, subject_ids')
      .eq('user_id', userId);

    if (editaisError) throw editaisError;
    if (!editais || editais.length === 0) return { success: true, fixed: 0, orphans: 0 };

    // 2. Buscar matérias que estão com edital_id nulo
    const { data: orphans, error: orphansError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('user_id', userId)
      .is('edital_id', null);

    if (orphansError) throw orphansError;
    if (!orphans || orphans.length === 0) {
      console.log('[DataIntegrity] Nenhuma matéria órfã encontrada.');
      return { success: true, fixed: 0, orphans: 0 };
    }

    console.log(`[DataIntegrity] Encontradas ${orphans.length} matérias órfãs. Tentando vincular...`);

    let fixedCount = 0;
    
    // 3. Cruzar dados e atualizar
    for (const orphan of orphans) {
      // Encontrar qual edital contém este ID no seu array de subject_ids
      const ownerEdital = editais.find(e => {
        const ids = (e.subject_ids as string[]) || [];
        return ids.includes(orphan.id);
      });

      if (ownerEdital) {
        console.log(`[DataIntegrity] Vinculando matéria "${orphan.name}" (${orphan.id}) ao edital "${ownerEdital.name}"`);
        
        const { error: updateError } = await supabase
          .from('subjects')
          .update({ edital_id: ownerEdital.id })
          .eq('id', orphan.id);

        if (!updateError) {
          fixedCount++;
        } else {
          console.error(`[DataIntegrity] Erro ao vincular ${orphan.id}:`, updateError);
        }
      } else {
        // Se não encontrar em nenhum edital, tenta vincular ao "MEUS ESTUDOS"
        const meusEstudos = editais.find(e => e.name.toUpperCase() === 'MEUS ESTUDOS');
        if (meusEstudos) {
          console.log(`[DataIntegrity] Matéria "${orphan.name}" não encontrada em editais. Movendo para "MEUS ESTUDOS"`);
          await supabase.from('subjects').update({ edital_id: meusEstudos.id }).eq('id', orphan.id);
          fixedCount++;
        }
      }
    }

    console.log(`[DataIntegrity] Reparo concluído. Fixados: ${fixedCount}/${orphans.length}`);
    return { success: true, fixed: fixedCount, orphans: orphans.length };
  } catch (error) {
    console.error('[DataIntegrity] Erro crítico no reparo:', error);
    return { success: false, error };
  }
};
