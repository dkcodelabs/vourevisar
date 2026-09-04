import { EditalSubjectsModal } from '@/components/editais/EditalSubjectsModal';
import { ImportEditalModal } from '@/components/subjects/ImportEditalModal';
import type { Subject } from '@/types';
import type { UserEdital } from '@/utils/editaisPagePresentation';
import type { ComponentProps } from 'react';

type ImportHandler = ComponentProps<typeof ImportEditalModal>['onImport'];

type EditaisSecondaryModalsProps = {
    isImportModalOpen: boolean;
    importModalTab: 'ready' | 'ia' | 'manual';
    subjectsModal: { isOpen: boolean; edital: UserEdital | null; initialExpandedSubjectId?: string; returnTo?: string };
    subjects: Subject[];
    editais: UserEdital[];
    onCloseImport: () => void;
    onImport: ImportHandler;
    onCloseSubjects: () => void;
    onBack: (() => void) | undefined;
    onUpdate: (edital: UserEdital) => void;
};

export function EditaisSecondaryModals({ isImportModalOpen, importModalTab, subjectsModal, subjects, editais, onCloseImport, onImport, onCloseSubjects, onBack, onUpdate }: EditaisSecondaryModalsProps) {
    return <>
        {editais.length > 0 && <ImportEditalModal isOpen={isImportModalOpen} onClose={onCloseImport} initialTab={importModalTab} subjects={subjects} userEditais={editais} onImport={onImport} />}
        {subjectsModal.edital && <EditalSubjectsModal isOpen={subjectsModal.isOpen} onClose={onCloseSubjects} onBack={onBack} edital={subjectsModal.edital} editais={editais.filter(edital => !edital.mergedIntoCycle)} allSubjects={subjects} onUpdate={onUpdate} initialExpandedSubjectId={subjectsModal.initialExpandedSubjectId} />}
    </>;
}
