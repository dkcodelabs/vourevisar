import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

// Query keys centralizadas para melhor cache management
export const queryKeys = {
    subjects: (userId: string) => ['subjects', userId],
    topics: (userId: string) => ['topics', userId],
    userCycle: (userId: string) => ['userCycle', userId],
    userSettings: (userId: string) => ['userSettings', userId],
    reviews: (userId: string) => ['reviews', userId],
    questions: (userId: string) => ['questions', userId],
} as const;

// Hook otimizado para buscar subjects com topics
export const useOptimizedSubjects = () => {
    const { user } = useAuth();

    return useQuery({
        queryKey: queryKeys.subjects(user?.id || ''),
        queryFn: async () => {
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('subjects')
                .select(`
          id,
          name,
          status,
          priority,
          color,
          created_at,
          updated_at,
          topics (
            id,
            name,
            completed,
            next_review,
            review_count,
            review_stage,
            last_reviewed_at,
            first_studied_at,
            difficulty_level,
            created_at,
            updated_at
          )
        `)
                .eq('user_id', user.id)
                .order('priority', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
        staleTime: 2 * 60 * 1000, // 2 minutos para dados críticos
        gcTime: 5 * 60 * 1000, // 5 minutos
    });
};

// Hook para buscar dados paralelos essenciais
export const useEssentialData = () => {
    const { user } = useAuth();

    const queries = useQueries({
        queries: [
            {
                queryKey: queryKeys.subjects(user?.id || ''),
                queryFn: async () => {
                    if (!user) return [];
                    const { data, error } = await supabase
                        .from('subjects')
                        .select(`
              id, name, status, priority, color,
              topics (id, name, completed, next_review, review_count, review_stage, last_reviewed_at, first_studied_at, difficulty_level)
            `)
                        .eq('user_id', user.id)
                        .order('priority', { ascending: true });
                    if (error) throw error;
                    return data || [];
                },
                enabled: !!user,
                staleTime: 2 * 60 * 1000,
            },
            {
                queryKey: queryKeys.userCycle(user?.id || ''),
                queryFn: async () => {
                    if (!user) return null;
                    const { data, error } = await supabase
                        .from('user_cycles')
                        .select('*')
                        .eq('user_id', user.id)
                        .maybeSingle();
                    if (error) throw error;
                    return data;
                },
                enabled: !!user,
                staleTime: 1 * 60 * 1000, // 1 minuto para dados de ciclo
            },
            {
                queryKey: queryKeys.userSettings(user?.id || ''),
                queryFn: async () => {
                    if (!user) return { subjects_per_day: 3 };
                    const { data, error } = await supabase
                        .from('user_settings')
                        .select('subjects_per_day')
                        .eq('user_id', user.id)
                        .single();
                    if (error && error.code !== 'PGRST116') throw error;
                    return data || { subjects_per_day: 3 };
                },
                enabled: !!user,
                staleTime: 5 * 60 * 1000, // 5 minutos para configurações
            },
        ],
    });

    return useMemo(() => ({
        subjects: queries[0].data || [],
        userCycle: queries[1].data,
        userSettings: queries[2].data || { subjects_per_day: 3 },
        isLoading: queries.some(q => q.isLoading),
        isError: queries.some(q => q.isError),
        errors: queries.map(q => q.error).filter(Boolean),
    }), [queries]);
};

// Hook otimizado para reviews com cache inteligente
export const useOptimizedReviews = () => {
    const { user } = useAuth();

    return useQuery({
        queryKey: queryKeys.reviews(user?.id || ''),
        queryFn: async () => {
            if (!user) return [];

            const { data: topicsData, error: topicsError } = await supabase
                .from('topics')
                .select(`
          id, name, subject_id, review_stage, next_review, 
          review_count, first_studied_at, last_reviewed_at, completed,
          subjects!inner (id, name, color, user_id)
        `)
                .eq('subjects.user_id', user.id)
                .order('next_review', { ascending: true });

            if (topicsError) throw topicsError;

            return (topicsData || []).map(topic => ({
                ...topic,
                review_count: topic.review_count ?? 0,
                completed: topic.completed ?? false,
                subject_name: topic.subjects?.name || 'Sem disciplina'
            }));
        },
        enabled: !!user,
        staleTime: 1 * 60 * 1000, // 1 minuto para dados de revisão
        gcTime: 3 * 60 * 1000,
    });
};