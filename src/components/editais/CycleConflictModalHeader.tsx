import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { CycleConflictState } from '@/utils/editaisPagePresentation';

type CycleConflictModalHeaderProps = {
    cycleConflict: CycleConflictState;
    isMerging: boolean;
    isAnalyzingTopics: boolean;
    isCycleFinalizationLocked: boolean;
    onBack: () => void;
    onNext: () => void;
    onClose: () => void;
};

export function CycleConflictModalHeader({
    cycleConflict,
    isMerging,
    isAnalyzingTopics,
    isCycleFinalizationLocked,
    onBack,
    onNext,
    onClose,
}: CycleConflictModalHeaderProps) {
    const title = cycleConflict.step === 'success'
        ? 'Ciclo Pronto'
        : cycleConflict.step === 'select'
            ? 'Carregar Edital'
            : cycleConflict.step === 'preview'
                ? (cycleConflict.existingIds.length === 0 ? 'Carregar Edital' : 'Escolher Organização')
                : cycleConflict.step === 'topic-preview'
                    ? 'Preview Mescla Matérias e Tópicos'
                    : 'Ciclo de Estudos';

    const description = cycleConflict.step === 'select'
        ? (cycleConflict.existingIds.length === 0
            ? 'Revise o edital selecionado antes de gerar o ciclo.'
            : 'Escolha como deseja adicionar o novo edital ao seu planejamento.')
        : cycleConflict.step === 'preview'
            ? 'Compare como o mesmo ciclo ficará antes de escolher.'
            : cycleConflict.step === 'topic-preview'
                ? 'Confira a organização de matérias e tópicos.'
                : cycleConflict.action === 'replace'
                    ? 'Seu ciclo foi gerado e está pronto para abrir.'
                    : 'Escolha a data e confirme o nome exibido no planejamento.';

    return (
        <div className="sticky top-0 z-[60] flex shrink-0 items-start justify-between border-b border-border bg-modal px-6 pb-4 pt-4 md:px-8">
            <div className="flex flex-col gap-1.5 focus:outline-none">
                <div className="flex items-center gap-3">
                    {cycleConflict.existingIds.length > 0 && cycleConflict.step !== 'success' && (
                        <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 mr-1 shadow-sm">
                            <button onClick={onBack} disabled={cycleConflict.step === 'select' || isMerging || isAnalyzingTopics || isCycleFinalizationLocked} className="p-1.5 hover:bg-white/10 disabled:opacity-20 rounded-md transition-all text-content-muted hover:text-foreground active:scale-95" title="Voltar">
                                <ChevronLeft size={14} strokeWidth={3} />
                            </button>
                            <div className="w-px h-3 bg-white/10 mx-0.5" />
                            <button onClick={onNext} disabled={cycleConflict.step !== 'select' || isMerging || isAnalyzingTopics || isCycleFinalizationLocked} className="p-1.5 hover:bg-white/10 disabled:opacity-20 rounded-md transition-all text-content-muted hover:text-foreground active:scale-95" title="Próximo">
                                <ChevronRight size={14} strokeWidth={3} />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                            {cycleConflict.step === 'select'
                                ? (cycleConflict.existingIds.length === 0 ? '1/2' : '1/3')
                                : cycleConflict.step === 'success'
                                    ? (cycleConflict.existingIds.length === 0 && cycleConflict.action === 'replace' ? '2/2' : '3/3')
                                    : '2/3'}
                        </div>
                        <h2 className="text-[14px] font-black text-foreground uppercase tracking-tight">{title}</h2>
                    </div>
                </div>
                <p className="text-[11px] font-medium text-content-muted leading-relaxed whitespace-normal md:whitespace-nowrap">{description}</p>
            </div>
            <button onClick={onClose} disabled={(cycleConflict.step === 'success' && cycleConflict.action !== 'replace') || ((isMerging || isAnalyzingTopics || isCycleFinalizationLocked) && cycleConflict.step !== 'success')} title={cycleConflict.step === 'success' && cycleConflict.action !== 'replace' ? 'Finalize o ciclo antes de fechar' : 'Fechar'} className="p-2 hover:bg-secondary dark:hover:bg-white/5 rounded-xl transition-colors text-content-muted flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-40">
                <X size={20} />
            </button>
        </div>
    );
}
