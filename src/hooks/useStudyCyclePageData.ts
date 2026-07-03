import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { transformSubjectsData } from '@/contexts/utils/dataTransformers';
import { supabase } from '@/integrations/supabase/client';
import { errorService } from '@/lib/errors/errorService';
import { repairOrphanedSubjects } from '@/services/dataIntegrityService';
import type { Subject, UserCycle } from '@/types';
import { withTimeout } from '@/utils/withTimeout';

export type StudyCycleUserCycle = UserCycle & {
  data_ultimo_reset?: string | null;
  materias_estudadas_hoje?: string[];
  materias_por_dia?: number;
};

type UseStudyCyclePageDataParams = {
  refreshOrigins: () => Promise<unknown> | unknown;
  user: User | null;
};

export const useStudyCyclePageData = ({
  refreshOrigins,
  user,
}: UseStudyCyclePageDataParams) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);
  const [userCycle, setUserCycle] = useState<StudyCycleUserCycle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  const loadSubjects = useCallback(async (_ignoreCache: boolean = false) => {
    if (!user) return;

    const cacheKey = `subjects_${user.id}`;
    localStorage.removeItem(cacheKey);

    if (isFirstLoad.current) {
      setIsLoading(true);
    }
    setLoadError(null);

    try {
      const { data, error: subjectsError } = await withTimeout(
        supabase
          .from('subjects')
          .select(`*, topics(*, difficulty_level)`)
          .eq('user_id', user.id)
          .order('priority', { ascending: true })
          .order('created_at', { foreignTable: 'topics', ascending: true }),
        12000,
        'Carregamento de materias do ciclo'
      );

      if (subjectsError) throw subjectsError;

      const transformedSubjects = transformSubjectsData(data || []);
      setSubjects(transformedSubjects);
      setLocalSubjects(transformedSubjects);
    } catch (error) {
      setLoadError('Não foi possível carregar seu ciclo.');
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'loadSubjects',
          userMessage: 'Erro ao carregar matérias.',
          severity: 'high',
          scope: 'core',
          userId: user.id,
        }
      );
    } finally {
      setIsLoading(false);
      setDataLoaded(true);
      isFirstLoad.current = false;
    }
  }, [user]);

  const loadUserCycle = useCallback(async () => {
    if (!user) return;

    const cacheKey = `user_cycle_cache_${user.id}`;
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_cycles')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1),
        12000,
        'Carregamento do ciclo de estudos'
      );

      if (error) throw error;

      const cycleData = data?.[0] || null;

      if (!cycleData || !cycleData.ciclo_atual || cycleData.ciclo_atual.length === 0) {
        localStorage.removeItem(cacheKey);
        setUserCycle(null);
      } else {
        localStorage.setItem(cacheKey, JSON.stringify(cycleData));
        setUserCycle(cycleData);
      }
    } catch (error) {
      console.error('Erro ao carregar ciclo:', error);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.ciclo_atual && parsed.ciclo_atual.length > 0) {
            setUserCycle(parsed);
          }
        } catch (cacheError) {
          console.error('Invalid cache', cacheError);
        }
      }
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    if (!user) return;

    localStorage.removeItem(`subjects_${user.id}`);
    localStorage.removeItem(`subjects_${user.id} `);
    await loadSubjects();
    await Promise.resolve(refreshOrigins());
    window.dispatchEvent(new CustomEvent('subjectUpdated', { detail: { source: 'Subjects' } }));
  }, [loadSubjects, refreshOrigins, user]);

  const retryInitialLoad = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    await Promise.allSettled([
      loadSubjects(true),
      loadUserCycle(),
      Promise.resolve(refreshOrigins()),
    ]);
    setLoading(false);
  }, [loadSubjects, loadUserCycle, refreshOrigins]);

  useEffect(() => {
    if (user?.id) {
      void (async () => {
        await Promise.allSettled([
          withTimeout(loadSubjects(), 14000, 'Carregamento inicial de materias'),
          withTimeout(loadUserCycle(), 14000, 'Carregamento inicial do ciclo'),
          withTimeout(repairOrphanedSubjects(user.id), 14000, 'Reparo de materias orfas'),
        ]);
        setLoading(false);
      })();

      let updateTimeout: ReturnType<typeof setTimeout>;
      const handleExternalUpdate = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.source === 'Subjects') {
          return;
        }

        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(async () => {
          try {
            await Promise.all([
              loadSubjects(true),
              loadUserCycle(),
              Promise.resolve(refreshOrigins()),
            ]);
          } catch (error) {
            console.error('❌ Synchronized refresh failed:', error);
          }
        }, 300);
      };

      window.addEventListener('subjectUpdated', handleExternalUpdate);
      window.addEventListener('mergeUpdated', handleExternalUpdate);
      window.addEventListener('cycleUpdated', handleExternalUpdate);
      window.addEventListener('editalUpdated', handleExternalUpdate);

      return () => {
        clearTimeout(updateTimeout);
        window.removeEventListener('subjectUpdated', handleExternalUpdate);
        window.removeEventListener('mergeUpdated', handleExternalUpdate);
        window.removeEventListener('cycleUpdated', handleExternalUpdate);
        window.removeEventListener('editalUpdated', handleExternalUpdate);
      };
    }

    if (!user) {
      setLoading(false);
    }
  }, [loadSubjects, loadUserCycle, refreshOrigins, user]);

  useEffect(() => {
    if (subjects.length > 0) {
      setLocalSubjects(subjects);
    } else if (dataLoaded) {
      setLocalSubjects([]);
    }
  }, [dataLoaded, subjects]);

  return {
    dataLoaded,
    isLoading,
    loadError,
    loading,
    localSubjects,
    loadSubjects,
    loadUserCycle,
    refreshData,
    retryInitialLoad,
    setIsLoading,
    setLocalSubjects,
    setSubjects,
    setUserCycle,
    subjects,
    userCycle,
  };
};
