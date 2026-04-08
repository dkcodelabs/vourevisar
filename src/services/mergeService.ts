import { supabase } from '@/integrations/supabase/client';
import type { SubjectMerge, TopicMerge } from '@/types/merges';

const clearLocalCache = (userId: string) => {
  if (typeof window === 'undefined') return;
  console.log(`[mergeService] Limpando cache local para usuário ${userId}...`);
  localStorage.removeItem(`subjects_cache_${userId}_v2`);
  localStorage.removeItem(`user_cycle_cache_${userId}`);
  // Dispatch event as a backup
  window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { timestamp: Date.now() } }));
};

export const mergeService = {
  async getUnifiedSubjectName(subjectId: string, userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_unified_subject_name', {
          subject_id: subjectId,
          user_id: userId
        });

      if (error) {
        console.error('[mergeService] Erro ao buscar nome unificado:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[mergeService] Erro:', err);
      return null;
    }
  },

  async getUnifiedTopicName(topicId: string, userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_unified_topic_name', {
          topic_id: topicId,
          user_id: userId
        });

      if (error) {
        console.error('[mergeService] Erro ao buscar nome unificado de tópico:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[mergeService] Erro:', err);
      return null;
    }
  },

  async getSubjectMerge(subjectId: string, userId: string): Promise<SubjectMerge | null> {
    try {
      const { data, error } = await supabase
        .from('subject_merges')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .or(`primary_subject_id.eq.${subjectId},merged_subject_ids.cs.${JSON.stringify([subjectId])}`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SubjectMerge | null;
    } catch (err) {
      console.error('[mergeService] Erro ao buscar merge de matéria:', err);
      return null;
    }
  },

  async getSubjectMergeByPrimaryId(primaryId: string, userId: string): Promise<SubjectMerge | null> {
    try {
      // Buscar por qualquer status (não filtra por 'active')
      const { data, error } = await (supabase as any)
        .from('subject_merges')
        .select('*')
        .eq('user_id', userId)
        .eq('primary_subject_id', primaryId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SubjectMerge | null;
    } catch (err) {
      console.error('[mergeService] Erro ao buscar merge por primary ID:', err);
      return null;
    }
  },

  async getTopicMerge(topicId: string, userId: string): Promise<TopicMerge | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('topic_merges')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .or(`primary_topic_id.eq.${topicId},merged_topic_ids.cs.${JSON.stringify([topicId])}`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TopicMerge | null;
    } catch (err) {
      console.error('[mergeService] Erro ao buscar merge de tópico:', err);
      return null;
    }
  },

  async revertSubjectMerge(mergeId: string): Promise<void> {
    console.log(`[mergeService] Revertendo merge ${mergeId}...`);
    const { data: existing } = await supabase
      .from('subject_merges')
      .select('id, user_id, primary_subject_id, merged_subject_ids')
      .eq('id', mergeId)
      .maybeSingle();
    
    if (!existing) {
      console.warn('[mergeService] Merge não encontrado para reversão:', mergeId);
      throw new Error('Merge não encontrado');
    }

    const userId = existing.user_id;
    const primaryId = existing.primary_subject_id;
    const mergedIds = (existing.merged_subject_ids || []) as string[];
    const allSubjectIds = [primaryId, ...mergedIds];

    // 1. Reverter topic_merges relacionados
    await supabase
      .from('topic_merges')
      .delete()
      .eq('subject_merge_id', mergeId);

    // 2. Excluir o registro de merge de matéria
    const { error: deleteError } = await supabase
      .from('subject_merges')
      .delete()
      .eq('id', mergeId);

    if (deleteError) throw deleteError;

    // 3. Limpar parent_topic_id e is_hidden de todos os tópicos
    console.log('[mergeService] Buscando tópicos para limpar flags...');
    const { data: topicsToClear, error: fetchTopicsError } = await supabase
      .from('topics')
      .select('id')
      .in('subject_id', allSubjectIds);

    if (fetchTopicsError) {
      console.error('[mergeService] Erro ao buscar tópicos para limpeza:', fetchTopicsError);
    }

    if (topicsToClear && topicsToClear.length > 0) {
      const topicIds = topicsToClear.map(t => t.id);
      await (supabase as any)
        .from('topics')
        .update({ 
          parent_topic_id: null,
          is_hidden: false 
        })
        .in('id', topicIds);
    }

    // 3.5. Garantir visibilidade das matérias (Subjects)
    if (allSubjectIds.length > 0) {
      await (supabase as any)
        .from('subjects')
        .update({ is_visible: true })
        .in('id', allSubjectIds)
        .eq('user_id', userId);
    }

    // 4. Restaurar IDs no ciclo_atual
    const { data: cycleData } = await supabase
      .from('user_cycles')
      .select('id, ciclo_atual')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (cycleData) {
      const currentCiclo = (cycleData.ciclo_atual || []) as string[];
      const cycleSet = new Set(currentCiclo);
      allSubjectIds.forEach(id => cycleSet.add(id));
      
      await (supabase as any)
        .from('user_cycles')
        .update({ 
          ciclo_atual: Array.from(cycleSet),
          atualizado_em: new Date().toISOString()
        })
        .eq('id', cycleData.id);
    }

    // 5. Restaurar visibilidade nos editais (active_subject_ids)
    const { data: editais } = await supabase
      .from('user_editais')
      .select('id, subject_ids, active_subject_ids')
      .eq('user_id', userId);

    if (editais) {
      for (const edital of editais) {
        const hasAnySubject = allSubjectIds.some(sid => edital.subject_ids?.includes(sid));
        if (hasAnySubject) {
          const currentActive = (edital.active_subject_ids || []) as string[];
          const newActive = new Set(currentActive);
          allSubjectIds.forEach(sid => {
            if (edital.subject_ids?.includes(sid)) {
              newActive.add(sid);
            }
          });
          
          if (newActive.size > 0) {
            await (supabase as any)
              .from('user_editais')
              .update({ 
                active_subject_ids: Array.from(newActive) 
              })
              .eq('id', edital.id);
          }
        }
      }
    }

    // DISPARAR EVENTO APÓS REVERSÃO
    console.log('[mergeService] Disparando eventos após reversão de merge de matéria...');
    clearLocalCache(userId);
    window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { type: 'revert', timestamp: Date.now() } }));
    window.dispatchEvent(new CustomEvent('mergeUpdated', { detail: { type: 'revert', timestamp: Date.now() } }));
  },

  async revertTopicMerge(mergeId: string): Promise<void> {
    console.log(`[mergeService] Revertendo merge de tópico ${mergeId}...`);
    // Buscar detalhes do merge de tópico
    const { data: existingTopic, error: fetchError } = await (supabase as any)
        .from('topic_merges')
        .select('subject_merge_id, primary_topic_id, merged_topic_ids, user_id')
        .eq('id', mergeId)
        .maybeSingle();

    if (fetchError || !existingTopic) {
        console.error('[mergeService] Erro ao buscar merge de tópico:', fetchError);
        throw new Error('Merge de tópico não encontrado');
    }

    const userId = existingTopic.user_id;
    const allTopicIds = [existingTopic.primary_topic_id, ...(existingTopic.merged_topic_ids || [])].filter(id => !!id);

    // 1. Limpar parent_topic_id e is_hidden dos tópicos envolvidos PRIMEIRO
    if (allTopicIds.length > 0) {
      console.log(`[mergeService] Limpando flags para ${allTopicIds.length} tópicos...`);
      const { error: updateError } = await (supabase as any)
        .from('topics')
        .update({ 
          parent_topic_id: null,
          is_hidden: false,
          merged_with_ia: false
        })
        .in('id', allTopicIds);

      if (updateError) {
        console.error('[mergeService] Erro ao atualizar tópicos na reversão:', updateError);
        throw updateError;
      }
    }

    // 2. Excluir o registro de merge SOMENTE SE a limpeza dos tópicos funcionou
    console.log(`[mergeService] Excluindo registro de merge ${mergeId}...`);
    const { error: deleteError } = await supabase
      .from('topic_merges')
      .delete()
      .eq('id', mergeId);

    if (deleteError) {
      console.error('[mergeService] Erro ao deletar registro de merge:', deleteError);
      throw deleteError;
    }

    console.log('[mergeService] Topic merge reverted successfully.');
    window.dispatchEvent(new CustomEvent('mergeUpdated', { detail: { type: 'topic_revert', timestamp: Date.now() } }));
  },

  async createSubjectMerge(merge: Omit<SubjectMerge, 'id' | 'created_at' | 'reverted_at' | 'status'>): Promise<SubjectMerge> {
    const { data, error } = await (supabase as any)
      .from('subject_merges')
      .insert({
        user_id: merge.user_id,
        cycle_id: merge.cycle_id,
        primary_subject_id: merge.primary_subject_id,
        merged_subject_ids: merge.merged_subject_ids,
        source_edital_ids: merge.source_edital_ids || [],
        display_name: merge.display_name,
        created_by_ai: merge.created_by_ai || false,
        match_type: merge.match_type
      })
      .select()
      .single();

    if (error) throw error;
    return data as SubjectMerge;
  },

  async createTopicMerge(merge: Omit<TopicMerge, 'id' | 'created_at' | 'reverted_at' | 'status'>): Promise<TopicMerge> {
    const { data, error } = await (supabase as any)
      .from('topic_merges')
      .insert({
        user_id: merge.user_id,
        cycle_id: merge.cycle_id,
        subject_merge_id: merge.subject_merge_id,
        primary_topic_id: merge.primary_topic_id,
        merged_topic_ids: merge.merged_topic_ids,
        source_edital_ids: merge.source_edital_ids || [],
        display_name: merge.display_name,
        created_by_ai: merge.created_by_ai || false,
        match_type: merge.match_type
      })
      .select()
      .single();

    if (error) throw error;
    return data as TopicMerge;
  },

  async getActiveSubjectMerges(userId: string): Promise<SubjectMerge[]> {
    const { data, error } = await (supabase as any)
      .from('subject_merges')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []) as SubjectMerge[];
  },

  async getActiveTopicMerges(userId: string): Promise<TopicMerge[]> {
    const { data, error } = await (supabase as any)
      .from('topic_merges')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []) as TopicMerge[];
  },

  async saveMergeFromUnificationMap(
    userId: string,
    cycleId: string,
    unificationMap: any
  ): Promise<void> {
    if (!unificationMap?.unifiedSubjects || unificationMap.unifiedSubjects.length === 0) {
      console.log('[mergeService] Sem unifiedSubjects para processar');
      return;
    }

    // Pegar todos os subject IDs que estão no ciclo_atual
    const { data: cycleData } = await (supabase as any)
      .from('user_cycles')
      .select('ciclo_atual')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    const cycleIds = (cycleData?.ciclo_atual || []) as string[];
    
    // IDs que DEVEM ter merge (os que estão no unificationMap)
    const subjectsWithMerge = new Set<string>();
    for (const unified of unificationMap.unifiedSubjects) {
      for (const id of unified.originalSubjectIds) {
        subjectsWithMerge.add(id);
      }
    }

    // Remover merges que não deveriam existir mais
    const existingMerges = await this.getActiveSubjectMerges(userId);
    for (const merge of existingMerges) {
      const allMergeIds = [merge.primary_subject_id, ...(merge.merged_subject_ids || [])];
      const shouldHaveMerge = allMergeIds.some(id => subjectsWithMerge.has(id));
      
      if (!shouldHaveMerge) {
        console.log('[mergeService] Removendo merge órfão:', merge.id);
        await (supabase as any).from('subject_merges').delete().eq('id', merge.id);
        await (supabase as any).from('topic_merges').delete().eq('subject_merge_id', merge.id);
      }
    }

    // Agora criar/atualizar merges para subjects que estão no unificationMap
    for (const unified of unificationMap.unifiedSubjects) {
      const primaryId = unified.originalSubjectIds[0];
      const mergedIds = unified.originalSubjectIds.slice(1);

      // Pular se não tem mesclagem real (só 1 subject)
      if (mergedIds.length === 0) continue;

      // Verificar se merge já existe
      const existing = await this.getSubjectMergeByPrimaryId(primaryId, userId);
      let subjectMergeId = existing?.id;
      
      if (existing) {
        // Atualizar
        await (supabase as any)
          .from('subject_merges')
          .update({
            merged_subject_ids: mergedIds,
            source_edital_ids: unified.sourceEditalIds || [],
            display_name: unified.displayName,
            match_type: unified.matchType,
            cycle_id: cycleId
          })
          .eq('id', existing.id);
      } else {
        // Criar novo
        const newMerge = await this.createSubjectMerge({
          user_id: userId,
          cycle_id: cycleId,
          primary_subject_id: primaryId,
          merged_subject_ids: mergedIds,
          source_edital_ids: unified.sourceEditalIds || [],
          display_name: unified.displayName,
          created_by_ai: unified.matchType !== 'exact',
          match_type: unified.matchType
        });
        subjectMergeId = newMerge.id;
      }

      // Processar topic merges
      for (const topicMap of unified.topicMappings || []) {
        if (topicMap.originalTopicIds.length < 2) continue;

        const topicPrimaryId = topicMap.originalTopicIds[0];
        const topicMergedIds = topicMap.originalTopicIds.slice(1);

        const existingTopicMerge = await this.getTopicMerge(topicPrimaryId, userId);
        
        if (existingTopicMerge) {
          await (supabase as any)
            .from('topic_merges')
            .update({
              merged_topic_ids: topicMergedIds,
              source_edital_ids: topicMap.sourceEditalIds || unified.sourceEditalIds || [], 
              display_name: topicMap.displayName,
              match_type: topicMap.matchType
            })
            .eq('id', existingTopicMerge.id);
        } else if (subjectMergeId) {
          await this.createTopicMerge({
            user_id: userId,
            cycle_id: cycleId,
            subject_merge_id: subjectMergeId,
            primary_topic_id: topicPrimaryId,
            merged_topic_ids: topicMergedIds,
            source_edital_ids: topicMap.sourceEditalIds || unified.sourceEditalIds || [], 
            display_name: topicMap.displayName,
            created_by_ai: topicMap.matchType !== 'exact',
            match_type: topicMap.matchType
          });
        }
      }
    }

    // DISPARAR EVENTOS APÓS SALVAR UNIFICAÇÃO
    console.log('[mergeService] Disparando eventos após salvar unificação do mapa...');
    clearLocalCache(userId);
    window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { type: 'save_map', timestamp: Date.now() } }));
    window.dispatchEvent(new CustomEvent('mergeUpdated', { detail: { type: 'save_map', timestamp: Date.now() } }));
  },

  async getTopicMergesBySubjectMerge(subjectMergeId: string): Promise<TopicMerge[]> {
    const { data, error } = await (supabase as any)
      .from('topic_merges')
      .select('*')
      .eq('subject_merge_id', subjectMergeId)
      .eq('status', 'active');
    
    if (error) {
      console.error('[mergeService] Erro ao buscar topic merges:', error);
      return [];
    }
    return (data || []) as TopicMerge[];
  },

  /** Limpa registros de mesclagem órfãos após a remoção de um edital */
  async cleanupMergesAfterEditalRemoval(
    userId: string, 
    editalId: string,
    onProgress?: (progress: { message: string; percentage: number }) => void
  ): Promise<void> {
    console.log(`[mergeService] Iniciando limpeza de mesclagens para edital ${editalId}...`);
    
    try {
      // 1. Buscar todos os merges para calcular o total de progresso
      const activeTopicMerges = await this.getActiveTopicMerges(userId);
      const { data: subjectMerges } = await supabase
        .from('subject_merges')
        .select('*')
        .eq('user_id', userId);
      
      const filteredTopicMerges = activeTopicMerges.filter(tm => tm.source_edital_ids?.includes(editalId));
      const filteredSubjectMerges = (subjectMerges || []).filter(sm => sm.source_edital_ids?.includes(editalId));
      
      const totalItems = filteredTopicMerges.length + filteredSubjectMerges.length + 1; // +1 para o sweep final
      let processedItems = 0;

      const updateProgress = (message: string) => {
        processedItems++;
        const percentage = Math.min(Math.round((processedItems / totalItems) * 100), 99);
        onProgress?.({ message, percentage });
      };

      // 1. Remover topic_merges onde o edital era a ÚNICA ou uma das origens
      for (const tm of filteredTopicMerges) {
        const remainingEditals = tm.source_edital_ids.filter(id => id !== editalId);
        
        if (remainingEditals.length < 2) {
          updateProgress(`Limpando tópico: ${tm.display_name}`);
          
          // Limpar flags dos tópicos que ficaram
          const allTids = [tm.primary_topic_id, ...(tm.merged_topic_ids || [])];
          await (supabase as any)
            .from('topics')
            .update({ 
              parent_topic_id: null,
              merged_with_ia: false 
            })
            .in('id', allTids);

          await (supabase as any).from('topic_merges').delete().eq('id', tm.id);
        } else {
          updateProgress(`Atualizando tópico: ${tm.display_name}`);
          // Apenas remove o edital da lista de origens (merge ainda existe entre outros)
          await (supabase as any)
            .from('topic_merges')
            .update({ source_edital_ids: remainingEditals })
            .eq('id', tm.id);
        }
      }

      // 2. Remover subject_merges similares
      for (const sm of filteredSubjectMerges) {
        const remainingEditals = sm.source_edital_ids.filter((id: string) => id !== editalId);
        const mergedSubjectIds = (sm.merged_subject_ids as string[]) || [];
        
        if (remainingEditals.length < 2) {
          updateProgress(`Limpando matéria: ${sm.display_name}`);
          
          // Limpar flags das matérias que ficaram (filtra IDs inválidos)
          const allSids = [sm.primary_subject_id, ...mergedSubjectIds].filter(id => !!id);
          
          if (allSids.length > 0) {
            await (supabase as any)
              .from('subjects')
              .update({ is_unified: false })
              .in('id', allSids);
          }

          await (supabase as any).from('subject_merges').delete().eq('id', sm.id);
          await (supabase as any).from('topic_merges').delete().eq('subject_merge_id', sm.id);
        } else {
          updateProgress(`Atualizando matéria: ${sm.display_name}`);
          await (supabase as any)
            .from('subject_merges')
            .update({ source_edital_ids: remainingEditals })
            .eq('id', sm.id);
        }
      }

      // 3. Varredura final (Sweep) para garantir que ninguém aponte para tópicos/matérias do edital deletado
      updateProgress('Finalizando limpeza de referências...');
      // Isso remove as "tesouras" fantasmas de tópicos que sobraram mas apontavam para o deletado.
      const { data: removedEdital } = await supabase
        .from('user_editais')
        .select('subject_ids')
        .eq('id', editalId)
        .maybeSingle();

      if (removedEdital?.subject_ids && removedEdital.subject_ids.length > 0) {
        const removedSubjIds = removedEdital.subject_ids.filter((id: string) => !!id);
        
        if (removedSubjIds.length > 0) {
          // Limpar subjects que eram secundários e apontavam para primários deste edital
          await (supabase as any)
            .from('subjects')
            .update({ is_unified: false })
            .in('id', removedSubjIds);

          // IMPORTANTE: Limpar tópicos que sobraram (em outros editais) mas que apontam para algum tópico destas matérias
          const { data: removedTopics } = await supabase
            .from('topics')
            .select('id')
            .in('subject_id', removedSubjIds);
            
          const removedTopicIds = (removedTopics || []).map(t => t.id).filter(id => !!id);
          
          if (removedTopicIds.length > 0) {
            await (supabase as any)
              .from('topics')
              .update({ parent_topic_id: null, merged_with_ia: false })
              .in('parent_topic_id', removedTopicIds);
          }
        }
      }
      
      onProgress?.({ message: 'Concluído', percentage: 100 });
      console.log(`[mergeService] Limpeza concluída para edital ${editalId}.`);
      clearLocalCache(userId);
      window.dispatchEvent(new CustomEvent('mergeUpdated'));
      window.dispatchEvent(new CustomEvent('cycleUpdated'));
    } catch (err) {
      console.error('[mergeService] Erro na limpeza de mesclagens:', err);
    }
  },

  /** 
   * Sincroniza o ciclo de estudos após a remoção de um edital ou descarregamento do ciclo.
   * Garante que se uma matéria unificada perdeu seu ID representante (que era do edital removido),
   * ela seja substituída por um ID remanescente do mesmo grupo de unificação.
   */
  async syncCycleAfterRemoval(userId: string, editalId: string): Promise<void> {
    console.log(`[mergeService] Sincronizando ciclo após remoção do edital ${editalId}...`);
    
    try {
      // 1. Buscar o ciclo ativo
      const { data: cycleData, error: cycleError } = await supabase
        .from('user_cycles')
        .select('id, ciclo_atual, unification_map')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (cycleError || !cycleData) return;
      
      const currentCiclo = (cycleData.ciclo_atual || []) as string[];
      const unificationMap = cycleData.unification_map as any;
      
      // 2. Buscar o edital removido para saber quais matérias ele tinha
      const { data: removedEdital } = await supabase
        .from('user_editais')
        .select('subject_ids')
        .eq('id', editalId)
        .maybeSingle();
      
      const removedSubjectIds = new Set(removedEdital?.subject_ids || []);
      
      // 3. Buscar os merges ativos para encontrar substitutos
      const activeMerges = await this.getActiveSubjectMerges(userId);
      
      let hasChanges = false;
      const newCiclo: string[] = [];

      for (const subjectId of currentCiclo) {
        if (removedSubjectIds.has(subjectId)) {
          // O ID sendo removido estava no ciclo. 
          // Vamos ver se ele faz parte de uma unificação no mapa do ciclo.
          let substituteId: string | null = null;
          
          if (unificationMap?.unifiedSubjects) {
            const group = unificationMap.unifiedSubjects.find((u: any) => 
              u.originalSubjectIds.includes(subjectId)
            );
            
            if (group) {
              // Encontrou o grupo! Pegar o primeiro ID que NÃO pertence ao edital removido
              substituteId = group.originalSubjectIds.find((id: string) => !removedSubjectIds.has(id)) || null;
            }
          }

          if (substituteId) {
            console.log(`[mergeService] Substituindo ID removido ${subjectId} por ${substituteId} no ciclo.`);
            newCiclo.push(substituteId);
            hasChanges = true;
          } else {
            console.log(`[mergeService] Matéria ${subjectId} era exclusiva do edital removido ou não tem substituto. Removendo do ciclo.`);
            hasChanges = true;
          }
        } else {
          // ID não pertence ao edital removido, mantém.
          newCiclo.push(subjectId);
        }
      }

      if (hasChanges) {
        // Garantir que não haja duplicatas (caso o substituto já estivesse lá por erro anterior)
        const finalCiclo = Array.from(new Set(newCiclo));
        
        await (supabase as any)
          .from('user_cycles')
          .update({ 
            ciclo_atual: finalCiclo,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', cycleData.id);
        
        console.log('[mergeService] Ciclo atualizado com sucesso.');
        clearLocalCache(userId);
        window.dispatchEvent(new CustomEvent('cycleUpdated'));
        window.dispatchEvent(new CustomEvent('mergeUpdated'));
      }
    } catch (err) {
      console.error('[mergeService] Erro ao sincronizar ciclo:', err);
    }
  }
};
