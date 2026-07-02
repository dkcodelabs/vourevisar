import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Subject } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { transformSubjectsData } from './utils/dataTransformers';

interface StaticDataContextType {
  subjects: Subject[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const StaticDataContext = createContext<StaticDataContextType | undefined>(undefined);

// Cache global simples
let globalData: { [userId: string]: Subject[] } = {};
let isLoadingGlobal = false;

export const StaticDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId || isLoadingGlobal) return;

    // Verificar cache primeiro
    if (globalData[userId]) {
      setSubjects(globalData[userId]);
      return;
    }

    isLoadingGlobal = true;
    setIsLoading(true);

    try {
      const { data } = await supabase
        .from('subjects')
        .select(`*, topics (*, difficulty_level)`)
        .eq('user_id', userId)
        .order('priority', { ascending: true })
        .order('created_at', { foreignTable: 'topics', ascending: true });

      const transformedSubjects = transformSubjectsData(data || []);

      // Salvar no cache
      globalData[userId] = transformedSubjects;
      setSubjects(transformedSubjects);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
      isLoadingGlobal = false;
    }
  }, [userId]);

  const refreshData = useCallback(async () => {
    if (userId) {
      delete globalData[userId]; // Limpar cache
      await loadData();
    }
  }, [loadData, userId]);

  useEffect(() => {
    if (userId) {
      loadData();
    } else {
      setSubjects([]);
      globalData = {}; // Limpar todo o cache
    }
  }, [loadData, userId]);

  const value = {
    subjects,
    isLoading,
    refreshData,
  };

  return (
    <StaticDataContext.Provider value={value}>
      {children}
    </StaticDataContext.Provider>
  );
};

export const useStaticData = () => {
  const context = useContext(StaticDataContext);
  if (!context) {
    throw new Error('useStaticData deve ser usado dentro de StaticDataProvider');
  }
  return context;
};
