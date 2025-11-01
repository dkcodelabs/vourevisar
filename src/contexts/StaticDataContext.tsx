import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    if (!user || isLoadingGlobal) return;
    
    // Verificar cache primeiro
    if (globalData[user.id]) {
      setSubjects(globalData[user.id]);
      return;
    }

    isLoadingGlobal = true;
    setIsLoading(true);

    try {
      const { data } = await supabase
        .from('subjects')
        .select(`*, topics (*, difficulty_level)`)
        .eq('user_id', user.id)
        .order('priority', { ascending: true });

      const transformedSubjects = transformSubjectsData(data || []);
      
      // Salvar no cache
      globalData[user.id] = transformedSubjects;
      setSubjects(transformedSubjects);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
      isLoadingGlobal = false;
    }
  };

  const refreshData = async () => {
    if (user) {
      delete globalData[user.id]; // Limpar cache
      await loadData();
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setSubjects([]);
      globalData = {}; // Limpar todo o cache
    }
  }, [user?.id]);

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