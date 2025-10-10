import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAllStudiesCompleted = () => {
  const { user } = useAuth();
  const [areAllStudiesCompleted, setAreAllStudiesCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAllStudiesCompleted = useCallback(async () => {
    if (!user) {
      setAreAllStudiesCompleted(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data: allUserSubjects, error } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          topics:topics(id, completed)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      if (!allUserSubjects || allUserSubjects.length === 0) {
        setAreAllStudiesCompleted(false);
        setIsLoading(false);
        return;
      }

      // Verificar se TODAS as matérias têm TODOS os tópicos completed: true
      const allCompleted = allUserSubjects.every(subject => 
        subject.topics && 
        subject.topics.length > 0 && 
        subject.topics.every(topic => topic.completed === true)
      );

      console.log('🔍 useAllStudiesCompleted - Verificação:', {
        totalSubjects: allUserSubjects.length,
        allCompleted,
        subjectsStatus: allUserSubjects.map(s => ({
          name: s.name,
          totalTopics: s.topics?.length || 0,
          completedTopics: s.topics?.filter(t => t.completed).length || 0,
          allTopicsCompleted: s.topics?.every(t => t.completed) || false
        }))
      });

      setAreAllStudiesCompleted(allCompleted);
    } catch (error) {
      console.error('Erro ao verificar estudos concluídos:', error);
      setAreAllStudiesCompleted(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Verificar quando o componente monta
  useEffect(() => {
    checkAllStudiesCompleted();
  }, [checkAllStudiesCompleted]);

  // Escutar eventos de atualização
  useEffect(() => {
    const handleUpdate = () => {
      console.log('🔄 useAllStudiesCompleted: Recarregando por evento');
      checkAllStudiesCompleted();
    };

    window.addEventListener('cycleUpdated', handleUpdate);
    window.addEventListener('studiesCompleted', handleUpdate);
    window.addEventListener('allStudiesCompleted', handleUpdate);
    window.addEventListener('forceComponentRerender', handleUpdate);

    return () => {
      window.removeEventListener('cycleUpdated', handleUpdate);
      window.removeEventListener('studiesCompleted', handleUpdate);
      window.removeEventListener('allStudiesCompleted', handleUpdate);
      window.removeEventListener('forceComponentRerender', handleUpdate);
    };
  }, [checkAllStudiesCompleted]);

  return {
    areAllStudiesCompleted,
    isLoading,
    recheckStudiesCompleted: checkAllStudiesCompleted
  };
};