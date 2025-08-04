import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Subject, StudyProgress } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

interface SimpleAppContextType {
    subjects: Subject[];
    studyProgress: StudyProgress;
    userCycle: any;
    userSettings: { subjects_per_day: number };
    isDataLoaded: boolean;
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    forceRefresh: () => Promise<void>;
    fetchSubjects: () => void;
    fetchUserSettings: () => void;
}

const SimpleAppContext = createContext<SimpleAppContextType | undefined>(undefined);

export const SimpleAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Query para subjects
    const { data: subjectsData = [], isLoading: subjectsLoading } = useQuery({
        queryKey: ['subjects', user?.id],
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
    });

    // Query para user cycle
    const { data: userCycle } = useQuery({
        queryKey: ['userCycle', user?.id],
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
        staleTime: 1 * 60 * 1000,
    });

    // Query para user settings
    const { data: userSettings = { subjects_per_day: 3 } } = useQuery({
        queryKey: ['userSettings', user?.id],
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
        staleTime: 5 * 60 * 1000,
    });

    // Transformar dados para o formato esperado
    const subjects: Subject[] = useMemo(() => {
        if (!subjectsData || !Array.isArray(subjectsData)) {
            return [];
        }
        
        return subjectsData.map(subject => ({
            id: subject.id,
            name: subject.name,
            status: subject.status as any,
            priority: subject.priority || 0,
            color: subject.color || '#3B82F6',
            topics: (subject.topics || []).map(topic => ({
                id: topic.id,
                name: topic.name,
                completed: topic.completed || false,
                nextReview: topic.next_review ? new Date(topic.next_review) : undefined,
                reviewCount: topic.review_count || 0,
                reviewStage: topic.review_stage || '',
                lastReviewedAt: topic.last_reviewed_at ? new Date(topic.last_reviewed_at) : undefined,
                firstStudiedAt: topic.first_studied_at ? new Date(topic.first_studied_at) : undefined,
                difficulty_level: topic.difficulty_level || 'medium',
                review_count: topic.review_count || 0,
                first_studied_at: topic.first_studied_at ? new Date(topic.first_studied_at) : undefined,
                last_reviewed_at: topic.last_reviewed_at ? new Date(topic.last_reviewed_at) : undefined,
                is_completed: topic.completed || false,
            }))
        }));
    }, [subjectsData]);

    // Calcular progresso
    const studyProgress: StudyProgress = useMemo(() => {
        const totalSubjects = subjects.length;
        const completedSubjects = subjects.filter(s => s.status === 'Concluída').length;
        const allTopics = subjects.flatMap(s => s.topics);
        const totalTopics = allTopics.length;
        const completedTopics = allTopics.filter(t => t.reviewStage === 'Concluído').length;

        return {
            totalSubjects,
            completedSubjects,
            totalTopics,
            completedTopics,
            delayedTopics: 0,
            todayTopics: 0,
            futureTopics: 0,
        };
    }, [subjects]);

    const refreshData = async () => {
        if (user) {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['subjects', user.id] }),
                queryClient.invalidateQueries({ queryKey: ['userCycle', user.id] }),
                queryClient.invalidateQueries({ queryKey: ['userSettings', user.id] }),
            ]);
        }
    };

    const value: SimpleAppContextType = {
        subjects,
        studyProgress,
        userCycle,
        userSettings,
        isDataLoaded: !subjectsLoading && !!user,
        isLoading: subjectsLoading,
        error: null,
        refreshData,
        forceRefresh: refreshData,
        fetchSubjects: () => {
            if (user) {
                queryClient.invalidateQueries({ queryKey: ['subjects', user.id] });
            }
        },
        fetchUserSettings: () => {
            if (user) {
                queryClient.invalidateQueries({ queryKey: ['userSettings', user.id] });
            }
        },
    };

    return (
        <SimpleAppContext.Provider value={value}>
            {children}
        </SimpleAppContext.Provider>
    );
};

export const useSimpleApp = () => {
    const context = useContext(SimpleAppContext);
    if (context === undefined) {
        throw new Error('useSimpleApp deve ser usado dentro de um SimpleAppProvider');
    }
    return context;
};