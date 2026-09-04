import { motion } from 'framer-motion';
import { AlertTriangle, FileText, Loader2, Trash2 } from 'lucide-react';
import type { CycleConflictState } from '@/utils/editaisPagePresentation';
import { formatRecoveredMergeTimestamp } from '@/utils/recoveredMergeTimestamp';

type CycleConflictFeedbackNoticesProps = {
    cycleConflict: CycleConflictState;
    isRecoveringMerge: boolean;
    processingId: string | null;
    onDiscardRecoveredMerge: () => void;
};

export function CycleConflictFeedbackNotices({
    cycleConflict,
    isRecoveringMerge,
    processingId,
    onDiscardRecoveredMerge,
}: CycleConflictFeedbackNoticesProps) {
    return (
        <>
            {isRecoveringMerge && cycleConflict.step !== 'success' && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-shrink-0 items-center justify-between gap-4 rounded-2xl border border-warning/20 bg-warning/10 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-warning/15"><FileText size={18} className="text-warning" /></div>
                        <div>
                            <p className="text-xs font-black text-warning">Mesclagem recuperada</p>
                            <p className="text-[10px] font-medium text-warning/80">Restauramos sua última análise · {formatRecoveredMergeTimestamp(cycleConflict.updatedAt)}</p>
                        </div>
                    </div>
                    <button onClick={onDiscardRecoveredMerge} disabled={processingId === cycleConflict.edital?.id} className="app-button-warning flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold transition-colors">
                        {processingId === cycleConflict.edital?.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Descartar
                    </button>
                </motion.div>
            )}
            {cycleConflict.step !== 'success' && cycleConflict.topicMergeResult?.overallAiStatus === 'error' && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-shrink-0 items-start gap-3 rounded-2xl border border-warning/25 bg-warning/10 p-4 text-warning">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest">IA de tópicos indisponível</p>
                        <p className="text-[11px] font-medium leading-relaxed text-warning/85">{cycleConflict.topicMergeResult.aiWarning || 'A análise semântica não foi concluída. Mantivemos somente unificações seguras por nomes idênticos.'}</p>
                    </div>
                </motion.div>
            )}
            {cycleConflict.step !== 'success' && cycleConflict.hybridResult?.stats.aiStatus === 'error' && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-shrink-0 items-start gap-3 rounded-2xl border border-warning/25 bg-warning/10 p-4 text-warning">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest">IA de matérias indisponível</p>
                        <p className="text-[11px] font-medium leading-relaxed text-warning/85">{cycleConflict.hybridResult.stats.aiWarning || 'A análise semântica de matérias não foi concluída. Mantivemos somente unificações seguras por nomes idênticos.'}</p>
                    </div>
                </motion.div>
            )}
        </>
    );
}
