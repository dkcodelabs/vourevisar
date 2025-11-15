import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ResetStats {
  totalTopics: number;
  topicsWithReviews: number;
  topicsWithNotes: number;
  subjectsInProgress: number;
  cycleNumber: number;
  lastActivity: string | null;
}

interface ResetCycleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  userId: string;
}

export function ResetCycleConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  userId,
}: ResetCycleConfirmDialogProps) {
  const [stats, setStats] = useState<ResetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchResetStats();
    } else {
      // Reset form when dialog closes
      setConfirmText('');
      setUnderstood(false);
    }
  }, [open, userId]);

  const fetchResetStats = async () => {
    setLoading(true);
    try {
      // Fetch subjects
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, status, updated_at')
        .eq('user_id', userId);

      if (subjectsError) throw subjectsError;

      const subjectIds = subjects?.map(s => s.id) || [];
      const subjectsInProgress = subjects?.filter(
        s => s.status !== 'Nova' && s.status !== 'Concluída'
      ).length || 0;

      // Fetch topics
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('id, review_count, notes, updated_at')
        .in('subject_id', subjectIds);

      if (topicsError) throw topicsError;

      const topicsWithReviews = topics?.filter(t => (t.review_count || 0) > 0).length || 0;
      const topicsWithNotes = topics?.filter(
        t => t.notes && Object.keys(t.notes).length > 0
      ).length || 0;

      // Fetch cycle info
      const { data: cycle } = await supabase
        .from('user_cycles')
        .select('ciclos_realizados, atualizado_em')
        .eq('user_id', userId)
        .maybeSingle();

      // Get most recent activity
      const allDates = [
        ...(subjects?.map(s => s.updated_at) || []),
        ...(topics?.map(t => t.updated_at) || []),
      ].filter(Boolean);

      const lastActivity = allDates.length > 0
        ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))).toLocaleDateString('pt-BR')
        : null;

      setStats({
        totalTopics: topics?.length || 0,
        topicsWithReviews,
        topicsWithNotes,
        subjectsInProgress,
        cycleNumber: cycle?.ciclos_realizados || 0,
        lastActivity,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (confirmText !== 'RESETAR' || !understood) {
      return;
    }

    setIsResetting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao resetar:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const canConfirm = confirmText === 'RESETAR' && understood && !isResetting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Reset Completo do Sistema
          </DialogTitle>
          <DialogDescription>
            Esta ação irá resetar completamente seu ciclo de estudos e todas as revisões.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  <strong>ATENÇÃO: Esta ação é IRREVERSÍVEL!</strong>
                  <br />
                  Não há como desfazer após a confirmação.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                <h4 className="font-semibold mb-3 text-foreground">
                  O que será perdido:
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-destructive">•</span>
                    <span>
                      <strong>{stats?.topicsWithReviews}</strong> tópicos com revisões ativas
                      (de {stats?.totalTopics} tópicos totais)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-destructive">•</span>
                    <span>
                      <strong>{stats?.topicsWithNotes}</strong> tópicos com anotações
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-destructive">•</span>
                    <span>
                      <strong>{stats?.subjectsInProgress}</strong> matérias em progresso
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-destructive">•</span>
                    <span>
                      Histórico de <strong>{stats?.cycleNumber}</strong> ciclos realizados
                    </span>
                  </li>
                  {stats?.lastActivity && (
                    <li className="flex items-center gap-2">
                      <span className="text-destructive">•</span>
                      <span>
                        Última atividade em: <strong>{stats.lastActivity}</strong>
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="understood"
                    checked={understood}
                    onChange={(e) => setUnderstood(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-destructive focus:ring-destructive cursor-pointer"
                  />
                  <Label
                    htmlFor="understood"
                    className="text-sm font-normal leading-tight cursor-pointer flex-1"
                  >
                    Eu entendo que esta ação é <strong>irreversível</strong> e que todos os
                    meus dados de revisão, anotações e progresso serão permanentemente
                    perdidos.
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-text" className="text-sm font-medium">
                    Digite <strong className="text-destructive">RESETAR</strong> para confirmar:
                  </Label>
                  <Input
                    id="confirm-text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="RESETAR"
                    className="font-mono uppercase"
                    autoComplete="off"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResetting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetando...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Resetar Tudo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
