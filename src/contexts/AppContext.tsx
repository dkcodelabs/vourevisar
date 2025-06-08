
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Subject, Topic, StudyProgress, AppContextType } from '@/types';
import { toast } from 'sonner';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studyProgress, setStudyProgress] = useState<StudyProgress>({
    totalSubjects: 0,
    completedSubjects: 0,
    totalTopics: 0,
    completedTopics: 0,
    delayedTopics: 0,
    todayTopics: 0,
    futureTopics: 0,
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('AppContext - Loading subjects for user:', user.id);
      
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          *,
          topics (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (subjectsError) throw subjectsError;

      const transformedSubjects: Subject[] = (subjectsData || []).map(subject => ({
        id: subject.id,
        name: subject.name,
        status: subject.status as 'Nova' | 'Em Estudo' | 'Concluída',
        priority: subject.priority || 0,
        color: subject.color || undefined,
        topics: (subject.topics || []).map(topic => ({
          id: topic.id,
          name: topic.name,
          completed: topic.completed || false,
          reviewCount: topic.review_count || 0,
          review_count: topic.review_count || 0,
          reviewStage: topic.review_stage as any,
          nextReview: topic.next_review ? new Date(topic.next_review) : undefined,
          lastReviewedAt: topic.last_reviewed_at ? new Date(topic.last_reviewed_at) : undefined,
        }))
      }));

      setSubjects(transformedSubjects);
      calculateProgress(transformedSubjects);
      setIsDataLoaded(true);
      console.log('AppContext - Subjects loaded successfully:', transformedSubjects.length);
    } catch (error: any) {
      console.error('AppContext - Error loading subjects:', error);
      setError(error.message);
      toast.error('Erro ao carregar matérias');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = (subjects: Subject[]) => {
    const totalSubjects = subjects.length;
    const completedSubjects = subjects.filter(s => s.status === 'Concluída').length;
    const allTopics = subjects.flatMap(s => s.topics);
    const totalTopics = allTopics.length;
    const completedTopics = allTopics.filter(t => t.completed).length;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const delayedTopics = allTopics.filter(t => 
      t.nextReview && t.nextReview < now && !t.completed
    ).length;

    const todayTopics = allTopics.filter(t => 
      t.nextReview && t.nextReview >= today && t.nextReview < tomorrow && !t.completed
    ).length;

    const futureTopics = allTopics.filter(t => 
      t.nextReview && t.nextReview >= tomorrow && !t.completed
    ).length;

    setStudyProgress({
      totalSubjects,
      completedSubjects,
      totalTopics,
      completedTopics,
      delayedTopics,
      todayTopics,
      futureTopics,
    });
  };

  const addSubject = async (subjectData: Omit<Subject, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          name: subjectData.name,
          status: subjectData.status,
          priority: subjectData.priority || 0,
          color: subjectData.color
        })
        .select()
        .single();

      if (error) throw error;

      await loadSubjects();
      toast.success('Matéria adicionada com sucesso!');
    } catch (error: any) {
      console.error('Error adding subject:', error);
      toast.error('Erro ao adicionar matéria');
      throw error;
    }
  };

  const updateSubject = async (id: string, updates: Partial<Subject>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: updates.name,
          status: updates.status,
          priority: updates.priority,
          color: updates.color
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadSubjects();
      toast.success('Matéria atualizada com sucesso!');
    } catch (error: any) {
      console.error('Error updating subject:', error);
      toast.error('Erro ao atualizar matéria');
      throw error;
    }
  };

  const deleteSubject = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadSubjects();
      toast.success('Matéria removida com sucesso!');
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      toast.error('Erro ao remover matéria');
      throw error;
    }
  };

  const addTopic = async (subjectId: string, topicData: Omit<Topic, 'id'>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('topics')
        .insert({
          subject_id: subjectId,
          name: topicData.name,
          completed: false,
          review_count: 0,
          review_stage: '24h',
          next_review: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) throw error;

      await loadSubjects();
      toast.success('Tópico adicionado com sucesso!');
    } catch (error: any) {
      console.error('Error adding topic:', error);
      toast.error('Erro ao adicionar tópico');
      throw error;
    }
  };

  const updateTopic = async (subjectId: string, topicId: string, updates: Partial<Topic>) => {
    try {
      const { error } = await supabase
        .from('topics')
        .update({
          name: updates.name,
          completed: updates.completed,
          review_count: updates.reviewCount || updates.review_count,
          review_stage: updates.reviewStage,
          next_review: updates.nextReview?.toISOString(),
          last_reviewed_at: updates.lastReviewedAt?.toISOString()
        })
        .eq('id', topicId);

      if (error) throw error;

      await loadSubjects();
    } catch (error: any) {
      console.error('Error updating topic:', error);
      toast.error('Erro ao atualizar tópico');
      throw error;
    }
  };

  const deleteTopic = async (subjectId: string, topicId: string) => {
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      await loadSubjects();
      toast.success('Tópico removido com sucesso!');
    } catch (error: any) {
      console.error('Error deleting topic:', error);
      toast.error('Erro ao remover tópico');
      throw error;
    }
  };

  const refreshData = async () => {
    if (!user) return;
    
    console.log('AppContext - Refreshing all data...');
    setIsLoading(true);
    
    try {
      await loadSubjects();
      console.log('AppContext - Data refreshed successfully');
    } catch (error) {
      console.error('AppContext - Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSubjects();
    } else {
      setSubjects([]);
      setIsDataLoaded(false);
    }
  }, [user]);

  const value: AppContextType = {
    subjects,
    studyProgress,
    isDataLoaded,
    isLoading,
    error,
    addSubject,
    updateSubject,
    deleteSubject,
    addTopic,
    updateTopic,
    deleteTopic,
    refreshData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
};
