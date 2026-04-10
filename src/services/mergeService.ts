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
        const { error: syncError } = await (supabase as any)
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
      const { error: updateSecondaryError } = await (supabase as any)
        .from('topics')
        .update({ 
          parent_topic_id: primaryId,
          is_hidden: true,
          merged_with_ia: merge.created_by_ai || false
        })
        .in('id', secondaryIds);

      if (updateSecondaryError) throw updateSecondaryError;

      // 2. Garantir que o tópico primário não seja filho de ninguém e esteja visível
      const { error: updatePrimaryError } = await (supabase as any)
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
    
    // Sincronizar flags imediatamente
    const newMerge = data as TopicMerge;
    await this.syncTopicMergeWithTopics(newMerge);
    
    return newMerge;
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
      for (const topicMap of (unified.topicMappings || [])) {
        if (!topicMap.originalTopicIds || topicMap.originalTopicIds.length < 2) continue;

        const topicPrimaryId = topicMap.originalTopicIds[0];
        const topicMergedIds = topicMap.originalTopicIds.slice(1);
        const allTids = topicMap.originalTopicIds;

        // --- NOVO: Sincronização de Progresso ---
        try {
          const { data: topicsData } = await supabase
              .from('topics')
              .select('id, completed, review_count, next_review, last_reviewed_at, difficulty_level, notes, memory_stability, current_interval, retention_score, total_reviews')
              .in('id', allTids);

          if (topicsData && topicsData.length > 1) {
              const masterTopic = [...topicsData].sort((a, b) => {
                  if (a.completed && !b.completed) return -1;
                  if (!a.completed && b.completed) return 1;
                  return (b.review_count || 0) - (a.review_count || 0);
              })[0];

              await (supabase as any)
                  .from('topics')
                  .update({
                      completed: masterTopic.completed,
                      review_count: masterTopic.review_count,
                      next_review: masterTopic.next_review,
                      last_reviewed_at: masterTopic.last_reviewed_at,
                      difficulty_level: masterTopic.difficulty_level,
                      notes: masterTopic.notes,
                      memory_stability: masterTopic.memory_stability,
                      current_interval: masterTopic.current_interval,
                      retention_score: masterTopic.retention_score,
                      total_reviews: masterTopic.total_reviews
                  })
                  .in('id', allTids);
          }
        } catch (syncErr) {
          console.error('[mergeService] Erro ao sincronizar tópicos no mapa:', syncErr);
        }
        // --- FIM Sincronização ---

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
          const allTids = [tm.primary_topic_id, ...(tm.merged_topic_ids || [])].filter(id => typeof id === 'string' && id.length > 0);
          
          if (allTids.length > 0) {
            await (supabase as any)
              .from('topics')
              .update({ 
                parent_topic_id: null,
                merged_with_ia: false 
              })
              .in('id', allTids);
          }

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
        const removedSubjIds = (removedEdital.subject_ids || []).filter((id: any) => typeof id === 'string' && id.length > 0);
        
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
      }
      clearLocalCache(userId);
      window.dispatchEvent(new CustomEvent('cycleUpdated'));
      window.dispatchEvent(new CustomEvent('mergeUpdated'));
    } catch (err) {
      console.error('[mergeService] Erro ao sincronizar ciclo:', err);
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
          await (supabase as any)
            .from('subjects')
            .update({ is_unified: true, is_visible: false })
            .in('id', mergedIds);
          
          await (supabase as any)
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
