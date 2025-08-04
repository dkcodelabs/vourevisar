import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ReviewProfile, REVIEW_PROFILES } from '@/types/study';

interface UserSettingsData {
  review_profile: ReviewProfile;
  subjects_per_day: number;
  notifications_enabled: boolean;
  notification_time: string;
}

interface CycleInfo {
  ciclo_atual: string[];
  disciplinas_do_dia: string[];
  ciclos_realizados: number;
  data_inicio_ciclo: string;
  data_fim_ciclo: string | null;
}

export const useUserSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Buscar configurações do usuário
        const { data: settingsData, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          throw settingsError;
        }

        // Se não existir configurações, criar padrão
        if (!settingsData) {
          const defaultSettings = {
            user_id: user.id,
            review_profile: ReviewProfile.INTERMEDIATE,
            subjects_per_day: 3,
            notifications_enabled: true,
            notification_time: '09:00'
          };

          const { data: newSettings, error: insertError } = await supabase
            .from('user_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (insertError) throw insertError;
          
          setSettings({
            review_profile: newSettings.review_profile as ReviewProfile,
            subjects_per_day: newSettings.subjects_per_day,
            notifications_enabled: newSettings.notifications_enabled,
            notification_time: newSettings.notification_time
          });
        } else {
          setSettings({
            review_profile: settingsData.review_profile as ReviewProfile || ReviewProfile.INTERMEDIATE,
            subjects_per_day: settingsData.subjects_per_day,
            notifications_enabled: settingsData.notifications_enabled,
            notification_time: settingsData.notification_time
          });
        }

        // Buscar informações do ciclo
        const { data: cycleData, error: cycleError } = await supabase
          .from('user_cycles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (cycleError && cycleError.code !== 'PGRST116') {
          console.warn('Erro ao buscar ciclo:', cycleError);
        } else if (cycleData) {
          setCycleInfo({
            ciclo_atual: cycleData.ciclo_atual || [],
            disciplinas_do_dia: cycleData.disciplinas_do_dia || [],
            ciclos_realizados: cycleData.ciclos_realizados || 0,
            data_inicio_ciclo: cycleData.data_inicio_ciclo,
            data_fim_ciclo: cycleData.data_fim_ciclo
          });
        }

      } catch (err) {
        console.error('Erro ao buscar configurações do usuário:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Função para obter informações do perfil de revisão
  const getProfileInfo = () => {
    if (!settings) return null;
    
    const profile = settings.review_profile;
    const profileConfig = REVIEW_PROFILES[profile];
    
    let profileName = '';
    let profileDescription = '';
    
    switch (profile) {
      case ReviewProfile.BEGINNER:
        profileName = 'Iniciante';
        profileDescription = 'Mais revisões para fixar melhor o conteúdo';
        break;
      case ReviewProfile.INTERMEDIATE:
        profileName = 'Intermediário';
        profileDescription = 'Equilíbrio entre revisões e progresso';
        break;
      case ReviewProfile.ADVANCED:
        profileName = 'Avançado';
        profileDescription = 'Menos revisões, mais confiança na memória';
        break;
    }
    
    return {
      profile,
      profileName,
      profileDescription,
      intervals: profileConfig.intervals,
      maxReviews: profileConfig.maxReviews
    };
  };

  // Função para calcular estatísticas do ciclo
  const getCycleStats = () => {
    if (!cycleInfo) return null;
    
    const totalSubjectsInCycle = cycleInfo.ciclo_atual.length;
    const subjectsForToday = cycleInfo.disciplinas_do_dia.length;
    const completedCycles = cycleInfo.ciclos_realizados;
    
    // Calcular dias desde o início do ciclo atual
    let daysInCurrentCycle = 0;
    if (cycleInfo.data_inicio_ciclo) {
      const startDate = new Date(cycleInfo.data_inicio_ciclo);
      const today = new Date();
      daysInCurrentCycle = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return {
      totalSubjectsInCycle,
      subjectsForToday,
      completedCycles,
      daysInCurrentCycle,
      isActiveCycle: !cycleInfo.data_fim_ciclo
    };
  };

  return {
    settings,
    cycleInfo,
    isLoading,
    error,
    getProfileInfo,
    getCycleStats
  };
};