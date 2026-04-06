import { supabase } from '@/integrations/supabase/client';
import type { SubjectMerge, TopicMerge } from '@/types/merges';

export const mergeService = {
  async getUnifiedSubjectName(subjectId: string, userId: string): Promise<string | null> {
    try {
      const { data, error } = await (supabase as any)
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
      const { data, error } = await (supabase as any)
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
      const { data, error } = await (supabase as any)
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
    // Primeiro verificar se existe
    const { data: existing } = await (supabase as any)
      .from('subject_merges')
      .select('id, user_id, primary_subject_id, merged_subject_ids')
      .eq('id', mergeId)
      .maybeSingle();
    
    if (!existing) {
      throw new Error('Merge não encontrado');
    }

    const userId = existing.user_id;
    const primaryId = existing.primary_subject_id;
    const mergedIds = existing.merged_subject_ids || [];

    // Excluir o registro de merge
    const { error: deleteError } = await (supabase as any)
      .from('subject_merges')
      .delete()
      .eq('id', mergeId);

    if (deleteError) {
      console.error('[mergeService] Erro ao reverter merge (delete):', deleteError);
      throw deleteError;
    }

    // Reverter também os topic_merges relacionados - excluir
    await (supabase as any)
      .from('topic_merges')
      .delete()
      .eq('subject_merge_id', mergeId);

    // Atualizar o ciclo_atual para incluir todos os IDs separados
    const { data: cycleData } = await (supabase as any)
      .from('user_cycles')
      .select('ciclo_atual')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (cycleData) {
      const currentCiclo = (cycleData.ciclo_atual || []) as string[];
      
      // Substituir o ID primário pelos IDs separados (primário + mergeados)
      const newCiclo = [...currentCiclo];
      const primaryIndex = newCiclo.indexOf(primaryId);
      
      if (primaryIndex !== -1) {
        // Remover o ID primário e adicionar todos os IDs separados
        newCiclo.splice(primaryIndex, 1, ...[primaryId, ...mergedIds]);
      } else {
        // Se não encontrou o primário, adicionar todos os IDs separados
        newCiclo.push(...mergedIds);
      }

      // Atualizar o unification_map para remover a mesclagem desfeita
      let newUnificationMap = cycleData.unification_map;
      if (newUnificationMap && newUnificationMap.unifiedSubjects) {
          newUnificationMap.unifiedSubjects = newUnificationMap.unifiedSubjects.filter(
              (u: any) => !u.originalSubjectIds.includes(primaryId)
          );
      }

      await (supabase as any)
        .from('user_cycles')
        .update({ 
          ciclo_atual: newCiclo,
          unification_map: newUnificationMap,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');
    }
  },

  async revertTopicMerge(mergeId: string): Promise<void> {
    // Buscar detalhes do merge de tópico
    const { data: existingTopic } = await (supabase as any)
        .from('topic_merges')
        .select('subject_merge_id, primary_topic_id, user_id')
        .eq('id', mergeId)
        .maybeSingle();

    if (!existingTopic) {
        throw new Error('Merge de tópico não encontrado');
    }

    const { error: deleteError } = await (supabase as any)
      .from('topic_merges')
      .delete()
      .eq('id', mergeId);

    if (deleteError) throw deleteError;

    // Se precisamos atualizar o unification_map (já que ele é a fonte da verdade da UI)
    const { data: cycleData } = await (supabase as any)
        .from('user_cycles')
        .select('unification_map')
        .eq('user_id', existingTopic.user_id)
        .eq('status', 'active')
        .maybeSingle();

    if (cycleData && cycleData.unification_map && cycleData.unification_map.unifiedSubjects) {
        let newUnificationMap = cycleData.unification_map;
        let modified = false;

        for (const u of newUnificationMap.unifiedSubjects) {
            const topicIndex = u.topicMappings?.findIndex(
                (tm: any) => tm.originalTopicIds[0] === existingTopic.primary_topic_id
            );
            if (topicIndex !== undefined && topicIndex !== -1) {
                u.topicMappings.splice(topicIndex, 1);
                modified = true;
                break;
            }
        }

        if (modified) {
            await (supabase as any)
                .from('user_cycles')
                .update({ 
                    unification_map: newUnificationMap,
                    atualizado_em: new Date().toISOString()
                })
                .eq('user_id', existingTopic.user_id)
                .eq('status', 'active');
        }
    }
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
        await this.createSubjectMerge({
          user_id: userId,
          cycle_id: cycleId,
          primary_subject_id: primaryId,
          merged_subject_ids: mergedIds,
          source_edital_ids: unified.sourceEditalIds || [],
          display_name: unified.displayName,
          created_by_ai: unified.matchType !== 'exact',
          match_type: unified.matchType
        });
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
        } else {
          await this.createTopicMerge({
            user_id: userId,
            cycle_id: cycleId,
            subject_merge_id: existing?.id,
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
  }
};
