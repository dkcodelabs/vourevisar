
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Subject, StudyProgress } from '@/types';
import { transformSubjectData, calculateStudyProgress } from '../utils/dataTransformers';

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
    if (!user) {
      console.log('📚 loadSubjects - No user, skipping');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📚 loadSubjects - Loading subjects for user:', user.id);
      
      // Load subjects with topics
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          *,
          topics (*)
        `)
        .eq('user_id', user.id)
        .order('priority', { ascending: true });

      if (subjectsError) {
        console.error('❌ loadSubjects - Error loading subjects:', subjectsError);
        throw subjectsError;
      }

      // Load user settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('subjects_per_day')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('❌ loadSubjects - Error loading user settings:', settingsError);
      }

      const transformedSubjects = transformSubjectData(subjectsData || []);
      const progress = calculateStudyProgress(transformedSubjects);

      setSubjects(transformedSubjects);
      setStudyProgress(progress);
      setUserSettings(settingsData || { subjects_per_day: 3 });
      setIsDataLoaded(true);

      console.log('✅ loadSubjects - Success:', {
        subjects: transformedSubjects.length,
        settings: settingsData
      });
      
    } catch (error) {
      console.error('❌ loadSubjects - Error:', error);
      setError('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [user, setSubjects, setStudyProgress, setIsDataLoaded, setError, setUserSettings]);

  const refreshData = useCallback(async () => {
    console.log('🔄 refreshData - Refreshing all data');
    await loadSubjects();
  }, [loadSubjects]);

  const forceRefresh = useCallback(async () => {
    console.log('🔄 forceRefresh - Force refreshing all data');
    setIsDataLoaded(false);
    await loadSubjects();
  }, [loadSubjects, setIsDataLoaded]);

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
        console.error('❌ fetchUserSettings - Error:', settingsError);
        return;
      }

      setUserSettings(settingsData || { subjects_per_day: 3 });
    } catch (error) {
      console.error('❌ fetchUserSettings - Error:', error);
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
