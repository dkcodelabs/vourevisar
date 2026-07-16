import type { ReactNode } from 'react';
import {
  AlertCircle,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Edit3,
  GraduationCap,
  Link2Off,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import { EditalSubjectsModal } from '@/components/editais/EditalSubjectsModal';
import { DifficultyRatingModal } from '@/components/modals/DifficultyRatingModal';
import NotesModal from '@/components/reviews/NotesModal';
import { CycleExamDateDialog } from '@/components/study-cycle/CycleExamDateDialog';
import { ImportEditalModal } from '@/components/subjects/ImportEditalModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toastGate } from '@/lib/errors/toastGate';
import type { PermanentSubjectDeletionConfirmation } from '@/hooks/usePermanentSubjectDeletion';
import type { CycleEditalUnloadConfirmation } from '@/hooks/useCycleEditalUnload';
import type { SubjectOriginChoice, SubjectOriginChooserState } from '@/hooks/useSubjectsEditalModalState';
import type { Subject } from '@/types';
import type { UserEdital as EditalModalData } from '@/pages/Editais';

type ImportSubjectsHandler = (
  subjects: Subject[],
  editalName?: string,
  isImported?: boolean,
  sourceId?: string,
  extraInfo?: {
    organ: string;
    position: string;
    year: string;
    category?: string;
    exam_date?: string;
    exam_board?: string;
    source_updated_at?: string;
  },
) => void | Promise<void>;

type SelectedTopicForNotes = {
  id: string;
  name: string;
  subjectName: string;
} | null;

type SubjectsModalState = {
  isOpen: boolean;
  edital: EditalModalData | null;
  initialExpandedSubjectId?: string;
};

type DifficultyModalData = {
  isOpen: boolean;
  topicId: string;
  topicName: string;
  subjectName: string;
  currentDifficulty: number | null;
  reviewStage: string | null;
  reviewCount: number;
  isCompleting: boolean;
  duration?: number | null;
  strategicIncidenceLabel?: string | null;
  strategicIncidenceDescription?: string | null;
};

type MergeOriginal = {
  subjectName: string;
  editalName: string;
  editalOrgan: string;
};

type SubjectsModalLayerProps = {
  closeDifficultyModal: () => void;
  cycleExamDateDraft: string;
  cycleExamDateEditorOpen: boolean;
  cycleExamDateError: string | null;
  deletePermanentConfirm: PermanentSubjectDeletionConfirmation;
  difficultyModalData: DifficultyModalData;
  editaisNoCiclo: EditalModalData[];
  executeMarcarMateriaComoEstudada: (subjectId: string) => Promise<unknown>;
  handleDeletePermanent: (subjectId: string, editalIdToRemove?: string) => Promise<unknown> | unknown;
  handleDifficultyConfirmReview: (difficulty: number | null, duration?: number) => Promise<void>;
  handleDifficultyDiscard: () => void;
  handleDifficultyResume: () => void;
  handleDifficultySubmit: (difficulty: number | null) => Promise<void>;
  handleResetCycle: () => void;
  isImportEditalModalOpen: boolean;
  isResettingCycle: boolean;
  isRevertModalOpen: boolean;
  isReverting: boolean;
  isSavingCycleExamDate: boolean;
  isSavingTopicReview: boolean;
  mainSubjectUI: ReactNode;
  modalInitialTab: 'ready' | 'ia' | 'manual';
  onCloseImportEditalModal: () => void;
  onCloseNotesModal: () => void;
  onCloseRevertModal: () => void;
  onCloseSubjectOriginChooser: () => void;
  onCloseSubjectsModal: () => void;
  onCycleExamDateOpenChange: (open: boolean) => void;
  onDeletePermanentConfirmOpenChange: (open: boolean) => void;
  onImportSubjects: ImportSubjectsHandler;
  onResetCycleConfirmOpenChange: (open: boolean) => void;
  onRevertMergeConfirm: () => Promise<void>;
  onSaveCycleExamDate: () => void;
  onSaveSubjectOriginName: () => Promise<void>;
  onSetCycleExamDateDraft: (value: string) => void;
  onSetUnloadConfirmOpen: (open: boolean) => void;
  onSelectSubjectOrigin: (choice: SubjectOriginChoice) => void | Promise<void>;
  onSubjectOriginNameDraftChange: (value: string) => void;
  onSubjectsModalUpdate: () => void;
  onUnloadConfirm: () => Promise<void>;
  completeCycleConfirmOpen: boolean;
  pendingCompleteSubjectId: string | null;
  resetCycleConfirmOpen: boolean;
  selectedMergeName: string;
  selectedMergeOriginals: MergeOriginal[];
  selectedTopicForNotes: SelectedTopicForNotes;
  setCompleteCycleConfirmOpen: (open: boolean) => void;
  subjectOriginChooser: SubjectOriginChooserState;
  subjects: Subject[];
  subjectsModal: SubjectsModalState;
  unloadConfirm: CycleEditalUnloadConfirmation;
  unloadingEditalId: string | null;
};

export function SubjectsModalLayer({
  closeDifficultyModal,
  cycleExamDateDraft,
  cycleExamDateEditorOpen,
  cycleExamDateError,
  deletePermanentConfirm,
  difficultyModalData,
  editaisNoCiclo,
  executeMarcarMateriaComoEstudada,
  handleDeletePermanent,
  handleDifficultyConfirmReview,
  handleDifficultyDiscard,
  handleDifficultyResume,
  handleDifficultySubmit,
  handleResetCycle,
  isImportEditalModalOpen,
  isResettingCycle,
  isRevertModalOpen,
  isReverting,
  isSavingCycleExamDate,
  isSavingTopicReview,
  mainSubjectUI,
  modalInitialTab,
  onCloseImportEditalModal,
  onCloseNotesModal,
  onCloseRevertModal,
  onCloseSubjectOriginChooser,
  onCloseSubjectsModal,
  onCycleExamDateOpenChange,
  onDeletePermanentConfirmOpenChange,
  onImportSubjects,
  onResetCycleConfirmOpenChange,
  onRevertMergeConfirm,
  onSaveCycleExamDate,
  onSaveSubjectOriginName,
  onSetCycleExamDateDraft,
  onSetUnloadConfirmOpen,
  onSelectSubjectOrigin,
  onSubjectOriginNameDraftChange,
  onSubjectsModalUpdate,
  onUnloadConfirm,
  completeCycleConfirmOpen,
  pendingCompleteSubjectId,
  resetCycleConfirmOpen,
  selectedMergeName,
  selectedMergeOriginals,
  selectedTopicForNotes,
  setCompleteCycleConfirmOpen,
  subjectOriginChooser,
  subjects,
  subjectsModal,
  unloadConfirm,
  unloadingEditalId,
}: SubjectsModalLayerProps) {
  return (
    <div className="relative z-50">
      {selectedTopicForNotes && (
        <NotesModal
          isOpen={true}
          onClose={onCloseNotesModal}
          topicId={selectedTopicForNotes.id}
          topicName={selectedTopicForNotes.name}
          subjectName={selectedTopicForNotes.subjectName}
        />
      )}

      <AlertDialog
        open={subjectOriginChooser.isOpen}
        onOpenChange={(open) => {
          if (!open) onCloseSubjectOriginChooser();
        }}
      >
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <Edit3 className="h-5 w-5 text-primary" />
              Editar matéria unificada
            </AlertDialogTitle>
            <AlertDialogDescription className="text-content-muted">
              Ajuste o nome usado no ciclo ou escolha em qual edital quer editar o conteúdo original.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-3">
            <label htmlFor="cycle-subject-display-name" className="block text-[9px] font-black uppercase tracking-[0.14em] text-primary">
              Nome exibido no ciclo
            </label>
            <input
              id="cycle-subject-display-name"
              value={subjectOriginChooser.draftSubjectName}
              onChange={event => onSubjectOriginNameDraftChange(event.target.value)}
              disabled={subjectOriginChooser.isSavingName}
              className="mt-2 h-10 w-full rounded-xl border border-border bg-background/80 px-3 text-sm font-black uppercase text-foreground outline-none transition-colors placeholder:text-content-muted/70 focus:border-primary/45 disabled:cursor-not-allowed disabled:opacity-70"
              placeholder="Nome da matéria no ciclo"
            />
            <p className="mt-2 text-[11px] font-medium leading-snug text-content-muted">
              Este nome organiza a matéria no ciclo. Os nomes originais nos editais continuam preservados.
            </p>
            {subjectOriginChooser.error && (
              <p className="mt-2 rounded-lg border border-destructive/20 bg-destructive/10 px-2 py-1.5 text-[11px] font-semibold text-destructive">
                {subjectOriginChooser.error}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-content-muted">
                Editar conteúdo original
              </h3>
              <p className="mt-1 text-[11px] font-medium leading-snug text-content-muted">
                Escolha o edital onde deseja alterar tópicos, pesos ou excluir conteúdo.
              </p>
            </div>
            {subjectOriginChooser.choices.map(choice => (
              <button
                key={`${choice.edital.id}:${choice.subjectId}`}
                type="button"
                onClick={() => void onSelectSubjectOrigin(choice)}
                disabled={subjectOriginChooser.isSavingName}
                className="group grid w-full grid-cols-[2.25rem_minmax(0,1fr)] gap-3 rounded-2xl border border-border bg-secondary/30 p-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <BookOpen size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <span className="min-w-0">
                      <span className="block text-xs font-black uppercase tracking-wide text-foreground">
                        {choice.edital.year ? `${choice.edital.year} - ` : ''}{choice.edital.organ || choice.edital.name}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">
                        {choice.edital.position && (
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <BriefcaseBusiness size={11} className="shrink-0 text-primary/70" />
                            <span className="truncate">{choice.edital.position}</span>
                          </span>
                        )}
                        {choice.edital.examBoard && (
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <GraduationCap size={11} className="shrink-0 text-incidence/80" />
                            <span className="truncate">{choice.edital.examBoard}</span>
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="rounded-full border border-border/70 bg-background/55 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-content-muted">
                      Abrir origem
                    </span>
                  </span>

                  <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">
                    Matéria: <span className="text-content-main">{choice.subjectName}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void onSaveSubjectOriginName();
              }}
              disabled={subjectOriginChooser.isSavingName || subjectOriginChooser.draftSubjectName.trim() === subjectOriginChooser.subjectName}
              className="app-primary-button"
            >
              {subjectOriginChooser.isSavingName ? 'Salvando...' : 'Salvar nome no ciclo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={completeCycleConfirmOpen}
        onOpenChange={setCompleteCycleConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Concluir ciclo de estudos?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-content-muted">
              Esta é a última matéria pendente do seu ciclo de estudos. Ao marcá-la como estudada, você concluirá o ciclo atual.
              <br /><br />
              Deseja confirmar e concluir o ciclo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (event) => {
                event.preventDefault();
                if (pendingCompleteSubjectId) {
                  await executeMarcarMateriaComoEstudada(pendingCompleteSubjectId);
                }
                setCompleteCycleConfirmOpen(false);
              }}
              className="app-success-button font-semibold"
            >
              Confirmar e Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CycleExamDateDialog
        errorMessage={cycleExamDateError}
        examDate={cycleExamDateDraft}
        isOpen={cycleExamDateEditorOpen}
        isSaving={isSavingCycleExamDate}
        onExamDateChange={onSetCycleExamDateDraft}
        onOpenChange={onCycleExamDateOpenChange}
        onSave={onSaveCycleExamDate}
      />

      <AlertDialog
        open={resetCycleConfirmOpen}
        onOpenChange={(open) => !open && !isResettingCycle && onResetCycleConfirmOpenChange(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Resetar ciclo de estudos?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai zerar o ciclo atual, limpar as marcações deste ciclo e voltar a contagem para o Ciclo 1. Matérias concluídas no edital continuam fechadas; matérias fechadas só por primeiro contato voltam para a fila.
              <br /><br />
              Matérias, tópicos e conteúdo cadastrado não serão apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResettingCycle}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleResetCycle();
              }}
              disabled={isResettingCycle}
              className="app-danger-button flex items-center justify-center gap-2"
            >
              {isResettingCycle ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Resetar ciclo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={unloadConfirm.isOpen}
        onOpenChange={(open) => {
          if (!open && unloadingEditalId !== unloadConfirm.editalId) {
            onSetUnloadConfirmOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover edital do ciclo?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                <p>Tem certeza que deseja remover o edital <strong>"{unloadConfirm.editalName}"</strong> do seu ciclo de estudos?</p>
                <div className="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                  <p><strong>Informação importante:</strong> seu progresso, sessões de estudo e histórico de revisões serão preservados.</p>
                  <p className="mt-1">As revisões ficam pausadas fora do ciclo e serão retomadas quando você carregar este edital novamente.</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unloadingEditalId === unloadConfirm.editalId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (event) => {
                event.preventDefault();
                await onUnloadConfirm();
              }}
              disabled={unloadingEditalId === unloadConfirm.editalId}
              className="app-button-warning flex items-center justify-center gap-2"
            >
              {unloadingEditalId === unloadConfirm.editalId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2Off className="h-4 w-4" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deletePermanentConfirm.isOpen}
        onOpenChange={onDeletePermanentConfirmOpenChange}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Excluir do Edital
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 py-3">
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
              <p className="text-xs text-content-muted">Matéria:</p>
              <p className="truncate text-sm font-bold">{deletePermanentConfirm.subjectName}</p>
            </div>

            {deletePermanentConfirm.editais.length === 1 && (() => {
              const edital = deletePermanentConfirm.editais[0];
              const isOriginalSystem = !edital.source_id && edital.is_imported;

              return (
                <div className={`rounded-lg border px-3 py-2 ${isOriginalSystem ? 'border-destructive/20 bg-destructive/10' : 'border-border bg-muted/50'}`}>
                  {isOriginalSystem ? (
                    <p className="text-xs font-medium text-destructive">
                      Não é possível excluir: edital original do sistema
                    </p>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-content-muted">Edital:</p>
                        <p className="max-w-[180px] truncate text-sm font-medium">"{edital.name}"</p>
                      </div>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        edital.source_id
                          ? 'bg-primary/15 text-primary'
                          : edital.is_imported
                            ? 'bg-incidence/15 text-incidence'
                            : 'bg-success/15 text-success'
                      }`}>
                        {edital.source_id ? 'CÓPIA • SISTEMA' : edital.is_imported ? 'CÓPIA • IA' : 'MANUAL'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {deletePermanentConfirm.editais.length > 1 && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-content-muted">Escolha o edital para remover:</p>
                <div className="space-y-1">
                  {deletePermanentConfirm.editais.map((edital) => {
                    const isOriginalSystem = !edital.source_id && edital.is_imported;

                    return (
                      <button
                        key={edital.id}
                        onClick={() => {
                          if (isOriginalSystem) {
                            toastGate.notifyError('Não é possível excluir matérias do edital original do sistema!', 'DEL-SYS-01', { severity: 'high' });
                            return;
                          }

                          if (deletePermanentConfirm.subjectId) {
                            void handleDeletePermanent(deletePermanentConfirm.subjectId, edital.id);
                          }
                        }}
                        disabled={isOriginalSystem}
                        className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-xs transition-all ${
                          isOriginalSystem
                            ? 'cursor-not-allowed border-destructive/35 bg-destructive/10'
                            : 'border-border hover:border-destructive/35 hover:bg-destructive/10'
                        }`}
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className={`max-w-[180px] truncate font-medium ${isOriginalSystem ? 'text-destructive' : ''}`}>
                            {edital.name}
                          </span>
                          {isOriginalSystem && (
                            <span className="text-[9px] font-bold text-destructive">
                              Edital original do sistema
                            </span>
                          )}
                        </div>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          isOriginalSystem
                            ? 'bg-destructive/15 text-destructive'
                            : edital.source_id
                              ? 'bg-primary/15 text-primary'
                              : edital.is_imported
                                ? 'bg-incidence/15 text-incidence'
                                : 'bg-success/15 text-success'
                        }`}>
                          {isOriginalSystem ? 'SISTEMA' : edital.source_id ? 'CÓPIA' : edital.is_imported ? 'IA' : 'MANUAL'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-center text-[11px] text-content-muted">
              Esta ação não pode ser desfeita. Tópicos e histórico serão perdidos.
            </p>
          </div>

          <AlertDialogFooter className="flex-wrap gap-2">
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            {deletePermanentConfirm.editais.length > 1 && (
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  if (deletePermanentConfirm.subjectId) {
                    void handleDeletePermanent(deletePermanentConfirm.subjectId);
                  }
                }}
                className="app-danger-button gap-1.5 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir de TODOS
              </AlertDialogAction>
            )}
            {deletePermanentConfirm.editais.length <= 1 && (
              deletePermanentConfirm.editais.length === 0
              || !(deletePermanentConfirm.editais[0].is_imported && !deletePermanentConfirm.editais[0].source_id)
            ) && (
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  if (deletePermanentConfirm.subjectId) {
                    void handleDeletePermanent(deletePermanentConfirm.subjectId);
                  }
                }}
                className="app-danger-button gap-1.5 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportEditalModal
        isOpen={isImportEditalModalOpen}
        onClose={onCloseImportEditalModal}
        initialTab={modalInitialTab}
        manualModeChildren={mainSubjectUI}
        onImport={onImportSubjects}
        subjects={subjects}
      />

      <DifficultyRatingModal
        isOpen={difficultyModalData.isOpen}
        onClose={closeDifficultyModal}
        isSaving={isSavingTopicReview}
        savingText="Salvando no banco..."
        onSubmit={handleDifficultySubmit}
        onConfirmReview={handleDifficultyConfirmReview}
        onDiscard={handleDifficultyDiscard}
        onResume={handleDifficultyResume}
        topicName={difficultyModalData.topicName}
        subjectName={difficultyModalData.subjectName}
        initialDifficulty={difficultyModalData.currentDifficulty}
        reviewStage={difficultyModalData.reviewStage || ''}
        reviewCount={difficultyModalData.reviewCount}
        isCompleting={difficultyModalData.isCompleting}
        duration={difficultyModalData.duration ?? 0}
        strategicIncidenceLabel={difficultyModalData.strategicIncidenceLabel}
        strategicIncidenceDescription={difficultyModalData.strategicIncidenceDescription}
      />

      <ConfirmModal
        isOpen={isRevertModalOpen}
        onClose={onCloseRevertModal}
        onConfirm={() => {
          void onRevertMergeConfirm();
        }}
        title="Separar matéria unificada"
        description={(
          <div className="space-y-4">
            <p className="text-sm">
              A matéria <strong className="text-primary">"{selectedMergeName}"</strong> voltará a aparecer separada por edital no ciclo.
              O progresso e o histórico já sincronizados nos tópicos equivalentes serão preservados.
            </p>

            <div className="rounded-2xl border border-warning/35 bg-warning/10 px-4 py-3 text-xs font-semibold leading-relaxed text-warning">
              Use isto quando a equivalência estiver errada. Se os tópicos realmente forem o mesmo conteúdo, manter unificado evita linhas duplicadas nas revisões.
            </div>

            {selectedMergeOriginals.length > 0 && (
              <div className="origin-top scale-95 rounded-[24px] border border-border/50 bg-secondary/50 p-4 translate-y-[-4px]">
                <p className="mb-3 ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-content-muted/60">
                  COMO FICARÁ NO CICLO
                </p>
                <div className="space-y-2">
                  {selectedMergeOriginals.map((original, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-bold uppercase tracking-tight text-content-main">
                          {original.subjectName}
                        </span>
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-[9px] font-bold uppercase text-primary/60">
                            {original.editalName}
                          </span>
                          {original.editalOrgan && !original.editalName.toUpperCase().includes(original.editalOrgan.toUpperCase()) && (
                            <span className="shrink-0 text-[9px] font-medium uppercase text-content-muted/40">
                              • {original.editalOrgan}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                        <CheckCircle2 size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        confirmText="Separar matéria"
        cancelText="Manter unificada"
        variant="warning"
        icon={Link2Off}
        isLoading={isReverting}
      />

      {subjectsModal.edital && (
        <EditalSubjectsModal
          isOpen={subjectsModal.isOpen}
          onClose={onCloseSubjectsModal}
          onBack={() => undefined}
          edital={subjectsModal.edital}
          editais={editaisNoCiclo}
          allSubjects={subjects}
          initialExpandedSubjectId={subjectsModal.initialExpandedSubjectId}
          onUpdate={onSubjectsModalUpdate}
        />
      )}
    </div>
  );
}
