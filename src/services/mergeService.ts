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
    const { error } = await (supabase as any)
      .from('subject_merges')
      .update({ status: 'reverted', reverted_at: new Date().toISOString() })
      .eq('id', mergeId)
      .eq('status', 'active');

    if (error) throw error;

    await (supabase as any)
      .from('topic_merges')
      .update({ status: 'reverted', reverted_at: new Date().toISOString() })
      .eq('subject_merge_id', mergeId)
      .eq('status', 'active');
  },

  async revertTopicMerge(mergeId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('topic_merges')
      .update({ status: 'reverted', reverted_at: new Date().toISOString() })
      .eq('id', mergeId)
      .eq('status', 'active');

    if (error) throw error;
  },

  async createSubjectMerge(merge: Omit<SubjectMerge, 'id' | 'created_at' | 'reverted_at' | 'status'>): Promise<SubjectMerge> {
    const { data, error } = await (supabase as any)
      .from('subject_merges')
      .insert({
        user_id: merge.user_id,
        cycle_id: merge.cycle_id,
        primary_subject_id: merge.primary_subject_id,
        merged_subject_ids: merge.merged_subject_ids,
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
    for (const unified of unificationMap.unifiedSubjects || []) {
      const primaryId = unified.originalSubjectIds[0];
      const mergedIds = unified.originalSubjectIds.slice(1);

      // Verificar se merge já existe (pelo ID primário)
      const existing = await this.getSubjectMerge(primaryId, userId);
      
      if (existing) {
        // Atualizar merge existente se houver mudanças
        const { error } = await (supabase as any)
          .from('subject_merges')
          .update({
            merged_subject_ids: mergedIds,
            display_name: unified.displayName,
            match_type: unified.matchType,
            cycle_id: cycleId
          })
          .eq('id', existing.id)
          .eq('status', 'active');
        
        if (error) {
          console.error('[mergeService] Erro ao atualizar merge:', error);
        }
      } else {
        // Criar novo merge
        await this.createSubjectMerge({
          user_id: userId,
          cycle_id: cycleId,
          primary_subject_id: primaryId,
          merged_subject_ids: mergedIds,
          display_name: unified.displayName,
          created_by_ai: unified.matchType !== 'exact',
          match_type: unified.matchType
        });
      }

      // Buscar topic merges relacionados
      const topicMerges = await this.getTopicMergesBySubjectMerge(
        existing?.id || primaryId
      );

      for (const topicMap of unified.topicMappings || []) {
        const topicPrimaryId = topicMap.originalTopicIds[0];
        const topicMergedIds = topicMap.originalTopicIds.slice(1);

        // Verificar se topic merge já existe
        const existingTopicMerge = topicMerges.find(
          tm => tm.primary_topic_id === topicPrimaryId
        );

        if (existingTopicMerge) {
          await (supabase as any)
            .from('topic_merges')
            .update({
              merged_topic_ids: topicMergedIds,
              display_name: topicMap.displayName,
              match_type: topicMap.matchType
            })
            .eq('id', existingTopicMerge.id)
            .eq('status', 'active');
        } else {
          await this.createTopicMerge({
            user_id: userId,
            cycle_id: cycleId,
            subject_merge_id: existing?.id,
            primary_topic_id: topicPrimaryId,
            merged_topic_ids: topicMergedIds,
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
