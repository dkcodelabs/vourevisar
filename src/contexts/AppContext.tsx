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
  const { user } = useAuth();

  // Buscar dados quando o usuário estiver autenticado
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) return;

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
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        if (isMounted) {
          toast.error("Erro ao carregar dados. Por favor, tente novamente.");
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Função para buscar as matérias do usuário
  const fetchSubjects = async () => {
    if (!user) return;

    try {
      // Buscar as disciplinas do usuário ordenadas por prioridade
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true });
      
      if (subjectsError) throw subjectsError;
      
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
      
      setSubjects(subjectsWithTopics);
      recalculateProgress();
    } catch (error) {
      console.error('Erro ao buscar matérias:', error);
      throw error; // Propaga o erro para ser tratado no nível superior
    }
  };

  // Função para buscar configurações do usuário
  const fetchUserSettings = async () => {
    if (!user) return;

    try {
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
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      throw error; // Propaga o erro para ser tratado no nível superior
    }
  };

  // Função para recalcular o progresso
  const recalculateProgress = () => {
    // Contar tópicos por status
    let totalTopics = 0;
    let completedTopics = 0;
    let delayedTopics = 0;
    let todayTopics = 0;
    let futureTopics = 0;
    
    subjects.forEach(subject => {
      totalTopics += subject.topics.length;
      
      subject.topics.forEach(topic => {
        if (topic.completed && (!topic.nextReview || topic.reviewStage === 'Concluído')) {
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
    
    // Contar matérias concluídas (todas matérias cujos tópicos estão todos concluídos)
    const completedSubjects = subjects.filter(subject => 
      subject.topics.length > 0 && 
      subject.topics.every(topic => 
        topic.completed && (!topic.nextReview || topic.reviewStage === 'Concluído')
      )
    ).length;
    
    setStudyProgress({
      totalSubjects: subjects.length,
      completedSubjects,
      totalTopics,
      completedTopics,
      delayedTopics,
      todayTopics,
      futureTopics
    });
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
        recalculateProgress();
        
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
      // Atualizar a matéria no banco
      const { error } = await supabase
        .from('subjects')
        .update({ 
          name: updatedFields.name,
          status: updatedFields.status,
          priority: updatedFields.priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      
      // Atualizar a matéria na lista
      setSubjects(prev =>
        prev.map((subject) =>
          subject.id === id ? { ...subject, ...updatedFields } : subject
        )
      );
      
      recalculateProgress();
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
      recalculateProgress();
      
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
        
        recalculateProgress();
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
      
      recalculateProgress();
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
        recalculateProgress
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
