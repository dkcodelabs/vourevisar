import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, Trophy, Sparkles } from 'lucide-react';

interface AllStudiesCompletedBannerProps {
  onResetComplete?: () => void;
}

export const AllStudiesCompletedBanner: React.FC<AllStudiesCompletedBannerProps> = ({ 
  onResetComplete 
}) => {
  const { user } = useAuth();
  const [isResetting, setIsResetting] = useState(false);

  const handleResetReviews = async () => {
    if (!user) {
      toast.error("Usuário não autenticado.");
      return;
    }

    if (!window.confirm("Tem certeza que deseja resetar as revisões? As matérias e tópicos serão mantidos, mas todo o progresso será zerado.")) {
      return;
    }

    setIsResetting(true);
    try {
      console.log('🔄 Iniciando reset das revisões para usuário:', user.id);
      
      // 1. Buscar todas as matérias do usuário
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', user.id);
      if (subjectsError) throw subjectsError;
      const subjectIds = (subjectsData || []).map(s => s.id);
      console.log('🔄 Matérias encontradas:', subjectIds.length);
      
      // 2. Resetar TODOS os campos de revisão dos tópicos
      if (subjectIds.length > 0) {
        const { error: topicsError } = await supabase
          .from('topics')
          .update({
            review_stage: null,
            review_count: 0,
            next_review: null,
            last_reviewed_at: null,
            completed: false,
            updated_at: new Date().toISOString()
          })
          .in('subject_id', subjectIds);
        
        if (topicsError) throw topicsError;
        console.log('✅ Tópicos resetados');
      }
      
      // 3. Resetar status das matérias
      const { error: subjectsUpdateError } = await supabase
        .from('subjects')
        .update({ 
          status: 'Nova',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (subjectsUpdateError) throw subjectsUpdateError;
      console.log('✅ Status das matérias resetado');
      
      // 4. Resetar COMPLETAMENTE o ciclo do usuário
      const { error: cycleError } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: [],
          disciplinas_do_dia: [],
          materias_estudadas_ciclo: [],
          ciclos_realizados: 0,
          data_inicio_ciclo: null,
          data_fim_ciclo: null,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (cycleError) throw cycleError;
      console.log('✅ Ciclo resetado completamente');
      
      // 5. Deletar sessões de estudo
      const { error: sessionsError } = await supabase
        .from('study_sessions')
        .delete()
        .eq('user_id', user.id);
      
      if (sessionsError) {
        console.warn('⚠️ Erro ao deletar sessões (não crítico):', sessionsError);
      } else {
        console.log('✅ Sessões de estudo deletadas');
      }
      
      // 6. Limpar estado global do frontend
      console.log('🔄 Limpando estado global...');
      const { updateStudiedSubjects, resetCycle } = await import('@/utils/cycleState');
      updateStudiedSubjects([]);
      resetCycle(0);
      
      // 7. Disparar eventos para atualizar componentes
      console.log('🔄 Disparando eventos de atualização...');
      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: { 
          isReset: true,
          reason: 'reviewsCleared',
          timestamp: Date.now()
        }
      }));
      
      window.dispatchEvent(new CustomEvent('forceComponentRerender', {
        detail: { reason: 'reviewsCleared', timestamp: Date.now() }
      }));
      
      console.log('✅ Reset das revisões concluído com sucesso');
      toast.success("Revisões resetadas com sucesso! Você pode começar um novo ciclo de estudos.");
      
      // Callback para o componente pai
      if (onResetComplete) {
        onResetComplete();
      }
      
      // Recarregar página após delay para garantir sincronização
      setTimeout(() => {
        console.log('🔄 Recarregando página para garantir sincronização...');
        window.location.reload();
      }, 1500);
      
    } catch (err: any) {
      console.error('❌ Erro ao resetar revisões:', err);
      toast.error(`Erro ao resetar revisões: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="mb-6 p-6 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="relative">
            <Trophy className="h-12 w-12 text-emerald-600" />
            <Sparkles className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-2xl font-bold text-emerald-700">
              🎉 Parabéns! Estudos Concluídos!
            </h3>
          </div>
          
          <p className="text-emerald-600 mb-4 text-base leading-relaxed">
            Você completou todas as revisões de todas as suas matérias! 
            Excelente trabalho! Seus estudos estão 100% concluídos.
          </p>
          
          <div className="bg-white/60 rounded-lg p-4 mb-4">
            <p className="text-sm text-emerald-700 mb-3">
              <strong>O que fazer agora?</strong>
            </p>
            <ul className="text-sm text-emerald-600 space-y-1 ml-4">
              <li>• Você pode descansar e comemorar sua conquista!</li>
              <li>• Ou resetar as revisões para começar um novo ciclo de estudos</li>
              <li>• Adicionar novas matérias e tópicos para continuar estudando</li>
            </ul>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={handleResetReviews}
              disabled={isResetting}
              variant="outline"
              className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resetar Revisões
                </>
              )}
            </Button>
            
            <span className="text-xs text-emerald-600">
              Manterá suas matérias e tópicos, mas zerará o progresso
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};