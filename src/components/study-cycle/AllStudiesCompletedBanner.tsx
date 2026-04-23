import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { errorService } from '@/lib/errors/errorService';
import { Loader2, RefreshCw, Trophy, Sparkles } from 'lucide-react';
import { useCycleState } from '@/hooks/useCycleState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AllStudiesCompletedBannerProps {
  onResetComplete?: () => void;
}

export const AllStudiesCompletedBanner: React.FC<AllStudiesCompletedBannerProps> = ({ 
  onResetComplete 
}) => {
  const { user } = useAuth();
  const { resetCycle } = useCycleState();
  const [isResetting, setIsResetting] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nextCycleName, setNextCycleName] = useState('');

  const handleResetReviews = async () => {
    if (!user) {
      errorService.report(new Error("Usuário não autenticado"), { 
        module: 'StudyCycle', 
        action: 'resetReviews', 
        userMessage: 'Usuário não autenticado.' 
      });
      return;
    }

    setShowNameDialog(true);
  };

  const confirmReset = async () => {
    if (!nextCycleName.trim()) {
      errorService.report(new Error("Nome do ciclo vazio"), { 
        module: 'StudyCycle', 
        action: 'confirmReset', 
        userMessage: 'Por favor, informe um nome para o novo ciclo.' 
      });
      return;
    }

    setIsResetting(true);
    setShowNameDialog(false);
    
    try {
      console.log('🔄 Iniciando arquivamento e reset das revisões para usuário:', user?.id);
      
      // 1. Arquivar e Criar Novo Ciclo
      await resetCycle(nextCycleName);
      console.log('✅ Ciclo arquivado e novo criado');

      // 2. Buscar todas as matérias do usuário para resetar status
      const { data: subjectsData, error: subjectsError } = await (supabase as any)
        .from('subjects')
        .select('id')
        .eq('user_id', user?.id || '');
      
      if (subjectsError) throw subjectsError;
      const subjectIds = (subjectsData || []).map((s: any) => s.id);
      
      if (subjectIds.length > 0) {
        const { error: topicsError } = await (supabase as any)
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
        
        const { error: subjectsUpdateError } = await (supabase as any)
          .from('subjects')
          .update({ 
            status: 'Nova',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id || '');
        
        if (subjectsUpdateError) throw subjectsUpdateError;
      }
      
      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: { 
          isReset: true,
          isNewCycle: true,
          reason: 'reviewsCleared',
          timestamp: Date.now()
        }
      }));

      window.dispatchEvent(new CustomEvent('dailyProgressUpdated', {
        detail: { 
          isReset: true,
          reason: 'reviewsCleared',
          timestamp: Date.now()
        }
      }));
      
      window.dispatchEvent(new CustomEvent('forceComponentRerender', {
        detail: { reason: 'reviewsCleared', timestamp: Date.now() }
      }));
      
      toast.success("Novo ciclo iniciado com sucesso! O histórico do ciclo anterior foi preservado.");
      
      if (onResetComplete) {
        onResetComplete();
      }
      
    } catch (err: any) {
      console.error('❌ Erro ao iniciar novo ciclo:', err);
      errorService.report(err, { 
        module: 'StudyCycle', 
        action: 'confirmReset', 
        userMessage: 'Erro ao iniciar novo ciclo.' 
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
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
                🎉 Parabéns! Edital 100% Dominado!
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
                <li>• Ou resetar as revisões para começar um novo ciclo de estudos (preservando o histórico)</li>
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
                    Iniciando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Próximo Ciclo (Reset)
                  </>
                )}
              </Button>
              
              <span className="text-xs text-emerald-600">
                Inicia um novo ciclo e arquiva os dados atuais
              </span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Iniciar Novo Ciclo</DialogTitle>
            <DialogDescription>
              Dê um nome para o seu novo ciclo de estudos. O ciclo atual será arquivado com todo o seu progresso preservado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                value={nextCycleName}
                onChange={(e) => setNextCycleName(e.target.value)}
                placeholder="Ex: PMES - Soldado"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNameDialog(false)}>Cancelar</Button>
            <Button onClick={confirmReset} disabled={isResetting}>
              Começar Novo Ciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};