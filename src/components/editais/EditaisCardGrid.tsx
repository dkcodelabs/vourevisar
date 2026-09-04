import { EditalCard } from '@/components/editais/EditalCard';
import type { Subject } from '@/types';
import { calculateEditalMetrics } from '@/utils/editaisMetrics';
import { getDaysUntilExam } from '@/utils/editaisPagePresentation';
import { hasEditalCatalogUpdate } from '@/utils/editaisCardPresentation';
import type { PublicEditalSource, StudySessionSummary, UserEdital } from '@/utils/editaisPagePresentation';

type EditaisCardGridProps = {
    editais: UserEdital[];
    subjects: Subject[];
    studySessions: StudySessionSummary[];
    publicEditais: PublicEditalSource[];
    publicEditaisLoaded: boolean;
    selectedIds: Set<string>;
    deleteConfirm: { isOpen: boolean; edital: UserEdital | null };
    processingId: string | null;
    removalProgress: { editalId: string; message: string; percentage: number } | null;
    highlightedSourceId: string | null;
    onToggleSelect: (id: string) => void;
    onViewSubjects: (edital: UserEdital) => void;
    onLoadCycle: (edital: UserEdital) => void;
    onUnloadCycle: (edital: UserEdital) => void;
    onDelete: (edital: UserEdital) => void;
    onSync: (edital: UserEdital) => void;
    onEdit: (edital: UserEdital) => void;
};

export function EditaisCardGrid({ editais, subjects, studySessions, publicEditais, publicEditaisLoaded, selectedIds, deleteConfirm, processingId, removalProgress, highlightedSourceId, onToggleSelect, onViewSubjects, onLoadCycle, onUnloadCycle, onDelete, onSync, onEdit }: EditaisCardGridProps) {
    return <div className="grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-4">{editais.map(edital => {
        const source = publicEditais.find(item => item.id === edital.sourceId);
        const isDeleteProcessing = deleteConfirm.isOpen && deleteConfirm.edital?.id === edital.id && processingId === edital.id;
        return <div key={edital.id} id={`edital-${edital.id}`} className="h-full w-full"><EditalCard edital={edital} metrics={calculateEditalMetrics(edital, subjects, studySessions)} daysLeft={getDaysUntilExam(edital.examDate)} isSelected={selectedIds.has(edital.id)} onToggleSelect={() => onToggleSelect(edital.id)} onViewSubjects={() => onViewSubjects(edital)} onLoadCycle={() => onLoadCycle(edital)} onUnloadCycle={() => onUnloadCycle(edital)} onDelete={() => onDelete(edital)} onSync={() => onSync(edital)} onEdit={() => onEdit(edital)} isProcessing={processingId === edital.id && !isDeleteProcessing} processingProgress={processingId === edital.id && !isDeleteProcessing ? removalProgress : undefined} hasUpdate={hasEditalCatalogUpdate(edital, source, subjects)} sourceAvailable={!!source} sourceStatusKnown={publicEditaisLoaded} isHighlighted={highlightedSourceId === edital.sourceId || highlightedSourceId === edital.id} /></div>;
    })}</div>;
}
