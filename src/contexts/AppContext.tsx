import React, { createContext, useContext, useState, useEffect } from 'react';
import { Subject, UserProfile, StudyProgress, Status, RevisionStage } from '../types';
import { mockSubjects, mockUserProfile, mockStudyProgress } from '../data/mockData';
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
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<void>;
  updateSubject: (id: string, subject: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addTopicToSubject: (subjectId: string, topicName: string) => Promise<void>;
  removeTopicFromSubject: (subjectId: string, topicId: string) => Promise<void>;
  fetchSubjects: () => Promise<void>;
  fetchUserSettings: () => Promise<void>;
  recalculateProgress: () => void;
  isDataLoaded: boolean;
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
  const { user } = useAuth();

  console.log('AppContext - Current state:', {
    subjectsCount: subjects.length,
    isDataLoaded,
    user: user ? 'authenticated' : 'not authenticated',
    studyProgress
  });

  // Buscar dados quando o usuário estiver autenticado
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) {
        setIsDataLoaded(false);
        return;
      }

      console.log('AppContext - Starting data load for user:', user.email);
      setIsDataLoaded(false);

      try {
        // Buscar configurações e matérias em paralelo
        const [settingsResult, subjectsResult] = await Promise.allSettled([
          fetchUserSettings(),
          fetchSubjects()
        ]);

        if (settingsResult.status === 'rejected') {
          console.error('Erro ao carregar configurações:', settingsResult.reason);
          if (isMounted) {
            toast.error("Erro ao carregar configurações. Por favor, tente novamente.");
          }
        }

        if (subjectsResult.status === 'rejected') {
          console.error('Erro ao carregar matérias:', subjectsResult.reason);
          if (isMounted) {
            toast.error("Erro ao carregar matérias. Por favor, tente novamente.");
          }
        }

        console.log('AppContext - Data load completed');
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        if (isMounted) {
          toast.error("Erro ao carregar dados. Por favor, tente novamente.");
        }
      } finally {
        if (isMounted) {
          setIsDataLoaded(true);
          console.log('AppContext - Data marked as loaded');
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Recalcular progresso sempre que as matérias mudarem
  useEffect(() => {
    if (subjects.length >= 0) { // >= 0 porque pode ser que não tenha matérias mesmo
      console.log('AppContext - Recalculating progress due to subjects change');
      recalculateProgress();
    }
  }, [subjects]);

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
            nextReview: topic.next_review ? new Date(topic.next_review) : undefined,
            reviewStage: topic.review_stage as RevisionStage,
            lastReviewedAt: topic.last_reviewed_at ? new Date(topic.last_reviewed_at) : undefined
          }));
          
          console.log(`AppContext - Subject ${subject.name} has ${processedTopics.length} topics:`, processedTopics);
          
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
      throw error; // Propaga o erro para ser tratado no nível superior
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
        .single();
      
      if (profileError) throw profileError;
      
      // Buscar configurações do usuário
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (settingsError) throw settingsError;
      
      // Atualizar o perfil do usuário
      if (profileData && settingsData) {
        setUserProfile({
          name: profileData.name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          settings: {
            subjectsPerDay: settingsData.subjects_per_day,
            notificationsEnabled: settingsData.notifications_enabled,
            notificationTime: settingsData.notification_time
          }
        });
        console.log('AppContext - User settings loaded successfully');
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      throw error; // Propaga o erro para ser tratado no nível superior
    }
  };

  // Função corrigida para recalcular o progresso
  const recalculateProgress = () => {
    console.log('AppContext - Recalculating progress for', subjects.length, 'subjects');
    console.log('AppContext - Subjects data:', subjects);
    
    // Contar tópicos por status
    let totalTopics = 0;
    let completedTopics = 0; // Tópicos com reviewStage "Concluído" E nextReview null
    let delayedTopics = 0;
    let todayTopics = 0;
    let futureTopics = 0;
    
    subjects.forEach(subject => {
      console.log(`AppContext - Processing subject ${subject.name} with ${subject.topics.length} topics`);
      totalTopics += subject.topics.length;
      
      subject.topics.forEach(topic => {
        console.log(`AppContext - Topic ${topic.name}: reviewStage=${topic.reviewStage}, nextReview=${topic.nextReview}`);
        
        // Contar como completado APENAS se reviewStage "Concluído" E nextReview null
        if (topic.reviewStage === 'Concluído' && topic.nextReview === null) {
          completedTopics++;
          console.log(`AppContext - Topic ${topic.name} counted as completed`);
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

  // Função para adicionar uma nova matéria
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
          priority: subjects.length + 1 // Define a prioridade com base no número de matérias existentes
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Adiciona a nova matéria à lista
        const newSubject: Subject = {
          id: data.id,
          name: data.name,
          status: data.status as Status || 'Nova',
          topics: [],
          priority: data.priority
        };
        
        setSubjects(prev => [...prev, newSubject]);
        
        toast.success("Matéria adicionada com sucesso");
      }
    } catch (error) {
      console.error('Erro ao adicionar matéria:', error);
      toast.error("Erro ao adicionar matéria");
    }
  };

  // Função para atualizar uma matéria
  const updateSubject = async (id: string, updatedFields: Partial<Subject>) => {
    if (!user) return;

    try {
      // Verificar se deve atualizar automaticamente o status
      const subject = subjects.find(s => s.id === id);
      let finalStatus = updatedFields.status;
      
      if (subject && !updatedFields.status) {
        // Se não foi especificado um status, verificar se deve ser atualizado automaticamente
        if (isSubjectCompleted(subject) && subject.status !== 'Concluída') {
          finalStatus = 'Concluída';
        }
      }

      // Atualizar a matéria no banco
      const { error } = await supabase
        .from('subjects')
        .update({ 
          name: updatedFields.name,
          status: finalStatus || updatedFields.status,
          priority: updatedFields.priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      
      // Atualizar a matéria na lista
      setSubjects(prev =>
        prev.map((subject) =>
          subject.id === id ? { ...subject, ...updatedFields, status: finalStatus || updatedFields.status || subject.status } : subject
        )
      );
      
      toast.success("Matéria atualizada com sucesso");
    } catch (error) {
      console.error('Erro ao atualizar matéria:', error);
      toast.error("Erro ao atualizar matéria");
    }
  };

  // Função para excluir uma matéria
  const deleteSubject = async (id: string) => {
    if (!user) return;

    try {
      // Primeiro, buscar todos os tópicos da disciplina
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id')
        .eq('subject_id', id);

      if (topicsError) throw topicsError;

      // Excluir todos os tópicos relacionados à matéria
      const { error: deleteTopicsError } = await supabase
        .from('topics')
        .delete()
        .eq('subject_id', id);
        
      if (deleteTopicsError) throw deleteTopicsError;

      // Remover a disciplina de todos os ciclos de usuários
      const { data: userCycles, error: cyclesError } = await supabase
        .from('user_cycles')
        .select('*')
        .contains('ciclo_atual', [id])
        .or(`disciplinas_do_dia.cs.{${id}}`);

      if (cyclesError) throw cyclesError;

      // Atualizar ciclos removendo referências à disciplina excluída
      for (const cycle of userCycles || []) {
        const updatedCicloAtual = cycle.ciclo_atual.filter((subjectId: string) => subjectId !== id);
        const updatedDisciplinasDoDia = cycle.disciplinas_do_dia.filter((subjectId: string) => subjectId !== id);

        await supabase
          .from('user_cycles')
          .update({
            ciclo_atual: updatedCicloAtual,
            disciplinas_do_dia: updatedDisciplinasDoDia,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', cycle.id);
      }

      // Excluir a matéria no banco
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Remover a matéria da lista
      setSubjects((prev) => prev.filter((subject) => subject.id !== id));
      
      toast.success("Matéria e todos os tópicos relacionados foram removidos com sucesso");
    } catch (error) {
      console.error('Erro ao remover matéria:', error);
      toast.error("Erro ao remover matéria");
    }
  };

  // Função para adicionar um tópico a uma matéria
  const addTopicToSubject = async (subjectId: string, topicName: string) => {
    if (!user) return;

    try {
      // Criar o tópico no banco
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
        // Adicionar o tópico à matéria
        setSubjects((prev) =>
          prev.map((subject) => {
            if (subject.id === subjectId) {
              return {
                ...subject,
                topics: [
                  ...subject.topics,
                  {
                    id: data.id,
                    name: data.name,
                    completed: false,
                    reviewCount: 0
                  },
                ],
              };
            }
            return subject;
          })
        );
        
        toast.success("Tópico adicionado com sucesso");
      }
    } catch (error) {
      console.error('Erro ao adicionar tópico:', error);
      toast.error("Erro ao adicionar tópico");
    }
  };

  // Função para remover um tópico de uma matéria
  const removeTopicFromSubject = async (subjectId: string, topicId: string) => {
    if (!user) return;

    try {
      // Excluir o tópico no banco
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);
        
      if (error) throw error;
      
      // Remover o tópico da matéria
      setSubjects((prev) =>
        prev.map((subject) => {
          if (subject.id === subjectId) {
            return {
              ...subject,
              topics: subject.topics.filter((topic) => topic.id !== topicId),
            };
          }
          return subject;
        })
      );
      
      toast.success("Tópico removido com sucesso");
    } catch (error) {
      console.error('Erro ao remover tópico:', error);
      toast.error("Erro ao remover tópico");
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
        addSubject,
        updateSubject,
        deleteSubject,
        addTopicToSubject,
        removeTopicFromSubject,
        fetchSubjects,
        fetchUserSettings,
        recalculateProgress,
        isDataLoaded
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
