import React, { createContext, useContext, useState, useEffect } from 'react';
import { Subject, UserProfile, StudyProgress, Status, RevisionStage } from '../types';
import { mockUserProfile } from '../data/mockData';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface AppContextType {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  studyProgress: StudyProgress;
  setStudyProgress: React.Dispatch<React.SetStateAction<StudyProgress>>;
  createSubject: (subject: Omit<Subject, 'id' | 'topics'>) => Promise<void>;
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<void>;
  updateSubject: (id: string, subject: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addTopicToSubject: (subjectId: string, topicName: string) => Promise<void>;
  removeTopicFromSubject: (subjectId: string, topicId: string) => Promise<void>;
  fetchSubjects: () => Promise<void>;
  fetchUserSettings: () => Promise<void>;
  recalculateProgress: () => void;
  isDataLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(mockUserProfile);
  const [studyProgress, setStudyProgress] = useState<StudyProgress>({
    totalSubjects: 0,
    completedSubjects: 0,
    totalTopics: 0,
    completedTopics: 0,
    delayedTopics: 0,
    todayTopics: 0,
    futureTopics: 0
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  console.log('AppContext - Current state:', {
    subjectsCount: subjects.length,
    isDataLoaded,
    isLoading,
    user: user ? 'authenticated' : 'not authenticated',
    error
  });

  // Setup realtime listeners
  useEffect(() => {
    if (!user) return;

    console.log('AppContext - Setting up realtime listeners');

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subjects'
        },
        (payload) => {
          console.log('AppContext - Subjects realtime change:', payload);
          fetchSubjects();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topics'
        },
        (payload) => {
          console.log('AppContext - Topics realtime change:', payload);
          fetchSubjects();
        }
      )
      .subscribe();

    return () => {
      console.log('AppContext - Cleaning up realtime listeners');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Buscar dados quando o usuário estiver autenticado
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) {
        console.log('AppContext - No user, clearing data');
        setSubjects([]);
        setIsDataLoaded(false);
        setIsLoading(false);
        setError(null);
        return;
      }

      if (isLoading) {
        console.log('AppContext - Already loading, skipping');
        return;
      }

      console.log('AppContext - Starting data load for user:', user.email);
      setIsLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchUserSettings(),
          fetchSubjects()
        ]);

        console.log('AppContext - Data load completed successfully');
      } catch (error) {
        console.error('AppContext - Error loading data:', error);
        if (isMounted) {
          setError('Erro ao carregar dados');
          toast.error("Erro ao carregar dados. Por favor, tente novamente.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsDataLoaded(true);
          console.log('AppContext - Data marked as loaded');
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.id]); // Only depend on user.id to avoid infinite loops

  // Recalcular progresso sempre que as matérias mudarem
  useEffect(() => {
    if (isDataLoaded) {
      console.log('AppContext - Recalculating progress due to subjects change');
      recalculateProgress();
    }
  }, [subjects, isDataLoaded]);

  // Função para verificar se uma matéria está completamente concluída (100% dominada - sem revisões pendentes)
  const isSubjectCompleted = (subject: Subject): boolean => {
    if (subject.topics.length === 0) return false;
    return subject.topics.every(topic => 
      topic.reviewStage === 'Concluído' && topic.nextReview === null
    );
  };

  // Função para verificar se uma matéria tem todos os tópicos no estágio "Concluído" (independente de nextReview)
  const isSubjectWithAllTopicsCompleted = (subject: Subject): boolean => {
    if (subject.topics.length === 0) return false;
    return subject.topics.every(topic => topic.reviewStage === 'Concluído');
  };

  // Função para buscar as matérias do usuário
  const fetchSubjects = async () => {
    if (!user) return;

    try {
      console.log('AppContext - Fetching subjects for user:', user.email);
      
      // Buscar as disciplinas do usuário ordenadas por prioridade
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true });
      
      if (subjectsError) throw subjectsError;
      
      console.log('AppContext - Found subjects:', subjectsData?.length || 0);
      
      // Para cada disciplina, buscar seus tópicos
      const subjectsWithTopics = await Promise.all(
        (subjectsData || []).map(async (subject) => {
          const { data: topicsData, error: topicsError } = await supabase
            .from('topics')
            .select('*')
            .eq('subject_id', subject.id);
          
          if (topicsError) throw topicsError;
          
          // Converter dados do banco para o formato da aplicação
          const processedTopics = (topicsData || []).map(topic => ({
            id: topic.id,
            name: topic.name,
            completed: topic.completed,
            reviewCount: topic.review_count,
            review_count: topic.review_count, // Add compatibility field
            nextReview: topic.next_review ? new Date(topic.next_review) : undefined,
            reviewStage: topic.review_stage as RevisionStage,
            lastReviewedAt: topic.last_reviewed_at ? new Date(topic.last_reviewed_at) : undefined
          }));
          
          console.log(`AppContext - Subject ${subject.name} has ${processedTopics.length} topics`);
          
          return {
            id: subject.id,
            name: subject.name,
            priority: subject.priority,
            status: subject.status as Status || 'Nova',
            color: subject.color,
            topics: processedTopics
          };
        })
      );
      
      console.log('AppContext - Processed subjects with topics:', subjectsWithTopics.length);
      setSubjects(subjectsWithTopics);
    } catch (error) {
      console.error('Erro ao buscar matérias:', error);
      throw error;
    }
  };

  // Função para buscar configurações do usuário
  const fetchUserSettings = async () => {
    if (!user) return;

    try {
      console.log('AppContext - Fetching user settings for:', user.email);
      
      // Buscar o perfil do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) throw profileError;
      
      // Buscar configurações do usuário
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (settingsError) throw settingsError;
      
      // Atualizar o perfil do usuário
      if (profileData && settingsData) {
        setUserProfile({
          name: profileData.name || '',
          email: profileData.email || user.email || '',
          phone: profileData.phone || '',
          settings: {
            subjectsPerDay: settingsData.subjects_per_day,
            notificationsEnabled: settingsData.notifications_enabled,
            notificationTime: settingsData.notification_time
          }
        });
        console.log('AppContext - User settings loaded successfully');
      } else if (profileData) {
        // Se só tem profile, usar configurações padrão
        setUserProfile({
          name: profileData.name || '',
          email: profileData.email || user.email || '',
          phone: profileData.phone || '',
          settings: {
            subjectsPerDay: 3,
            notificationsEnabled: true,
            notificationTime: '08:00'
          }
        });
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      throw error;
    }
  };

  // Função corrigida para recalcular o progresso
  const recalculateProgress = () => {
    console.log('AppContext - Recalculating progress for', subjects.length, 'subjects');
    
    // Contar tópicos por status
    let totalTopics = 0;
    let completedTopics = 0; // Tópicos com reviewStage "Concluído" E nextReview null
    let delayedTopics = 0;
    let todayTopics = 0;
    let futureTopics = 0;
    
    subjects.forEach(subject => {
      totalTopics += subject.topics.length;
      
      subject.topics.forEach(topic => {
        // Contar como completado APENAS se reviewStage "Concluído" E nextReview null
        if (topic.reviewStage === 'Concluído' && topic.nextReview === null) {
          completedTopics++;
        }
        
        if (topic.nextReview) {
          const reviewDate = new Date(topic.nextReview);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (new Date(reviewDate).toDateString() === today.toDateString()) {
            todayTopics++;
          } else if (reviewDate < today) {
            delayedTopics++;
          } else if (reviewDate > today) {
            futureTopics++;
          }
        }
      });
    });
    
    // Contar matérias completadas (todas matérias cujos tópicos têm reviewStage "Concluído")
    const completedSubjects = subjects.filter(subject => 
      subject.topics.length > 0 && 
      isSubjectWithAllTopicsCompleted(subject)
    ).length;
    
    const newProgress = {
      totalSubjects: subjects.length,
      completedSubjects,
      totalTopics,
      completedTopics,
      delayedTopics,
      todayTopics,
      futureTopics
    };
    
    console.log('AppContext - New progress calculated:', newProgress);
    setStudyProgress(newProgress);
  };

  // Função para criar uma nova matéria (nova interface)
  const createSubject = async (subject: Omit<Subject, 'id' | 'topics'>) => {
    if (!user) return;

    try {
      // Criar a matéria no banco
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name: subject.name,
          user_id: user.id,
          status: subject.status || 'Nova',
          color: subject.color,
          priority: subjects.length + 1
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        toast.success("Matéria adicionada com sucesso");
        // A atualização será feita via realtime listener
      }
    } catch (error) {
      console.error('Erro ao adicionar matéria:', error);
      toast.error("Erro ao adicionar matéria");
      throw error;
    }
  };

  // Função para adicionar uma nova matéria (interface antiga)
  const addSubject = async (subject: Omit<Subject, 'id'>) => {
    if (!user) return;

    try {
      // Criar a matéria no banco
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name: subject.name,
          user_id: user.id,
          status: subject.status || 'Nova',
          color: subject.color,
          priority: subjects.length + 1
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        toast.success("Matéria adicionada com sucesso");
        // A atualização será feita via realtime listener
      }
    } catch (error) {
      console.error('Erro ao adicionar matéria:', error);
      toast.error("Erro ao adicionar matéria");
      throw error;
    }
  };

  // Função para atualizar uma matéria
  const updateSubject = async (id: string, updatedFields: Partial<Subject>) => {
    if (!user) return;

    try {
      // Atualizar a matéria no banco
      const { error } = await supabase
        .from('subjects')
        .update({ 
          name: updatedFields.name,
          status: updatedFields.status,
          color: updatedFields.color,
          priority: updatedFields.priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success("Matéria atualizada com sucesso");
      // A atualização será feita via realtime listener
    } catch (error) {
      console.error('Erro ao atualizar matéria:', error);
      toast.error("Erro ao atualizar matéria");
      throw error;
    }
  };

  // Função melhorada para excluir uma matéria
  const deleteSubject = async (id: string) => {
    if (!user) return;

    try {
      console.log('AppContext - Deleting subject:', id);

      // Com CASCADE configurado, não precisamos excluir tópicos manualmente
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      console.log('AppContext - Subject deleted successfully');
      toast.success("Matéria e todos os tópicos relacionados foram removidos com sucesso");
      // A atualização será feita via realtime listener
    } catch (error) {
      console.error('Erro ao remover matéria:', error);
      toast.error("Erro ao remover matéria");
      throw error;
    }
  };

  // Função para adicionar um tópico a uma matéria
  const addTopicToSubject = async (subjectId: string, topicName: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('topics')
        .insert({
          name: topicName,
          subject_id: subjectId,
          completed: false,
          review_count: 0
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        toast.success("Tópico adicionado com sucesso");
        // A atualização será feita via realtime listener
      }
    } catch (error) {
      console.error('Erro ao adicionar tópico:', error);
      toast.error("Erro ao adicionar tópico");
      throw error;
    }
  };

  // Função para remover um tópico de uma matéria
  const removeTopicFromSubject = async (subjectId: string, topicId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);
        
      if (error) throw error;
      
      toast.success("Tópico removido com sucesso");
      // A atualização será feita via realtime listener
    } catch (error) {
      console.error('Erro ao remover tópico:', error);
      toast.error("Erro ao remover tópico");
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        subjects,
        setSubjects,
        userProfile,
        setUserProfile,
        studyProgress,
        setStudyProgress,
        createSubject,
        addSubject,
        updateSubject,
        deleteSubject,
        addTopicToSubject,
        removeTopicFromSubject,
        fetchSubjects,
        fetchUserSettings,
        recalculateProgress,
        isDataLoaded,
        isLoading,
        error
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
