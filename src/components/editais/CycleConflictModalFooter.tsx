import { ArrowRight, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CycleConflictState } from '@/utils/editaisPagePresentation';

type CycleConflictModalFooterProps = {
    cycleConflict: CycleConflictState;
    stats: { subjects: number; topics: number };
    isMerging: boolean;
    isAnalyzingTopics: boolean;
    isCycleFinalizationLocked: boolean;
    isOpeningCycle: boolean;
    processingId: string | null;
    shouldAskProgressMode: boolean;
    onReplacePreview: () => void;
    onHybridPreview: () => void;
    onTopicPreview: () => void;
    onAction: (action: 'merge' | 'replace' | 'hybrid') => void;
    onOpenCycle: () => void;
};

function CycleStats({ stats }: { stats: { subjects: number; topics: number } }) {
    return <div className="flex items-center gap-5 text-[10px] font-black uppercase tracking-widest text-content-muted"><div className="flex items-baseline gap-1.5"><span className="text-base leading-none text-foreground">{stats.subjects}</span><span>matérias</span></div><div className="flex items-baseline gap-1.5"><span className="text-base leading-none text-foreground">{stats.topics}</span><span>tópicos</span></div></div>;
}

export function CycleConflictModalFooter({
    cycleConflict, stats, isMerging, isAnalyzingTopics, isCycleFinalizationLocked, isOpeningCycle, processingId, shouldAskProgressMode,
    onReplacePreview, onHybridPreview, onTopicPreview, onAction, onOpenCycle,
}: CycleConflictModalFooterProps) {
    const locked = isMerging || isCycleFinalizationLocked;
    return <div className={`${cycleConflict.step === 'preview' && cycleConflict.action === 'merge' ? 'hidden' : ''} shrink-0 border-t border-border bg-modal/95 px-6 py-2.5 backdrop-blur-xl md:px-8`}>
        {cycleConflict.step === 'select' ? cycleConflict.existingIds.length === 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><CycleStats stats={stats} /><button onClick={() => onAction('replace')} disabled={locked || (shouldAskProgressMode && !cycleConflict.progressMode)} className="app-button-success group flex h-11 w-full items-center justify-center px-5 text-center transition-colors disabled:cursor-not-allowed sm:w-auto sm:min-w-[210px]">{isMerging && <Loader2 size={16} className="mr-2 animate-spin" />}<div className="flex flex-col items-start text-left"><span className="mb-0.5 text-[11px] font-black uppercase leading-none tracking-wider">{isMerging ? 'CARREGANDO CICLO' : 'CARREGAR NO CICLO'}</span><span className="text-[9px] font-bold leading-none text-success-foreground/85">{isMerging ? 'Abrindo planejamento' : 'Adicionar ao planejamento'}</span></div></button></div>
        ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><CycleStats stats={stats} /><div className="grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto sm:justify-end sm:gap-3"><button onClick={onReplacePreview} className="group flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-destructive/45 bg-modal px-2 text-center text-destructive transition-all hover:border-destructive hover:bg-destructive hover:text-destructive-foreground sm:px-3"><RefreshCw size={14} /><span className="text-[11px] font-black uppercase tracking-wider">SUBSTITUIR</span></button><button onClick={onHybridPreview} disabled={locked} className="group flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-success/45 bg-modal px-2 text-center text-success transition-all hover:border-success hover:bg-success hover:text-success-foreground disabled:opacity-50 sm:px-3"><CheckCircle2 size={14} /><span className="text-[11px] font-black uppercase tracking-wider">MESCLAR</span></button></div></div>
        ) : cycleConflict.step === 'preview' ? (
            <div className="flex flex-col gap-3">{(cycleConflict.action === 'merge' || cycleConflict.action === 'hybrid') && cycleConflict.existingIds.length > 0 && <div className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2.5"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-warning" /><p className="text-[10px] font-medium leading-snug text-warning"><span className="font-black">Agrupamento sem unificação.</span> Matérias com o mesmo nome de editais diferentes permanecerão como entradas separadas no seu ciclo. Para unificar os tópicos, use &quot;Processar Tópicos&quot; ao lado.</p></div>}<div className="flex items-center justify-end gap-3">{(cycleConflict.action === 'merge' || cycleConflict.action === 'hybrid') && <button onClick={onTopicPreview} disabled={locked || isAnalyzingTopics} className="app-button-primary flex h-10 items-center justify-center gap-2.5 px-4 transition-colors disabled:cursor-not-allowed">{isAnalyzingTopics ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}<span className="text-[10px] font-black uppercase tracking-wider">PROCESSAR TÓPICOS</span></button>}<button onClick={() => onAction(cycleConflict.action!)} disabled={locked || (cycleConflict.edital && processingId === cycleConflict.edital.id) || (shouldAskProgressMode && !cycleConflict.progressMode)} className="app-button-success flex h-10 items-center justify-center gap-2.5 px-4 transition-colors disabled:cursor-not-allowed">{isMerging ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}<span className="text-[10px] font-black uppercase tracking-wider">{cycleConflict.action === 'replace' ? 'CONFIRMAR SUBSTITUIÇÃO' : cycleConflict.existingIds.length === 0 ? 'CRIAR CICLO' : 'ADICIONAR SEM UNIFICAR'}</span></button></div></div>
        ) : cycleConflict.step === 'topic-preview' ? <div className="flex items-center justify-end"><button onClick={() => onAction('merge')} disabled={locked || (cycleConflict.edital && processingId === cycleConflict.edital.id)} className="app-button-success flex h-10 items-center justify-center gap-2.5 px-5 transition-colors disabled:cursor-not-allowed">{isMerging ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}<span className="text-[10px] font-black uppercase tracking-wider">SALVAR MESCLAGEM</span></button></div>
        : cycleConflict.step === 'success' ? <div className="flex justify-end"><Button type="button" onClick={onOpenCycle} disabled={isOpeningCycle} className="h-10 px-5 text-[11px] font-black uppercase tracking-widest">{isOpeningCycle ? <><Loader2 size={15} className="animate-spin" />Abrindo ciclo</> : <>{cycleConflict.action === 'replace' ? 'Abrir ciclo' : 'Salvar e abrir ciclo'}<ArrowRight size={14} /></>}</Button></div> : null}
    </div>;
}
