import { supabase } from '@/integrations/supabase/client';
import type { SubjectMerge, TopicMerge } from '@/types/merges';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import { invokeUserRpc } from '@/services/userRpcService';
import { buildConsolidatedTopicProgress, type TopicProgressRow } from '@/utils/topicProgressConsolidation';

const clearLocalCache = (userId: string) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`subjects_cache_${userId}_v2`);
  localStorage.removeItem(`user_cycle_cache_${userId}`);
};

const TOPIC_PROGRESS_SELECT = [
  'id',
  'completed',
  'review_count',
  'review_stage',
  'next_review',
  'first_studied_at',
  'last_reviewed_at',
  'difficulty_level',
  'difficulty_set_at',
  'notes',
  'memory_stability',
  'current_interval',
  'retention_score',
  'total_reviews',
  'last_session_duration',
  'is_marked_for_review',
  'marked_for_review_at',
].join(', ');

export const mergeService = {
  async getUnifiedSubjectName(subjectId: string, userId: string): Promise<string | null> {
    try {
      const data = await invokeUserRpc<string | null>('get_unified_subject_name', {
        subject_id: subjectId,
        user_id: userId
      });
      return data;
    } catch (err) {
      console.error('[mergeService] Erro:', err);
      return null;
    }
  },

  async getUnifiedTopicName(topicId: string, userId: string): Promise<string | null> {
    try {
      const data = await invokeUserRpc<string | null>('get_unified_topic_name', {
        topic_id: topicId,
        user_id: userId
      });
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
    // Garante que allSubjectIds seja um array de strings
    const validSubjectIds = (allSubjectIds || []).filter(id => typeof id === 'string' && id.length > 0);
    
    const { data: topicsToClear, error: fetchTopicsError } = await supabase
      .from('topics')
      .select('id')
      .in('subject_id', validSubjectIds);

    if (fetchTopicsError) {
      console.error('[mergeService] Erro ao buscar tópicos para limpeza:', fetchTopicsError);
    }

    if (topicsToClear && topicsToClear.length > 0) {
      const topicIds = topicsToClear.map(t => t.id);
      await supabase
        .from('topics')
        .update({ 
          parent_topic_id: null,
          is_hidden: false 
        })
        .in('id', topicIds);
    }

    // 3.5. Garantir visibilidade das matérias (Subjects)
    if (allSubjectIds.length > 0) {
      await supabase
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
      
      await supabase
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
            await supabase
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
    const { data: existingTopic, error: fetchError } = await supabase
        .from('topic_merges')
        .select('subject_merge_id, primary_topic_id, merged_topic_ids, user_id')
        .eq('id', mergeId)
        .maybeSingle();

    if (fetchError || !existingTopic) {
        console.error('[mergeService] Erro ao buscar merge de tópico:', fetchError);
        throw new Error('Merge de tópico não encontrado');
    }

    const userId = existingTopic.user_id;
    const primaryTopicId = existingTopic.primary_topic_id;
    const mergedTopicIds = (existingTopic.merged_topic_ids || []) as string[];
    const allTopicIds = [primaryTopicId, ...mergedTopicIds].filter(id => !!id);

    // 0. Sincronizar progresso: Copiar dados do PAI para os FILHOS antes de soltar
    if (primaryTopicId && mergedTopicIds.length > 0) {
      console.log(`[mergeService] Sincronizando progresso do pai ${primaryTopicId} para os filhos...`);
      const { data: parentData, error: parentError } = await supabase
        .from('topics')
        .select(`
          completed, 
          review_count, 
          next_review, 
          last_reviewed_at, 
          difficulty_level, 
          notes, 
          memory_stability, 
          current_interval, 
          retention_score, 
          total_reviews
        `)
        .eq('id', primaryTopicId)
        .maybeSingle();

      if (!parentError && parentData) {
        // Aplicar dados do pai em todos os filhos
        const { error: syncError } = await supabase
          .from('topics')
          .update({
            completed: parentData.completed,
            review_count: parentData.review_count,
            next_review: parentData.next_review,
            last_reviewed_at: parentData.last_reviewed_at,
            difficulty_level: parentData.difficulty_level,
            notes: parentData.notes,
            memory_stability: parentData.memory_stability,
            current_interval: parentData.current_interval,
            retention_score: parentData.retention_score,
            total_reviews: parentData.total_reviews
          })
          .in('id', mergedTopicIds);

        if (syncError) {
          console.error('[mergeService] Erro ao sincronizar progresso na reversão:', syncError);
        } else {
          console.log('[mergeService] Progresso sincronizado com sucesso.');
        }
      }
    }

    // 1. Limpar parent_topic_id e is_hidden dos tópicos envolvidos PRIMEIRO
    if (allTopicIds.length > 0) {
      console.log(`[mergeService] Limpando flags para ${allTopicIds.length} tópicos...`);
      const { error: updateError } = await supabase
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

    console.log(`[mergeService] Topic merge ${mergeId} reverted successfully. Dispatched mergeUpdated and subjectUpdated.`);
    
    window.dispatchEvent(new CustomEvent('mergeUpdated', { detail: { type: 'topic_revert', timestamp: Date.now() } }));
    window.dispatchEvent(new CustomEvent('subjectUpdated', { detail: { type: 'topic_revert', timestamp: Date.now() } }));
  },

  async createSubjectMerge(merge: Omit<SubjectMerge, 'id' | 'created_at' | 'reverted_at' | 'status'>): Promise<SubjectMerge> {
    const { data, error } = await supabase
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

  /**
   * Sincroniza as flags parent_topic_id e is_hidden na tabela topics
   * com base em um registro de TopicMerge.
   */
  async syncTopicMergeWithTopics(merge: TopicMerge): Promise<void> {
    const primaryId = merge.primary_topic_id;
    const secondaryIds = (merge.merged_topic_ids || []) as string[];

    if (!primaryId || secondaryIds.length === 0) return;

    console.log(`[mergeService] Sincronizando flags para merge de tópico ${merge.id}...`);

    try {
      // 1. Marcar tópicos secundários como filhos do primário e escondê-los
      const { error: updateSecondaryError } = await supabase
        .from('topics')
        .update({ 
          parent_topic_id: primaryId,
          is_hidden: true,
          merged_with_ia: merge.created_by_ai || false
        })
        .in('id', secondaryIds);

      if (updateSecondaryError) throw updateSecondaryError;

      // 2. Garantir que o tópico primário não seja filho de ninguém e esteja visível
      const { error: updatePrimaryError } = await supabase
        .from('topics')
        .update({ 
          parent_topic_id: null,
          is_hidden: false 
        })
        .eq('id', primaryId);

      if (updatePrimaryError) throw updatePrimaryError;

      console.log('[mergeService] Flags de tópicos sincronizadas com sucesso.');
    } catch (err) {
      console.error('[mergeService] Erro ao sincronizar flags de tópicos:', err);
    }
  },

  async createTopicMerge(merge: Omit<TopicMerge, 'id' | 'created_at' | 'reverted_at' | 'status'>): Promise<TopicMerge> {
    const { data, error } = await supabase
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
    
    // Sincronizar flags imediatamente
    const newMerge = data as TopicMerge;
    await this.syncTopicMergeWithTopics(newMerge);
    
    return newMerge;
  },

  async getActiveSubjectMerges(userId: string): Promise<SubjectMerge[]> {
    const { data, error } = await supabase
      .from('subject_merges')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []) as SubjectMerge[];
  },

  async getActiveTopicMerges(userId: string): Promise<TopicMerge[]> {
    const { data, error } = await supabase
      .from('topic_merges')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []) as TopicMerge[];
  },

  async updateSubjectMergeDisplayName(mergeId: string, userId: string, displayName: string): Promise<SubjectMerge> {
    const normalizedName = displayName.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      throw new Error('Nome da matéria no ciclo não pode ficar vazio');
    }

    const { data, error } = await supabase
      .from('subject_merges')
      .update({
        display_name: normalizedName,
      })
      .eq('id', mergeId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single();

    if (error) throw error;
    clearLocalCache(userId);
    window.dispatchEvent(new CustomEvent('mergeUpdated', { detail: { type: 'subject_display_name', timestamp: Date.now() } }));
    window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { type: 'subject_display_name', timestamp: Date.now() } }));
    return data as SubjectMerge;
  },

  async saveMergeFromUnificationMap(
    userId: string,
    cycleId: string,
    unificationMap: CycleUnificationMap
  ): Promise<void> {
    if (!unificationMap?.unifiedSubjects || unificationMap.unifiedSubjects.length === 0) {
      console.log('[mergeService] Sem unifiedSubjects para processar');
      return;
    }

    // Pegar todos os subject IDs que estão no ciclo_atual
    const { data: cycleData } = await supabase
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
        await supabase.from('subject_merges').delete().eq('id', merge.id);
        await supabase.from('topic_merges').delete().eq('subject_merge_id', merge.id);
      }
    }

    // Agora criar/atualizar merges para subjects que estão no unificationMap
    for (const unified of unificationMap.unifiedSubjects) {
      // Pegar TODOS os IDs de matérias originais do mapa
      const allSubjectIds = [...(unified.originalSubjectIds || [])];
      if (allSubjectIds.length < 2) continue;

      const primaryId = allSubjectIds[0];
      const mergedIds = allSubjectIds.slice(1);

      // Verificar se merge já existe
      const existing = await this.getSubjectMergeByPrimaryId(primaryId, userId);
      let subjectMergeId = existing?.id;
      
      if (existing) {
        // Atualizar
        await supabase
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
          created_by_ai: unified.matchType === 'semantic',
          match_type: unified.matchType
        });
        subjectMergeId = newMerge.id;
      }

      // Processar topic merges
      for (const topicMap of (unified.topicMappings || [])) {
        if (!topicMap.originalTopicIds || topicMap.originalTopicIds.length < 2) continue;

        const topicPrimaryId = topicMap.originalTopicIds[0];
        const topicMergedIds = topicMap.originalTopicIds.slice(1);
        const allTids = topicMap.originalTopicIds;

        // --- NOVO: Sincronização de Progresso ---
        try {
          const { data: topicsData } = await supabase
              .from('topics')
              .select(TOPIC_PROGRESS_SELECT)
              .in('id', allTids);

          if (topicsData && topicsData.length > 1) {
              const consolidatedProgress = buildConsolidatedTopicProgress(topicsData as TopicProgressRow[]);
              if (!consolidatedProgress) continue;

              await supabase
                  .from('topics')
                  .update(consolidatedProgress)
                  .in('id', allTids);
          }
        } catch (syncErr) {
          console.error('[mergeService] Erro ao sincronizar tópicos no mapa:', syncErr);
        }
        // --- FIM Sincronização ---

        const existingTopicMerge = await this.getTopicMerge(topicPrimaryId, userId);
        
        if (existingTopicMerge) {
          await supabase
            .from('topic_merges')
            .update({
              merged_topic_ids: topicMergedIds,
              source_edital_ids: topicMap.sourceEditalIds || unified.sourceEditalIds || [], 
              display_name: topicMap.displayName,
              match_type: topicMap.matchType
            })
            .eq('id', existingTopicMerge.id);
          
          // Sincronizar flags do tópico existente
          await this.syncTopicMergeWithTopics(existingTopicMerge);
        } else if (subjectMergeId) {
          await this.createTopicMerge({
            user_id: userId,
            cycle_id: cycleId,
            subject_merge_id: subjectMergeId,
            primary_topic_id: topicPrimaryId,
            merged_topic_ids: topicMergedIds,
            source_edital_ids: topicMap.sourceEditalIds || unified.sourceEditalIds || [], 
            display_name: topicMap.displayName,
            created_by_ai: topicMap.matchType === 'semantic',
            match_type: topicMap.matchType
          });
        }
      }
    }

    // DISPARAR EVENTOS APÓS SALVAR UNIFICAÇÃO
    clearLocalCache(userId);
    window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { type: 'save_map', timestamp: Date.now() } }));
    window.dispatchEvent(new CustomEvent('mergeUpdated', { detail: { type: 'save_map', timestamp: Date.now() } }));
  },

  async getTopicMergesBySubjectMerge(subjectMergeId: string): Promise<TopicMerge[]> {
    const { data, error } = await supabase
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
    onProgress?: (progress: { message: string; percentage: number }) => void,
    options: { emitEvents?: boolean; throwOnError?: boolean } = {}
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

      // Buscar subject_ids do edital sendo removido (para detectar se o primário pertence a ele)
      const { data: removingEditalData } = await supabase
        .from('user_editais')
        .select('subject_ids')
        .eq('id', editalId)
        .maybeSingle();
      const removedSubjectIdsSet = new Set((removingEditalData?.subject_ids || []) as string[]);

      // Buscar topic_ids das matérias do edital removido
      const removedSubjectIdsArray = Array.from(removedSubjectIdsSet).filter(id => typeof id === 'string' && id.length > 0);
      let removedTopicIdsSet = new Set<string>();
      if (removedSubjectIdsArray.length > 0) {
        const { data: topicsFromRemoved } = await supabase
          .from('topics')
          .select('id')
          .in('subject_id', removedSubjectIdsArray);
        removedTopicIdsSet = new Set((topicsFromRemoved || []).map(t => t.id));
      }

      // 1. Processar topic_merges: remover, promover ou deletar
      for (const tm of filteredTopicMerges) {
        const remainingEditals = tm.source_edital_ids.filter(id => id !== editalId);
        
        if (remainingEditals.length < 2) {
          updateProgress(`Limpando tópico: ${tm.display_name}`);
          
          // Limpar flags dos tópicos que ficaram
          const allTids = [tm.primary_topic_id, ...(tm.merged_topic_ids || [])].filter(id => typeof id === 'string' && id.length > 0);
          
          if (allTids.length > 0) {
            await supabase
              .from('topics')
              .update({ 
                parent_topic_id: null,
                merged_with_ia: false 
              })
              .in('id', allTids);
          }

          await supabase.from('topic_merges').delete().eq('id', tm.id);
        } else {
          // Merge sobrevive (2+ editais). Verificar se o primário precisa de promoção.
          const needsPromotion = removedTopicIdsSet.has(tm.primary_topic_id);
          
          if (needsPromotion) {
            // Promover: encontrar o primeiro tópico que NÃO pertence ao edital removido
            const mergedIds = (tm.merged_topic_ids || []) as string[];
            const survivor = mergedIds.find(id => !removedTopicIdsSet.has(id));
            
            if (survivor) {
              updateProgress(`Promovendo tópico: ${tm.display_name}`);
              const newMergedIds = [tm.primary_topic_id, ...mergedIds].filter(id => id !== survivor);
              
              await supabase
                .from('topic_merges')
                .update({ 
                  primary_topic_id: survivor,
                  merged_topic_ids: newMergedIds,
                  source_edital_ids: remainingEditals 
                })
                .eq('id', tm.id);
              
              console.log(`[mergeService] Tópico primário promovido: ${tm.primary_topic_id} → ${survivor}`);
            } else {
              // Nenhum sobrevivente válido, deletar o merge
              updateProgress(`Removendo merge sem sobreviventes: ${tm.display_name}`);
              await supabase.from('topic_merges').delete().eq('id', tm.id);
            }
          } else {
            updateProgress(`Atualizando tópico: ${tm.display_name}`);
            // Primário sobreviveu, apenas atualizar lista de editais
            await supabase
              .from('topic_merges')
              .update({ source_edital_ids: remainingEditals })
              .eq('id', tm.id);
          }
        }
      }

      // 2. Processar subject_merges: remover, promover ou deletar
      for (const sm of filteredSubjectMerges) {
        const remainingEditals = sm.source_edital_ids.filter((id: string) => id !== editalId);
        const mergedSubjectIds = (sm.merged_subject_ids as string[]) || [];
        
        if (remainingEditals.length < 2) {
          updateProgress(`Limpando matéria: ${sm.display_name}`);
          
          // Limpar flags das matérias que ficaram (filtra IDs inválidos)
          const allSids = [sm.primary_subject_id, ...mergedSubjectIds].filter(id => !!id);
          
          if (allSids.length > 0) {
            await supabase
              .from('subjects')
              .update({ is_unified: false })
              .in('id', allSids);
          }

          await supabase.from('subject_merges').delete().eq('id', sm.id);
          await supabase.from('topic_merges').delete().eq('subject_merge_id', sm.id);
        } else {
          // Merge sobrevive (2+ editais). Verificar se o primário precisa de promoção.
          const needsPromotion = removedSubjectIdsSet.has(sm.primary_subject_id);
          
          if (needsPromotion) {
            // Promover: encontrar a primeira matéria que NÃO pertence ao edital removido
            const survivor = mergedSubjectIds.find(id => !removedSubjectIdsSet.has(id));
            
            if (survivor) {
              updateProgress(`Promovendo matéria: ${sm.display_name}`);
              const newMergedIds = [sm.primary_subject_id, ...mergedSubjectIds].filter(id => id !== survivor);
              
              await supabase
                .from('subject_merges')
                .update({ 
                  primary_subject_id: survivor,
                  merged_subject_ids: newMergedIds,
                  source_edital_ids: remainingEditals 
                })
                .eq('id', sm.id);
              
              console.log(`[mergeService] Matéria primária promovida: ${sm.primary_subject_id} → ${survivor}`);
            } else {
              // Nenhum sobrevivente válido
              updateProgress(`Removendo merge sem sobreviventes: ${sm.display_name}`);
              await supabase.from('subject_merges').delete().eq('id', sm.id);
              await supabase.from('topic_merges').delete().eq('subject_merge_id', sm.id);
            }
          } else {
            updateProgress(`Atualizando matéria: ${sm.display_name}`);
            await supabase
              .from('subject_merges')
              .update({ source_edital_ids: remainingEditals })
              .eq('id', sm.id);
          }
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
        const removedSubjIds = removedEdital.subject_ids.filter(id => id.length > 0);
        
        if (removedSubjIds.length > 0) {
          // Limpar subjects que eram secundários e apontavam para primários deste edital
          await supabase
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
            await supabase
              .from('topics')
              .update({ parent_topic_id: null, merged_with_ia: false })
              .in('parent_topic_id', removedTopicIds);
          }
        }
      }
      
      onProgress?.({ message: 'Concluído', percentage: 100 });
      console.log(`[mergeService] Limpeza concluída para edital ${editalId}.`);
      clearLocalCache(userId);
      if (options.emitEvents !== false) {
        window.dispatchEvent(new CustomEvent('mergeUpdated'));
        window.dispatchEvent(new CustomEvent('cycleUpdated'));
      }
    } catch (err) {
      console.error('[mergeService] Erro na limpeza de mesclagens:', err);
      if (options.throwOnError) throw err;
    }
  },

  /** 
   * Sincroniza o ciclo de estudos após a remoção de um edital ou descarregamento do ciclo.
   * Garante que se uma matéria unificada perdeu seu ID representante (que era do edital removido),
   * ela seja substituída por um ID remanescente do mesmo grupo de unificação.
   */
  async syncCycleAfterRemoval(
    userId: string,
    editalId: string,
    options: { emitEvents?: boolean; throwOnError?: boolean } = {},
  ): Promise<void> {
    try {
      console.log(`[mergeService] Iniciando sincronização do ciclo após remoção do edital ${editalId}...`);
      
      // 1. Buscar dados necessários em paralelo
      const [
        { data: cycleData },
        { data: allEditais },
        activeMerges
      ] = await Promise.all([
        supabase.from('user_cycles').select('id, ciclo_atual').eq('user_id', userId).eq('status', 'active').maybeSingle(),
        supabase.from('user_editais').select('id, subject_ids, active_subject_ids, merged_into_cycle').eq('user_id', userId),
        this.getActiveSubjectMerges(userId)
      ]);

      if (!cycleData || !allEditais) return;
      
      const currentCiclo = (cycleData.ciclo_atual || []) as string[];
      const removedEdital = allEditais.find(e => e.id === editalId);
      const removedSubjectIds = new Set(removedEdital?.subject_ids || []);
      
      // 2. Identificar editais que continuam ATIVOS no ciclo
      const remainingActiveEditais = allEditais.filter(e => e.merged_into_cycle && e.id !== editalId);
      
      // 3. Mapear matérias que DEVEM permanecer (pois pertencem a editais que ficam)
      const subjectsStaying = new Set<string>();
      remainingActiveEditais.forEach(e => {
          const ids = e.active_subject_ids?.length > 0 ? e.active_subject_ids : e.subject_ids;
          (ids || []).forEach(id => subjectsStaying.add(id));
      });

      let hasChanges = false;
      const newCiclo: string[] = [];

      // 4. Reconstruir o ciclo
      for (const subjectId of currentCiclo) {
        // Se a matéria pertence a um edital que fica, mantém! (Resolve o bug de Soft Merge)
        if (subjectsStaying.has(subjectId)) {
          newCiclo.push(subjectId);
        } else if (removedSubjectIds.has(subjectId)) {
          // Se pertence APENAS ao edital removido, busca substituto formal
          console.log(`[mergeService] Matéria ${subjectId} pertence ao edital removido. Buscando substituto...`);
          
          // Buscar se este ID está num merge como 'secondary'
          const merge = activeMerges.find(m => m.merged_subject_ids.includes(subjectId));
          let substituteId: string | null = null;
          
          if (merge) {
             // O substituto é o primário do merge (contanto que ele não seja o que está saindo)
             if (!removedSubjectIds.has(merge.primary_subject_id)) {
                 substituteId = merge.primary_subject_id;
             } else {
                 // Se o primário também está saindo, pega qualquer outro do grupo que fique
                 substituteId = merge.merged_subject_ids.find(id => !removedSubjectIds.has(id)) || null;
             }
          }
          
          if (substituteId) {
            console.log(`[mergeService] Substituindo ${subjectId} por ${substituteId}.`);
            newCiclo.push(substituteId);
            hasChanges = true;
          } else {
            console.log(`[mergeService] Sem substituto para ${subjectId}. Removendo do ciclo.`);
            hasChanges = true;
          }
        } else {
          // Não pertence ao removido e não está no Safe List (teoricamente órfã), mantém por segurança
          newCiclo.push(subjectId);
        }
      }

      // 5. Atualizar o ciclo se houve mudanças
      const finalCiclo = Array.from(new Set(newCiclo));
      if (hasChanges || finalCiclo.length !== currentCiclo.length) {
        await supabase
          .from('user_cycles')
          .update({ 
            ciclo_atual: finalCiclo,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', cycleData.id);
        
        console.log('[mergeService] Ciclo atualizado com sucesso.');
      }

      // 6. AUDITORIA DE INTEGRIDADE (Garante consistência das flags nos editais)
      const finalSet = new Set(finalCiclo);
      for (const edital of allEditais) {
          // Ignora o edital que acabou de ser removido (ele será processado pela UI/RPC depois)
          if (edital.id === editalId) continue;

          const idsToCheck = edital.active_subject_ids.length > 0 ? edital.active_subject_ids : edital.subject_ids;
          const isStillInCycle = idsToCheck.some(id => finalSet.has(id));
          
          if (edital.merged_into_cycle && !isStillInCycle) {
              console.log(`[mergeService] Auditoria: Edital ${edital.id} não possui mais matérias no ciclo. Resetando flags.`);
              await supabase
                  .from('user_editais')
                  .update({ 
                      merged_into_cycle: false,
                      active_subject_ids: [] 
                  })
                  .eq('id', edital.id);
          }
      }

      clearLocalCache(userId);
      if (options.emitEvents !== false) {
        window.dispatchEvent(new CustomEvent('cycleUpdated'));
        window.dispatchEvent(new CustomEvent('mergeUpdated'));
      }
    } catch (err) {
      console.error('[mergeService] Erro crítico ao sincronizar ciclo:', err);
      if (options.throwOnError) throw err;
    }
  },

  /**
   * Repara a integridade de todos os merges ativos do usuário.
   * Útil quando uma falha de rede ou lógica deixou tópicos órfãos ou não escondidos.
   */
  async repairIntegrity(userId: string): Promise<{ subjects: number, topics: number }> {
    console.log(`[mergeService] Iniciando reparo de integridade para usuário ${userId}...`);
    let subjectsRepaired = 0;
    let topicsRepaired = 0;

    try {
      // 1. Reparar Matérias
      const subjectMerges = await this.getActiveSubjectMerges(userId);
      for (const sm of subjectMerges) {
        const mergedIds = (sm.merged_subject_ids || []) as string[];
        if (mergedIds.length > 0) {
          await supabase
            .from('subjects')
            .update({ is_unified: true, is_visible: false })
            .in('id', mergedIds);
          
          await supabase
            .from('subjects')
            .update({ is_unified: false, is_visible: true })
            .eq('id', sm.primary_subject_id);
          
          subjectsRepaired++;
        }
      }

      // 2. Reparar Tópicos
      const topicMerges = await this.getActiveTopicMerges(userId);
      for (const tm of topicMerges) {
        await this.syncTopicMergeWithTopics(tm);
        topicsRepaired++;
      }

      console.log(`[mergeService] Reparo concluído: ${subjectsRepaired} matérias e ${topicsRepaired} tópicos sincronizados.`);
      clearLocalCache(userId);
      return { subjects: subjectsRepaired, topics: topicsRepaired };
    } catch (err) {
      console.error('[mergeService] Erro durante o reparo de integridade:', err);
      return { subjects: subjectsRepaired, topics: topicsRepaired };
    }
  }
};
