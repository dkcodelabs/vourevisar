
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Subject, StudyProgress } from '@/types';
import { transformSubjectsData, calculateStudyProgress } from '../utils/dataTransformers';
import { withTimeout } from '@/utils/withTimeout';

export const useDataLoading = (
  user: any,
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>,
  setStudyProgress: React.Dispatch<React.SetStateAction<StudyProgress>>,
  setIsDataLoaded: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setUserSettings: React.Dispatch<React.SetStateAction<{ subjects_per_day: number } | null>>
) => {
  const [isLoading, setIsLoading] = useState(false);

  const loadSubjects = useCallback(async () => {
    if (!user) return;

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
          .eq('user_id', user.id)
          .eq('topics.is_active', true)
          .order('priority', { ascending: true })
          .order('position', { foreignTable: 'topics', ascending: true }),
        12000,
        'Carregamento de materias'
      );

      if (subjectsError) throw subjectsError;

      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('subjects_per_day')
        .eq('user_id', user.id)
        .single();

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
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]); // Apenas user.id como dependência

  const refreshData = useCallback(async () => {
    setIsDataLoaded(false);
    await loadSubjects();
  }, [loadSubjects]);

  const forceRefresh = useCallback(async () => {
    setIsDataLoaded(false);
    setSubjects([]);
    await loadSubjects();
  }, [loadSubjects]);

  const fetchSubjects = useCallback(async () => {
    await loadSubjects();
  }, [loadSubjects]);

  const fetchUserSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('subjects_per_day')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        return;
      }

      setUserSettings(settingsData || { subjects_per_day: 3 });
    } catch (error) {
      // Silently handle error
    }
  }, [user, setUserSettings]);

  return {
    isLoading,
    loadSubjects,
    refreshData,
    forceRefresh,
    fetchSubjects,
    fetchUserSettings
  };
};
