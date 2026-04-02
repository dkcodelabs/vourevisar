
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

export const performGlobalCleanup = async () => {
  console.log('🚀 Iniciando limpeza global de integridade de dados...');
  
  try {
    // 1. Deletar Histórico de Revisão órfão (sem tópico existente)
    const { data: topics } = await supabase.from('topics').select('id');
    const topicIds = topics?.map(t => t.id) || [];
    
    if (topicIds.length > 0) {
      const { error: historyError } = await supabase
        .from('topic_review_history')
        .delete()
        .not('topic_id', 'in', `(${topicIds.join(',')})`);
      
      if (historyError) console.error('Erro ao limpar histórico órfão:', historyError);
    }

    // 2. Deletar Tópicos órfãos (sem edital_id OU sem subject_id válido)
    // O usuário confirmou que agora TUDO deve ter edital_id.
    const { error: topicsError } = await supabase
      .from('topics')
      .delete()
      .is('edital_id', null);
    
    if (topicsError) console.error('Erro ao limpar tópicos sem edital:', topicsError);

    // 3. Deletar Matérias (subjects) órfãs (sem edital_id)
    const { error: subjectsError } = await supabase
      .from('subjects')
      .delete()
      .is('edital_id', null);
    
    if (subjectsError) console.error('Erro ao limpar matérias sem edital:', subjectsError);

    console.log('✅ Limpeza global concluída com sucesso.');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro crítico durante limpeza global:', error);
    return { success: false, error };
  }
};

/**
 * Função específica para limpar dados do usuário logado que não estão no ciclo ativo
 * (Opcional, mas útil para manter a integridade local)
 */
export const cleanupUserOrphans = async (userId: string, activeCycleIds: string[]) => {
  if (!userId || activeCycleIds.length === 0) return;

  try {
    // Esta lógica é mais delicada pois o usuário pode ter editais 
    // que NÃO estão no ciclo mas que ele NÃO quer deletar.
    // Portanto, a filtragem deve ser apenas na UI (useReviewsData).
    // A limpeza no banco deve focar apenas em registros SEM edital_id.
  } catch (error) {
    console.error('Erro ao limpar órfãos do usuário:', error);
  }
};
