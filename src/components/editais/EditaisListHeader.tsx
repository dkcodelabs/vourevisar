import { AlertTriangle, Database, X } from 'lucide-react';
import { EditaisHeaderActions } from '@/components/editais/EditaisHeaderActions';

type EditaisListHeaderProps = {
    editaisCount: number;
    hasCycleEditais: boolean;
    selectedCount: number;
    filterCycle: boolean;
    isMerging: boolean;
    onMerge: () => void;
    onOpenImport: (tab: 'ready' | 'ia' | 'manual') => void;
    onClearFilter: () => void;
};

export function EditaisListHeader({ editaisCount, hasCycleEditais, selectedCount, filterCycle, isMerging, onMerge, onOpenImport, onClearFilter }: EditaisListHeaderProps) {
    return <>{editaisCount > 0 && <div className="flex flex-col gap-4"><EditaisHeaderActions isMerging={isMerging} selectedCount={selectedCount} onMerge={onMerge} onOpenImport={onOpenImport} />{selectedCount > 0 && <div className="px-1 text-[9px] font-bold uppercase tracking-[0.15em] text-primary">{selectedCount} selecionados</div>}{filterCycle && <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"><Database size={14} className="shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="text-xs font-bold text-foreground">Mostrando editais do ciclo</p><p className="mt-0.5 text-[10px] text-content-muted">Clique em &quot;Ver Matérias&quot; para adicionar matérias e tópicos</p></div><button onClick={onClearFilter} className="shrink-0 rounded-md p-1.5 hover:bg-primary/10"><X size={14} className="text-content-muted" /></button></div>}</div>}{editaisCount > 0 && !hasCycleEditais && <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/10 p-3 text-warning animate-pulse-subtle"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15"><AlertTriangle size={16} /></div><div className="flex-1"><p className="text-xs font-bold leading-tight">Você tem editais cadastrados, mas nenhum está carregado no seu ciclo ativo de estudos.</p><p className="text-[10px] font-medium opacity-80">Clique em <span className="font-bold">&quot;Carregar Ciclo&quot;</span> em um edital abaixo para começar seu planejamento inteligente!</p></div></div>}</>;
}
