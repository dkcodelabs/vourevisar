import { useState, useEffect, useCallback } from 'react';
import { Subject } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { transformSubjectsData } from '@/contexts/utils/dataTransformers';
import { useAuth } from '@/contexts/AuthContext';

const CACHE_KEY = 'app_subjects_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos

interface CacheData {
  subjects: Subject[];
  timestamp: number;
  userId: string;
}

export const usePersistedData = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFromCache = useCallback((): Subject[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached || !user) return null;

      const data: CacheData = JSON.parse(cached);

      // Verificar se é do mesmo usuário e não expirou
      if (data.userId === user.id && Date.now() - data.timestamp < CACHE_EXPIRY) {
        return data.subjects;
      }
    } catch (error) {
      console.error('Erro ao ler cache:', error);
    }
    return null;
  }, [user]);

  const saveToCache = useCallback((subjects: Subject[]) => {
    if (!user) return;

    try {
      const data: CacheData = {
        subjects,
        timestamp: Date.now(),
        userId: user.id
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }, [user]);

  const loadSubjects = useCallback(async () => {
    if (!user) return;

    // Tentar carregar do cache primeiro
    const cachedSubjects = loadFromCache();
    if (cachedSubjects) {
      setSubjects(cachedSubjects);
      return;
    }

    // Se não tem cache, carregar do banco
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('subjects')
        .select(`*, topics (*, difficulty_level)`)
        .eq('user_id', user.id)
        .order('priority', { ascending: true })
        .order('position', { foreignTable: 'topics', ascending: true });

      const transformedSubjects = transformSubjectsData(data || []);
      setSubjects(transformedSubjects);
      saveToCache(transformedSubjects);
    } catch (error) {
      console.error('Erro ao carregar matérias:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadFromCache, saveToCache, user]);

  const refreshData = useCallback(async () => {
    if (!user) return;

    // Limpar cache e recarregar
    localStorage.removeItem(CACHE_KEY);
    setIsLoading(true);

    try {
      const { data } = await supabase
        .from('subjects')
        .select(`*, topics (*, difficulty_level)`)
        .eq('user_id', user.id)
        .order('priority', { ascending: true })
        .order('created_at', { foreignTable: 'topics', ascending: true });

      const transformedSubjects = transformSubjectsData(data || []);
      setSubjects(transformedSubjects);
      saveToCache(transformedSubjects);
    } catch (error) {
      console.error('Erro ao recarregar matérias:', error);
    } finally {
      setIsLoading(false);
    }
  }, [saveToCache, user]);

  useEffect(() => {
    if (user) {
      loadSubjects();
    } else {
      setSubjects([]);
      localStorage.removeItem(CACHE_KEY);
    }
  }, [loadSubjects, user]);

  return {
    subjects,
    isLoading,
    refreshData,
    loadSubjects
  };
};
