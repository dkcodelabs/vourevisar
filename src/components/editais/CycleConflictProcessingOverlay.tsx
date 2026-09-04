import { Loader2, Merge } from 'lucide-react';

type CycleConflictProcessingOverlayProps = {
    mergePhase: 'exact' | 'ai' | 'finalizing';
    message?: string;
    percentage?: number;
};

export function CycleConflictProcessingOverlay({ mergePhase, message, percentage }: CycleConflictProcessingOverlayProps) {
    return (
        <div className="absolute inset-0 z-[70] flex items-center justify-center rounded-[28px] bg-background/90 p-6 backdrop-blur-md animate-in fade-in duration-300">
            <div className="flex max-w-[280px] flex-col items-center gap-6 text-center">
                <div className="relative"><div className="absolute -inset-4 rounded-full bg-success/20 blur-2xl animate-pulse" /><div className="relative rounded-full border border-success/20 bg-success/10 p-5"><Loader2 size={32} className="animate-spin text-success" /></div><Merge size={16} className="absolute -bottom-1 -right-1 rounded-full border border-success/20 bg-background p-0.5 text-success" /></div>
                <div className="space-y-3"><h3 className="text-base font-black uppercase leading-tight tracking-tight text-foreground">{mergePhase === 'exact' ? 'Análise semântica' : mergePhase === 'finalizing' ? 'Finalizando ciclo' : 'Processamento inteligente'}</h3><div className="flex flex-col gap-2"><p className="px-4 text-xs font-medium text-content-muted">{message || 'Analisando a compatibilidade...'}</p><span className="mx-auto mt-1 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-success animate-pulse">{mergePhase === 'exact' ? 'Comparando matérias' : mergePhase === 'finalizing' ? 'Salvando informações' : 'Cruzando tópicos'}</span></div></div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full border border-border/50 bg-secondary"><div className="h-full rounded-full bg-success transition-all duration-300 ease-out" style={{ width: `${percentage ?? (mergePhase === 'exact' ? 10 : 50)}%` }} /></div>
            </div>
        </div>
    );
}
