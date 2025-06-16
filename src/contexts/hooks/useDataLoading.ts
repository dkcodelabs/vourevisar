
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Subject, StudyProgress } from '@/types';
import { toast } from 'sonner';
import { transformSubjectsData, calculateProgress, fixSubjectPriorities } from '../utils/dataTransformers';

export const useDataLoading = (
  user: any,
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>,
  setStudyProgress: React.Dispatch<React.SetStateAction<StudyProgress>>,
  setIsDataLoaded: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
) => {
  const [isLoading, setIsLoading] = useState(false);

  const loadSubjects = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('📄 AppContext - Loading subjects for user:', user.id);
      
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          *,
          topics (*)
        `)
        .eq('user_id', user.id)
        .order('priority', { ascending: true });

      if (subjectsError) throw subjectsError;

      const transformedSubjects = transformSubjectsData(subjectsData);
      const fixedSubjects = await fixSubjectPriorities(transformedSubjects, supabase);
      
      setSubjects(fixedSubjects);
      calculateProgress(fixedSubjects);
      setStudyProgress(calculateProgress(fixedSubjects));
      setIsDataLoaded(true);
      console.log('✅ AppContext - Subjects loaded successfully:', fixedSubjects.length);
    } catch (error: any) {
      console.error('❌ AppContext - Error loading subjects:', error);
      setError(error.message);
      toast.error('Erro ao carregar matérias');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    if (!user) return;
    
    console.log('🔄 AppContext - Refreshing all data...');
    setIsLoading(true);
    
    try {
      await loadSubjects();
      console.log('✅ AppContext - Data refreshed successfully');
    } catch (error) {
      console.error('❌ AppContext - Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const forceRefresh = async () => {
    if (!user) return;
    
    console.log('💪 AppContext - Force refreshing all data...');
    setIsDataLoaded(false);
    setSubjects([]);
    setError(null);
    
    await refreshData();
  };

  const fetchUserSettings = async () => {
    console.log('Fetching user settings...');
  };

  return {
    isLoading,
    loadSubjects,
    refreshData,
    forceRefresh,
    fetchSubjects: loadSubjects,
    fetchUserSettings
  };
};
