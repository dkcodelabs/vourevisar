import { supabase } from '@/integrations/supabase/client';

const NORMALIZATION_KEY = 'normalize_difficulty_scale_1_easy_3_hard';

export const migrateDifficultyLevels = async () => {
  try {
    console.log('Iniciando normalizacao da escala de dificuldade...');

    const { data: marker, error: markerError } = await supabase
      .from('app_data_migrations' as unknown)
      .select('migration_key')
      .eq('migration_key', NORMALIZATION_KEY)
      .maybeSingle();

    if (markerError) {
      console.error('Tabela app_data_migrations indisponivel. Rode as migrations do Supabase antes.', markerError);
      return {
        success: false,
        error: markerError,
        migratedCount: 0,
        errorCount: 1,
        totalTopics: 0
      };
    }

    if (marker) {
      console.log('Escala de dificuldade ja normalizada.');
      return {
        success: true,
        migratedCount: 0,
        errorCount: 0,
        totalTopics: 0
      };
    }

    return {
      success: false,
      error: new Error('Normalizacao deve ser executada pela migration SQL para evitar troca dupla de 1 e 3.'),
      migratedCount: 0,
      errorCount: 1,
      totalTopics: 0
    };
  } catch (error) {
    console.error('Erro na verificacao da normalizacao:', error);
    return {
      success: false,
      error
    };
  }
};
