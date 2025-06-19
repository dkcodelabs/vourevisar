
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Subject, StudyProgress } from '@/types';
import { transformSubjectsData, calculateStudyProgress } from '../utils/dataTransformers';

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
      
      // Load subjects with topics - FORÇAR RELOAD SEM CACHE
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

      console.log('📚 Raw subjects data:', subjectsData);
      console.log('📚 Subjects with topics count:', subjectsData?.map(s => ({ name: s.name, topicsCount: s.topics?.length || 0 })));

      const transformedSubjects = transformSubjectsData(subjectsData || []);
      const progress = calculateStudyProgress(transformedSubjects);

      console.log('📚 Transformed subjects:', transformedSubjects.map(s => ({ name: s.name, topicsCount: s.topics?.length || 0 })));

      setSubjects(transformedSubjects);
      setStudyProgress(progress);
      setUserSettings(settingsData || { subjects_per_day: 3 });
      setIsDataLoaded(true);

      console.log('✅ loadSubjects - Success:', {
        subjects: transformedSubjects.length,
        totalTopics: transformedSubjects.reduce((acc, s) => acc + (s.topics?.length || 0), 0),
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
    // Limpar estado antes de recarregar para forçar atualização
    setIsDataLoaded(false);
    await loadSubjects();
  }, [loadSubjects, setIsDataLoaded]);

  const forceRefresh = useCallback(async () => {
    console.log('🔄 forceRefresh - Force refreshing all data');
    setIsDataLoaded(false);
    setSubjects([]);
    await loadSubjects();
  }, [loadSubjects, setIsDataLoaded, setSubjects]);

  const fetchSubjects = useCallback(async () => {
    console.log('🔄 fetchSubjects - Fetching subjects');
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
