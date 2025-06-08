import React, { createContext, useContext, useState, useEffect } from 'react';
import { Subject, Topic, Status, StudyProgress, AppContextType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const { user } = useAuth();

  const loadSubjects = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          id,
          created_at,
          updated_at,
          name,
          status,
          priority,
          color,
          user_id,
          topics (
            id,
            created_at,
            updated_at,
            name,
            completed,
            subject_id,
            review_stage,
						next_review,
						review_count,
						last_reviewed_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subjects:', error);
        setError(error.message);
        return;
      }

      if (data) {
        const formattedSubjects = data.map(subject => ({
          id: subject.id,
          name: subject.name,
          status: subject.status as Status,
          priority: subject.priority || undefined,
          color: subject.color || undefined,
          topics: (subject.topics || []).map(topic => ({
            id: topic.id,
            name: topic.name,
            completed: topic.completed,
						nextReview: topic.next_review ? new Date(topic.next_review) : undefined,
						reviewCount: topic.review_count || 0,
						reviewStage: topic.review_stage || undefined,
						lastReviewedAt: topic.last_reviewed_at ? new Date(topic.last_reviewed_at) : undefined,
            review_count: topic.review_count || 0, // Adicionado para compatibilidade
          })),
        }));
        setSubjects(formattedSubjects);
        setIsDataLoaded(true);
      }
    } catch (err) {
      console.error('Unexpected error fetching subjects:', err);
      setError('Failed to load subjects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStudyProgress = () => {
    const totalSubjects = subjects.length;
    const completedSubjects = subjects.filter(subject => subject.status === 'Concluída').length;
    const totalTopics = subjects.reduce((sum, subject) => sum + subject.topics.length, 0);
    const completedTopics = subjects.reduce((sum, subject) => sum + subject.topics.filter(topic => topic.completed).length, 0);

    // Calcula o número de tópicos atrasados, para hoje e futuros
    let delayedTopics = 0;
    let todayTopics = 0;
    let futureTopics = 0;

    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        if (topic.nextReview) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const nextReviewDate = new Date(topic.nextReview);
          nextReviewDate.setHours(0, 0, 0, 0);

          if (nextReviewDate.getTime() < today.getTime()) {
            delayedTopics++;
          } else if (nextReviewDate.getTime() === today.getTime()) {
            todayTopics++;
          } else {
            futureTopics++;
          }
        }
      });
    });

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

  useEffect(() => {
    if (isDataLoaded) {
      updateStudyProgress();
    }
  }, [subjects, isDataLoaded]);

  useEffect(() => {
    if (user) {
      loadSubjects();
    }
  }, [user]);

  const addSubject = async (subject: Omit<Subject, 'id'>) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          ...subject,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding subject:', error);
        setError(error.message);
        return;
      }

      if (data) {
        const newSubject: Subject = {
          id: data.id,
          name: data.name,
          status: data.status as Status,
          priority: data.priority || undefined,
          color: data.color || undefined,
          topics: [],
        };
        setSubjects(prevSubjects => [...prevSubjects, newSubject]);
        toast.success('Matéria adicionada com sucesso!');
      }
    } catch (err) {
      console.error('Unexpected error adding subject:', err);
      setError('Failed to add subject. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubject = async (id: string, updates: Partial<Subject>) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating subject:', error);
        setError(error.message);
        return;
      }

      setSubjects(prevSubjects =>
        prevSubjects.map(subject =>
          subject.id === id ? { ...subject, ...updates } : subject
        )
      );
      toast.success('Matéria atualizada com sucesso!');
    } catch (err) {
      console.error('Unexpected error updating subject:', err);
      setError('Failed to update subject. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSubject = async (id: string) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting subject:', error);
        setError(error.message);
        return;
      }

      setSubjects(prevSubjects => prevSubjects.filter(subject => subject.id !== id));
      toast.success('Matéria removida com sucesso!');
    } catch (err) {
      console.error('Unexpected error deleting subject:', err);
      setError('Failed to delete subject. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addTopic = async (subjectId: string, topic: Omit<Topic, 'id'>) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('topics')
        .insert({
          ...topic,
          subject_id: subjectId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding topic:', error);
        setError(error.message);
        return;
      }

      if (data) {
        const newTopic: Topic = {
          id: data.id,
          name: data.name,
          completed: data.completed,
					nextReview: data.next_review ? new Date(data.next_review) : undefined,
					reviewCount: data.review_count || 0,
					reviewStage: data.review_stage || undefined,
					lastReviewedAt: data.last_reviewed_at ? new Date(data.last_reviewed_at) : undefined,
          review_count: data.review_count || 0, // Adicionado para compatibilidade
        };

        setSubjects(prevSubjects =>
          prevSubjects.map(subject =>
            subject.id === subjectId
              ? { ...subject, topics: [...subject.topics, newTopic] }
              : subject
          )
        );
        toast.success('Tópico adicionado com sucesso!');
      }
    } catch (err) {
      console.error('Unexpected error adding topic:', err);
      setError('Failed to add topic. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTopic = async (subjectId: string, topicId: string, updates: Partial<Topic>) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('topics')
        .update(updates)
        .eq('id', topicId);

      if (error) {
        console.error('Error updating topic:', error);
        setError(error.message);
        return;
      }

      setSubjects(prevSubjects =>
        prevSubjects.map(subject =>
          subject.id === subjectId
            ? {
              ...subject,
              topics: subject.topics.map(topic =>
                topic.id === topicId ? { ...topic, ...updates } : topic
              ),
            }
            : subject
        )
      );
      toast.success('Tópico atualizado com sucesso!');
    } catch (err) {
      console.error('Unexpected error updating topic:', err);
      setError('Failed to update topic. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTopic = async (subjectId: string, topicId: string) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (error) {
        console.error('Error deleting topic:', error);
        setError(error.message);
        return;
      }

      setSubjects(prevSubjects =>
        prevSubjects.map(subject =>
          subject.id === subjectId
            ? {
              ...subject,
              topics: subject.topics.filter(topic => topic.id !== topicId),
            }
            : subject
        )
      );
      toast.success('Tópico removido com sucesso!');
    } catch (err) {
      console.error('Unexpected error deleting topic:', err);
      setError('Failed to delete topic. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserCycle = async () => {
    if (!user) return;

    try {
      // Fetch user's subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, status')
        .eq('user_id', user.id);

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        return;
      }

      // Update subjects state
      if (subjectsData) {
        const formattedSubjects = subjectsData.map(subject => ({
          id: subject.id,
          name: subject.name,
          status: subject.status as Status,
          topics: [], // Assuming topics are loaded separately
        }));
        setSubjects(formattedSubjects);
      }
    } catch (error) {
      console.error('Error loading user cycle:', error);
    }
  };

  const refreshData = async () => {
    if (!user) return;
    
    console.log('AppContext - Refreshing all data...');
    setIsLoading(true);
    
    try {
      await Promise.all([
        loadSubjects(),
        loadUserCycle()
      ]);
      console.log('AppContext - Data refreshed successfully');
    } catch (error) {
      console.error('AppContext - Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
