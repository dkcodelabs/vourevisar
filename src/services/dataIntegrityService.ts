import { supabase } from '@/integrations/supabase/client';
import { mergeService } from './mergeService';

type RecoverableCycleState = {
  id: string;
  ciclo_atual: string[] | null;
  materias_estudadas_ciclo: string[] | null;
  ciclos_realizados: number | null;
  unification_map: unknown | null;
};

/**
 * SERVIÇO DE INTEGRIDADE DE DADOS
 * 
 * Este serviço gerencia a integridade das relações entre editais, matérias e tópicos.
 */

/**
 * Valida se os dados da matéria estão completos antes da criação.
 */
export const validateSubjectCreation = (subject: any) => {
  if (!subject.edital_id) {
    throw new Error('Não é permitido criar matérias sem vínculo com um edital.');
  }
  return true;
};

export const performGlobalCleanup = async (userId: string) => {
  console.log('[DataIntegrity] Iniciando cleanup global para o usuário:', userId);
  
  try {
    // 1. Reparar matérias órfãs
    await repairOrphanedSubjects(userId);
    
    // 2. Limpar IDs órfãos nos ciclos
    await cleanupOrphanedCycleIds(userId);
    
    // 3. Deletar ciclos sem editais ativos (blindagem contra ciclos fantasma)
    await deleteOrphanedCycles(userId);
    
    // 4. Reparar integridade de unificações (Merges)
    await mergeService.repairIntegrity(userId);
    
    console.log('[DataIntegrity] Cleanup global concluído.');
    return { success: true };
  } catch (err) {
    console.error('[DataIntegrity] Erro no cleanup global:', err);
    return { success: false, error: err };
  }
};

/**
 * Limpa IDs de matérias inexistentes dos arrays de controle nos ciclos do usuário.
 */
export const cleanupOrphanedCycleIds = async (userId: string) => {
  try {
    console.log('[DataIntegrity] Iniciando limpeza de IDs órfãos nos ciclos para o usuário:', userId);

    // 1. Buscar todas as matérias válidas do usuário
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id')
      .eq('user_id', userId);

    if (subjectsError) throw subjectsError;
    const validSubjectIds = new Set((subjects || []).map(s => s.id));

    // 2. Buscar o ciclo do usuário
    const { data: cycles, error: cyclesError } = await supabase
      .from('user_cycles')
      .select('*')
      .eq('user_id', userId);

    if (cyclesError) throw cyclesError;
    if (!cycles || cycles.length === 0) return { success: true };

    for (const cycle of cycles) {
      const updates: any = {};
      let hasChanges = false;

      // Arrays para verificar
      const arraysToClean = [
        'ciclo_atual', 
        'materias_pendentes', 
        'materias_estudadas_hoje', 
        'materias_estudadas_ciclo'
      ];

      for (const field of arraysToClean) {
        const currentArray = (cycle[field] as string[]) || [];
        const filteredArray = currentArray.filter(id => id === '' || validSubjectIds.has(id));
        
        if (filteredArray.length !== currentArray.length) {
          updates[field] = filteredArray;
          hasChanges = true;
          console.log(`[DataIntegrity] Limpando ${currentArray.length - filteredArray.length} IDs órfãos em ${field}`);
        }
      }

      if (hasChanges) {
        const { error: updateError } = await supabase
          .from('user_cycles')
          .update(updates)
          .eq('id', cycle.id);

        if (updateError) console.error(`[DataIntegrity] Erro ao atualizar ciclo ${cycle.id}:`, updateError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[DataIntegrity] Erro na limpeza de ciclos:', error);
    return { success: false, error };
  }
};

/**
 * Remove apenas ciclos realmente vazios.
 * Ciclos sem edital ativo podem guardar estado manual recuperável para quando o edital for carregado novamente.
 */
export const deleteOrphanedCycles = async (userId: string) => {
  try {
    // 1. Buscar ciclos do usuário
    const { data: cycles, error: cyclesError } = await supabase
      .from('user_cycles')
      .select('id, ciclo_atual, materias_estudadas_ciclo, ciclos_realizados, unification_map')
      .eq('user_id', userId);

    if (cyclesError) throw cyclesError;
    if (!cycles || cycles.length === 0) return { success: true, deleted: 0 };

    // 2. Contar editais ativos no ciclo
    const { count, error: countError } = await (supabase as any)
      .from('user_editais')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('merged_into_cycle', true);

    if (countError) throw countError;

    // 3. Se nenhum edital está ativo, deletar apenas ciclos sem estado recuperável
    if ((count ?? 0) === 0) {
      const typedCycles = cycles as RecoverableCycleState[];
      const deletableCycles = typedCycles.filter((cycle) => {
        const hasActiveOrder = Array.isArray(cycle.ciclo_atual) && cycle.ciclo_atual.length > 0;
        const hasManualState = Array.isArray(cycle.materias_estudadas_ciclo) && cycle.materias_estudadas_ciclo.length > 0;
        const hasCompletedRotations = Number(cycle.ciclos_realizados || 0) > 0;
        const hasUnificationMap = Boolean(cycle.unification_map);

        return !hasActiveOrder && !hasManualState && !hasCompletedRotations && !hasUnificationMap;
      });

      const preserved = typedCycles.length - deletableCycles.length;
      console.log(`[DataIntegrity] Nenhum edital ativo encontrado. Deletando ${deletableCycles.length} ciclo(s) vazio(s) e preservando ${preserved} ciclo(s) com histórico recuperável.`);
      
      for (const cycle of deletableCycles) {
        const { error: deleteError } = await supabase
          .from('user_cycles')
          .delete()
          .eq('id', cycle.id);

        if (deleteError) {
          console.error(`[DataIntegrity] Erro ao deletar ciclo órfão ${cycle.id}:`, deleteError);
        }
      }
      
      return { success: true, deleted: deletableCycles.length, preserved };
    }

    console.log(`[DataIntegrity] ${count} edital(is) ativo(s) no ciclo. Nenhum ciclo órfão.`);
    return { success: true, deleted: 0 };
  } catch (error) {
    console.error('[DataIntegrity] Erro ao verificar ciclos órfãos:', error);
    return { success: false, error };
  }
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
