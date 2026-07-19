
import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { type User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Subject, StudyProgress } from '@/types';
import { transformSubjectsData, calculateStudyProgress } from '../utils/dataTransformers';
import { withTimeout } from '@/utils/withTimeout';

export const useDataLoading = (
  user: User | null,
  setSubjects: Dispatch<SetStateAction<Subject[]>>,
  setStudyProgress: Dispatch<SetStateAction<StudyProgress>>,
  setIsDataLoaded: Dispatch<SetStateAction<boolean>>,
  setError: Dispatch<SetStateAction<string | null>>,
  setUserSettings: Dispatch<SetStateAction<{ subjects_per_day: number } | null>>
) => {
  const [isLoading, setIsLoading] = useState(false);
  const userId = user?.id ?? null;

  const loadSubjects = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: subjectsData, error: subjectsError } = await withTimeout(
        supabase
          .from('subjects')
          .select(`
            *,
            topics (
              *,
              difficulty_level,
              next_review
            )
          `)
          .eq('user_id', userId)
          .eq('topics.is_active', true)
          .order('priority', { ascending: true })
          .order('position', { foreignTable: 'topics', ascending: true }),
        12000,
        'Carregamento de materias'
      );

      if (subjectsError) throw subjectsError;

      const { data: settingsData, error: settingsError } = await withTimeout(
        supabase
          .from('user_settings')
          .select('subjects_per_day')
          .eq('user_id', userId)
          .maybeSingle(),
        8000,
        'Carregamento de configuracoes do usuario'
      );

      if (settingsError && settingsError.code !== 'PGRST116') {
        // Silently handle settings error
      }

      const transformedSubjects = transformSubjectsData(subjectsData || []);
      const progress = calculateStudyProgress(transformedSubjects);

      setSubjects(transformedSubjects);
      setStudyProgress(progress);
      setUserSettings(settingsData || { subjects_per_day: 3 });
      setIsDataLoaded(true);

    } catch (error) {
      setError('Erro ao carregar dados');
      setSubjects([]);
      setStudyProgress({
        totalSubjects: 0,
        completedSubjects: 0,
        totalTopics: 0,
        completedTopics: 0,
        delayedTopics: 0,
        todayTopics: 0,
        futureTopics: 0,
      });
      setUserSettings({ subjects_per_day: 3 });
      setIsDataLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [setError, setIsDataLoaded, setStudyProgress, setSubjects, setUserSettings, userId]);

  const refreshData = useCallback(async () => {
    setIsDataLoaded(false);
    await loadSubjects();
  }, [loadSubjects, setIsDataLoaded]);

  const forceRefresh = useCallback(async () => {
    setIsDataLoaded(false);
    setSubjects([]);
    await loadSubjects();
  }, [loadSubjects, setIsDataLoaded, setSubjects]);

  const fetchSubjects = useCallback(async () => {
    await loadSubjects();
  }, [loadSubjects]);

  const fetchUserSettings = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('subjects_per_day')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        return;
      }

      setUserSettings(settingsData || { subjects_per_day: 3 });
    } catch (error) {
      // Silently handle error
    }
  }, [setUserSettings, userId]);

  return {
    isLoading,
    loadSubjects,
    refreshData,
    forceRefresh,
    fetchSubjects,
    fetchUserSettings
  };
};
