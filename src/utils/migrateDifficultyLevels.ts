import { supabase } from '@/integrations/supabase/client';

export const migrateDifficultyLevels = async () => {
  try {
    console.log('🔄 Iniciando migração de difficulty_level...');
    
    // Buscar todos os tópicos com difficulty_level não nulo
    const { data: topics, error: fetchError } = await supabase
      .from('topics')
      .select('id, difficulty_level')
      .not('difficulty_level', 'is', null);
    
    if (fetchError) {
      console.error('Erro ao buscar tópicos:', fetchError);
      return;
    }
    
    if (!topics || topics.length === 0) {
      console.log('✅ Nenhum tópico com difficulty_level encontrado');
      return;
    }
    
    console.log(`📊 Encontrados ${topics.length} tópicos com difficulty_level`);
    
    // Migrar cada tópico
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const topic of topics) {
      try {
        let newDifficulty: number;
        
        // Verificar se já é um número
        if (typeof topic.difficulty_level === 'number') {
          console.log(`✅ Tópico ${topic.id} já tem difficulty_level numérico: ${topic.difficulty_level}`);
          continue;
        }
        
        // Converter string para número
        switch (topic.difficulty_level) {
          case 'easy':
            newDifficulty = 2;
            break;
          case 'medium':
            newDifficulty = 3;
            break;
          case 'hard':
            newDifficulty = 4;
            break;
          default:
            console.warn(`⚠️ Valor desconhecido para difficulty_level: ${topic.difficulty_level}`);
            newDifficulty = 3; // Padrão médio
        }
        
        // Atualizar no banco
        const { error: updateError } = await supabase
          .from('topics')
          .update({ difficulty_level: newDifficulty })
          .eq('id', topic.id);
        
        if (updateError) {
          console.error(`❌ Erro ao atualizar tópico ${topic.id}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Tópico ${topic.id}: ${topic.difficulty_level} → ${newDifficulty}`);
          migratedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Erro ao processar tópico ${topic.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`🎉 Migração concluída: ${migratedCount} migrados, ${errorCount} erros`);
    
    return {
      success: true,
      migratedCount,
      errorCount,
      totalTopics: topics.length
    };
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return {
      success: false,
      error: error
    };
  }
};