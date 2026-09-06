import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { Json } from '@/integrations/supabase/types';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTimer } from '@/contexts/TimerContext';
import {
    Plus, PlusCircle, Library, Trash2, Play, Eye,
    BookOpen, AlertTriangle, Merge, Unlink, X, CheckCircle2, RefreshCw, Sparkles, Loader2,
    AlertCircle, Info, GraduationCap, Database as DatabaseIcon, ChevronDown, ChevronLeft, ChevronUp, ChevronRight, Link, FileText, PencilLine, ArrowRight, CalendarDays
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { PageLoadingState } from '@/components/ui/PageLoadingState';
import { EditaisHeaderActions } from '@/components/editais/EditaisHeaderActions';
import { EditaisEmptyState } from '@/components/editais/EditaisEmptyState';
import { CycleConflictFeedbackNotices } from '@/components/editais/CycleConflictFeedbackNotices';
import { CycleConflictModalHeader } from '@/components/editais/CycleConflictModalHeader';
import { CycleConflictModalFooter } from '@/components/editais/CycleConflictModalFooter';
import { CycleConflictProcessingOverlay } from '@/components/editais/CycleConflictProcessingOverlay';
import { CycleCurrentSubjectsSection } from '@/components/editais/CycleCurrentSubjectsSection';
import { CycleNewEditalSection } from '@/components/editais/CycleNewEditalSection';
import { CycleTopicPreviewSection } from '@/components/editais/CycleTopicPreviewSection';
import { CycleSuccessSummary } from '@/components/editais/CycleSuccessSummary';
import { CycleReplacementPreview } from '@/components/editais/CycleReplacementPreview';
import { EditaisConfirmDialogs } from '@/components/editais/EditaisConfirmDialogs';
import { EditaisCardGrid } from '@/components/editais/EditaisCardGrid';
import { EditaisSecondaryModals } from '@/components/editais/EditaisSecondaryModals';
import { EditaisListHeader } from '@/components/editais/EditaisListHeader';
import { EditalSubjectsModal } from '@/components/editais/EditalSubjectsModal';
import { CycleMergeComparison } from '@/components/editais/CycleMergeComparison';
import { buildIndividualCycleMap } from '@/components/editais/cycleMergeComparisonModel';
import {
    buildCycleOriginSources,
} from '@/components/editais/cycleMergeNaming';
import { SyncReviewModal } from '@/components/editais/SyncReviewModal';
import { EditEditalModal } from '@/components/editais/EditEditalModal'; // Added
import { ImportEditalModal } from '@/components/subjects/ImportEditalModal';
import { MergeSuggestionCard, CompactMergeSuggestionList } from '@/components/subjects/MergeSuggestionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Subject, Topic } from '@/types';
import { errorService } from '@/lib/errors/errorService';
import { toastGate } from '@/lib/errors/toastGate';
import { invokeUserRpc } from '@/services/userRpcService';
import { cn } from '@/lib/utils';
import { withTimeout } from '@/utils/withTimeout';
import {
    performHybridMerge,
    saveUnificationMap,
    performFullTopicMerge,
    applyTopicMergeToMap,
    persistPhysicalSoftMerge,
} from '@/services/cycleMergeService';
import { mergeService } from '@/services/mergeService';
import { unloadEditalFromCycle } from '@/services/cycleUnloadService';
import { resetEditalStudyProgress } from '@/services/editalStudyProgressResetService';
import { getPendingMergeForCycleLoad } from '@/utils/cycleLoadPendingMerge';
import { formatRecoveredMergeTimestamp } from '@/utils/recoveredMergeTimestamp';
import { guardActiveTimerOperation } from '@/utils/activeTimerOperationGuard';
import { fetchTopicsForMerge, updateTopicsForMerge, fetchUserCycleForEditalMerge, fetchEditalSubjectsWithTopics, fetchActiveSubjectMerges, deleteEditalData, updateCycleDetails, updateUserEditalRecord, updateEditalRecord, fetchUserEditalById, createMergedEdital, deleteUserEditais, clearUserExamDateMeta, fetchCycleId, applyEditalSyncContent } from '@/services/editaisPageService';
import { useEditaisCatalogData } from '@/hooks/useEditaisCatalogData';
import { useEditaisPendingSuggestions } from '@/hooks/useEditaisPendingSuggestions';
import { useEditaisConflictPreview } from '@/hooks/useEditaisConflictPreview';
import { CycleConflictMergeProgressNotice, CycleConflictProgressChoice } from '@/components/editais/CycleConflictProgressCards';
import { getEditaisConflictStats } from '@/utils/editaisConflictStats';
import { getSyncedSourceTime, hasEditalMetadataDiff } from '@/utils/editaisSyncPresentation';
import { useEditaisFilteredList } from '@/hooks/useEditaisFilteredList';
import { useEditalLifecycleActions } from '@/hooks/useEditalLifecycleActions';
import { useEditalMetadataActions } from '@/hooks/useEditalMetadataActions';
import { useEditalManualMerge } from '@/hooks/useEditalManualMerge';
import { useCycleSuccessNavigation } from '@/hooks/useCycleSuccessNavigation';
import { useEditalImportCompletion } from '@/hooks/useEditalImportCompletion';
import { useEditalSyncPreparation, type SyncReviewState } from '@/hooks/useEditalSyncPreparation';
import { useEditalSyncApplication } from '@/hooks/useEditalSyncApplication';
import { useEditaisTopicMergePreviews } from '@/hooks/useEditaisTopicMergePreviews';
import { useCycleConflictAction } from '@/hooks/useCycleConflictAction';
import { useEditalCycleLoad } from '@/hooks/useEditalCycleLoad';
import { useEditalUpdateAction } from '@/hooks/useEditalUpdateAction';
import { useCycleConflictClose } from '@/hooks/useCycleConflictClose';
import { useEditalSelection } from '@/hooks/useEditalSelection';
import { buildEditalProgressSummary, type EditalProgressSummary } from '@/utils/editalProgressSummary';
import {
    CycleUnificationMap,
    HybridMergeResult,
    UnifiedSubjectMapping,
    UnifiedTopicMapping,
} from '@/types/cycleMergeTypes';
import {
    formatCycleSourceName,
    formatExamDateLabel,
    getJsonRecord,
    isManualCycleOrigin,
    parseCycleUnificationMap,
    sanitizeExamDate,
    serializeJson,
    sortTopicsByLeadingNumberWhenComplete,
    type CycleConflictState,
    type CycleOrigin,
    type PendingMergeDraft,
    type PublicEditalSource,
    type StudySessionSummary,
    type UserEdital,
} from '@/utils/editaisPagePresentation';
export type { UserEdital } from '@/utils/editaisPagePresentation';

// ─── Componente Principal ───────────────────────────────────────────────────
const Editais = () => {
    const { user } = useAuth();
    const { activeTimer } = useTimer();
    const { subjects, isLoading, refreshData } = useApp();
    const location = useLocation();
    const navigate = useNavigate();

    const [isSaving, setIsSaving] = useState(false);
    const [filterCycle, setFilterCycle] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importModalTab, setImportModalTab] = useState<'ready' | 'ia' | 'manual'>('ready');
    const [subjectsModal, setSubjectsModal] = useState<{ 
        isOpen: boolean; 
        edital: UserEdital | null;
        initialExpandedSubjectId?: string;
        returnTo?: string;
    }>({ isOpen: false, edital: null });
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; edital: UserEdital | null }>({ isOpen: false, edital: null });
    const [unloadConfirm, setUnloadConfirm] = useState<{ isOpen: boolean; edital: UserEdital | null }>({ isOpen: false, edital: null });
    const [cycleConflict, setCycleConflict] = useState<CycleConflictState>({
        isOpen: false,
        edital: null,
        existingIds: [],
        currentOrigins: [],
        step: 'select',
        action: null,
        showIASuggestionsOnly: false,
        showDetailedPreview: false
    });
    const [isRecoveringMerge, setIsRecoveringMerge] = useState(false);
    const [isAnalyzingTopics, setIsAnalyzingTopics] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isMerging, setIsMerging] = useState(false);
    const [isCycleFinalizationLocked, setIsCycleFinalizationLocked] = useState(false);
    const [isOpeningCycle, setIsOpeningCycle] = useState(false);
    const [cycleNameDraft, setCycleNameDraft] = useState('');
    const [selectedCycleNameSourceIds, setSelectedCycleNameSourceIds] = useState<string[]>([]);
    const [cycleExamDateDraft, setCycleExamDateDraft] = useState<string>('');
    const [mergePhase, setMergePhase] = useState<'exact' | 'ai' | 'finalizing'>('exact');
    const canRunCycleStructuralOperation = useCallback(
        () => guardActiveTimerOperation(activeTimer),
        [activeTimer],
    );
    const [removalProgress, setRemovalProgress] = useState<{ editalId: string, message: string, percentage: number } | null>(null);

    const [expandedPreviewSubjects, setExpandedPreviewSubjects] = useState<Set<string>>(new Set());
    const {
        dataLoaded,
        studySessions,
        discardPendingMerge,
        editais,
        fetchEditais,
        fetchPublicEditais,
        loadingEditais,
        pendingMerges,
        publicEditais,
        publicEditaisLoaded,
        savePendingMerge,
        setEditais,
        setPendingMerges,
    } = useEditaisCatalogData({ isImportModalOpen, userId: user?.id });
    const {
        discardPendingMergeSuggestions: clearPendingSuggestions,
        handleApproveSuggestion,
        handleRejectSuggestion,
        isLoadingSuggestions,
        loadPendingSuggestions,
        pendingSuggestions,
        setPendingSuggestions,
    } = useEditaisPendingSuggestions({ editaisCount: editais.length, isLoading, userId: user?.id });

    const togglePreviewSubjectExpansion = (subjectId: string) => {
        setExpandedPreviewSubjects(prev => {
            const next = new Set(prev);
            if (next.has(subjectId)) {
                next.delete(subjectId);
            } else {
                next.add(subjectId);
            }
            return next;
        });
    };
    const [processingProgress, setProcessingProgress] = useState<{ message: string; percentage?: number; current?: number; total?: number } | null>(null);
    const [syncReview, setSyncReview] = useState<SyncReviewState>({ isOpen: false, edital: null, localSubjects: [], sourceSubjects: [] });
    const [editModal, setEditModal] = useState<{ isOpen: boolean; edital: UserEdital | null }>({ isOpen: false, edital: null });
    const [loadedEditalSubjects, setLoadedEditalSubjects] = useState<Subject[]>([]);

    const cycleConflictStats = useMemo(() => getEditaisConflictStats(cycleConflict, loadedEditalSubjects, subjects), [cycleConflict, loadedEditalSubjects, subjects]);

    const shouldAskProgressMode = Boolean(
        cycleConflict.progressSummary?.hasProgress
        && (cycleConflict.existingIds.length === 0 || cycleConflict.action === 'replace')
    );
    const shouldShowMergeProgressNotice = Boolean(
        cycleConflict.progressSummary?.hasProgress
        && cycleConflict.existingIds.length > 0
        && cycleConflict.action !== 'replace'
    );
    const progressChoiceCard = shouldAskProgressMode ? <CycleConflictProgressChoice cycleConflict={cycleConflict} setCycleConflict={setCycleConflict} /> : null;
    const mergeProgressNoticeCard = shouldShowMergeProgressNotice ? <CycleConflictMergeProgressNotice cycleConflict={cycleConflict} setCycleConflict={setCycleConflict} /> : null;

    const hasCycleEditais = useMemo(
        () => editais.some(edital => edital.mergedIntoCycle),
        [editais],
    );

    // ── Efeito para abrir modal baseado no estado de navegação ──
    useEffect(() => {
        // Usar uma flag temporária para evitar re-execução indesejada ao mudar o array de editais
        const state = location.state;
        if (!state) return;

        if (state.openImportModal) {
            setIsImportModalOpen(true);
            if (state.importTab) {
                setImportModalTab(state.importTab);
            }
        }
        
        // Abre modal de matérias de um edital específico
        if (state.openEditalId && editais.length > 0) {
            const targetEdital = editais.find(e => e.id === state.openEditalId);
            if (targetEdital) {
                setSubjectsModal({ 
                    isOpen: true, 
                    edital: targetEdital,
                    initialExpandedSubjectId: state.highlightSubjectId,
                    returnTo: state.returnTo
                });
            }
        }

        if (state.filterCycle) {
            setFilterCycle(hasCycleEditais);
        }

        // Limpa o estado imediatamente para não disparar novamente
        window.history.replaceState({}, document.title);
    }, [location.state, editais, hasCycleEditais]);


    const { handleSaveEdital } = useEditalMetadataActions({
        fetchEditais,
        userId: user?.id,
    });

    const [searchParams] = useSearchParams();
    const routeHighlightedSourceId = searchParams.get('sourceId');
    const [recentlyImportedEditalId, setRecentlyImportedEditalId] = useState<string | null>(null);
    const highlightedSourceId = recentlyImportedEditalId || routeHighlightedSourceId;
    const [scrolledTo, setScrolledTo] = useState(false);


    const filteredEditais = useEditaisFilteredList({ editais, filterCycle, highlightedSourceId, scrolledTo, setScrolledTo });

    useEffect(() => {
        if (!recentlyImportedEditalId) return;
        const timer = window.setTimeout(() => setRecentlyImportedEditalId(null), 6000);
        return () => window.clearTimeout(timer);
    }, [recentlyImportedEditalId]);


    // ── CRUD Operations ──
    const { handleDeleteEdital, handleUnloadCycle } = useEditalLifecycleActions({
        canRunCycleStructuralOperation,
        clearPendingSuggestions,
        discardPendingMerge,
        fetchEditais,
        processingId,
        refreshData,
        setDeleteConfirm,
        setEditais,
        setPendingSuggestions,
        setProcessingId,
        setRemovalProgress,
        userId: user?.id,
    });

    const { handleDiscardRecoveredMerge, handleLoadCycle } = useEditalCycleLoad({
        canRunCycleStructuralOperation,
        discardPendingMerge,
        editais,
        pendingMerges,
        setCycleConflict,
        setIsRecoveringMerge,
        setLoadedEditalSubjects,
        setProcessingId,
        subjects,
        userId: user?.id,
    });

    const {
        areReplacePreviewSubjectsExpanded,
        cycleExamDateOptions,
        cycleMergeSources,
        cycleNameCandidates,
        defaultCycleExamDate,
        finalPreviewIds,
        replacePreviewSubjectIds,
        selectedCycleNameSourceIdSet,
        successCycleSources,
        successCycleStats,
        toggleCycleNameSource,
    } = useEditaisConflictPreview({
        cycleConflict,
        expandedPreviewSubjects,
        loadedEditalSubjects,
        selectedCycleNameSourceIds,
        setCycleExamDateDraft,
        setCycleNameDraft,
        setSelectedCycleNameSourceIds,
        subjects,
    });

    const { handleHybridPreview, handleManualTopicEquivalenceChange, handleTopicPreview } = useEditaisTopicMergePreviews({
        cycleConflict,
        editais,
        loadPendingSuggestions,
        savePendingMerge,
        setCycleConflict,
        setIsAnalyzingTopics,
        setIsMerging,
        setMergePhase,
        setProcessingProgress,
        subjects,
        userId: user?.id,
    });

    const { handleCycleConflictAction } = useCycleConflictAction({
        canRunCycleStructuralOperation, cycleConflict, user, setProcessingId, setIsCycleFinalizationLocked,
        setIsMerging, setMergePhase, setProcessingProgress, editais, subjects, setEditais, discardPendingMerge,
        fetchEditais, refreshData, cycleMergeSources, cycleNameCandidates, defaultCycleExamDate,
    });

    const { handleGoToCycleAfterSuccess } = useCycleSuccessNavigation({
        action: cycleConflict.action,
        cycleConflict,
        cycleNameCandidates,
        cycleNameDraft,
        cycleExamDateDraft,
        setCycleConflict,
        setCycleExamDateDraft,
        setCycleNameDraft,
        setIsOpeningCycle,
        setSelectedCycleNameSourceIds,
        userId: user?.id,
    });

    const closeCycleConflictModal = useCycleConflictClose({
        cycleConflict,
        isAnalyzingTopics,
        isMerging,
        setCycleConflict,
        setCycleNameDraft,
        setSelectedCycleNameSourceIds,
        setCycleExamDateDraft,
        setIsRecoveringMerge,
    });

    /**
     * Importação de edital: cria matérias e tópicos REAIS no Supabase,
     * coleta os UUIDs retornados e salva o edital com esses IDs.
     */
    const { handleImportDone } = useEditalImportCompletion({
        fetchEditais,
        isSaving,
        refreshData,
        setIsImportModalOpen,
        setIsSaving,
        setRecentlyImportedEditalId,
        setScrolledTo,
        setSubjectsModal,
        userId: user?.id,
    });

    const { selectedIds, setSelectedIds, toggleSelect } = useEditalSelection();

    const { handleMerge } = useEditalManualMerge({
        clearPendingSuggestions,
        editais,
        fetchEditais,
        selectedIds,
        setIsMerging,
        setPendingSuggestions,
        setSelectedIds,
        userId: user?.id,
    });

    const { handleUpdateEdital } = useEditalUpdateAction({
        setEditais,
        userId: user?.id,
    });

    const { handleSyncEdital } = useEditalSyncPreparation({
        setProcessingId,
        setSyncReview,
        userId: user?.id,
    });

    /**
     * Aplica as alterações selecionadas no SyncReviewModal
     */
    const { applySyncChanges } = useEditalSyncApplication({
        fetchEditais,
        refreshData,
        setProcessingId,
        setSyncReview,
        syncReview,
        userId: user?.id,
    });

    const keepCycleModalMountedDuringProcessing =
        cycleConflict.isOpen && (
            isMerging ||
            isAnalyzingTopics ||
            isCycleFinalizationLocked ||
            processingId === cycleConflict.edital?.id
        );

    // ── Loading ──
    if ((isLoading || loadingEditais || !dataLoaded) && !keepCycleModalMountedDuringProcessing) {
        return <PageLoadingState label="Carregando editais" />;
    }

    return (
        <div className="min-h-full p-2 md:p-3 lg:p-4 space-y-3">
            <EditaisListHeader
                editaisCount={editais.length}
                hasCycleEditais={editais.some(edital => edital.mergedIntoCycle)}
                selectedCount={selectedIds.size}
                filterCycle={filterCycle}
                isMerging={isMerging}
                onMerge={handleMerge}
                onOpenImport={(tab) => {
                    setImportModalTab(tab);
                    setIsImportModalOpen(true);
                }}
                onClearFilter={() => setFilterCycle(false)}
            />

            {/* ── Grid de Cards / Empty State ── */}
            {dataLoaded && filteredEditais.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col items-center justify-center text-center relative ${isImportModalOpen ? 'pt-0 pb-12 px-2' : 'py-20 px-8'}`}
                >
                    {editais.length === 0 ? (
                        isImportModalOpen ? (
                            <div className="w-full text-left">
                                <ImportEditalModal
                                    isOpen={isImportModalOpen}
                                    onClose={() => setIsImportModalOpen(false)}
                                    initialTab={importModalTab}
                                    subjects={subjects}
                                    userEditais={editais}
                                    onImport={handleImportDone}
                                    inlineMode={true}
                                />
                            </div>
                        ) : (
                            <EditaisEmptyState
                                hasEditais={false}
                                filterCycle={filterCycle}
                                pendingSuggestionsCount={pendingSuggestions.length}
                                onOpenImport={(tab) => {
                                    setImportModalTab(tab);
                                    setIsImportModalOpen(true);
                                }}
                                onClearFilters={() => setFilterCycle(false)}
                                onClearSuggestions={async () => {
                                    if (user?.id) {
                                        await clearPendingSuggestions(user.id);
                                        setPendingSuggestions([]);
                                        toast.success('Sugestões órfãs limpas com sucesso.');
                                    }
                                }}
                            />
                        )
                    ) : (
                        <EditaisEmptyState
                            hasEditais
                            filterCycle={filterCycle}
                            pendingSuggestionsCount={0}
                            onOpenImport={() => undefined}
                            onClearFilters={() => setFilterCycle(false)}
                            onClearSuggestions={() => undefined}
                        />

                    )}
                </motion.div>
            ) : (
                <EditaisCardGrid
                    editais={filteredEditais}
                    subjects={subjects}
                    studySessions={studySessions}
                    publicEditais={publicEditais}
                    publicEditaisLoaded={publicEditaisLoaded}
                    selectedIds={selectedIds}
                    deleteConfirm={deleteConfirm}
                    processingId={processingId}
                    removalProgress={removalProgress}
                    highlightedSourceId={highlightedSourceId}
                    onToggleSelect={toggleSelect}
                    onViewSubjects={(edital) => setSubjectsModal({ isOpen: true, edital })}
                    onLoadCycle={handleLoadCycle}
                    onUnloadCycle={(edital) => setUnloadConfirm({ isOpen: true, edital })}
                    onDelete={(edital) => setDeleteConfirm({ isOpen: true, edital })}
                    onSync={handleSyncEdital}
                    onEdit={(edital) => setEditModal({ isOpen: true, edital })}
                />
            )}

            <EditaisSecondaryModals
                isImportModalOpen={isImportModalOpen}
                importModalTab={importModalTab}
                subjectsModal={subjectsModal}
                subjects={subjects}
                editais={editais}
                onCloseImport={() => setIsImportModalOpen(false)}
                onImport={handleImportDone}
                onCloseSubjects={() => setSubjectsModal({ isOpen: false, edital: null })}
                onBack={subjectsModal.returnTo ? () => navigate(subjectsModal.returnTo!) : undefined}
                onUpdate={handleUpdateEdital}
            />

            <EditaisConfirmDialogs
                deleteConfirm={deleteConfirm}
                unloadConfirm={unloadConfirm}
                processingId={processingId}
                onCloseDelete={() => setDeleteConfirm({ isOpen: false, edital: null })}
                onDelete={() => handleDeleteEdital(deleteConfirm.edital!)}
                onCloseUnload={() => setUnloadConfirm({ isOpen: false, edital: null })}
                onUnload={async () => {
                    const removed = await handleUnloadCycle(unloadConfirm.edital!);
                    if (removed) setUnloadConfirm({ isOpen: false, edital: null });
                }}
            />
            {cycleConflict.isOpen && cycleConflict.edital && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => closeCycleConflictModal('backdrop')}
                            className="absolute inset-0 bg-background/78 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className={`relative flex min-h-0 w-full flex-col overflow-hidden rounded-[28px] border border-border bg-modal shadow-2xl shadow-black/35 dark:border-white/[0.08] ${cycleConflict.step === 'success' ? 'max-w-3xl' : 'max-w-5xl'}`} style={{ maxHeight: 'calc(100dvh - 32px)' }}
                        >
                            {/* Efeito de Profundidade Sutil */}
                            <div className="absolute inset-0 pointer-events-none border border-white/[0.03] rounded-[32px]" />
                            {(isMerging || isAnalyzingTopics || isCycleFinalizationLocked) && cycleConflict.step !== 'success' && (
                                <CycleConflictProcessingOverlay
                                    mergePhase={mergePhase}
                                    message={processingProgress?.message}
                                    percentage={processingProgress?.percentage}
                                />
                            )}

                            <CycleConflictModalHeader
                                cycleConflict={cycleConflict}
                                isMerging={isMerging}
                                isAnalyzingTopics={isAnalyzingTopics}
                                isCycleFinalizationLocked={isCycleFinalizationLocked}
                                onBack={() => {
                                    if (cycleConflict.step === 'preview') setCycleConflict(prev => ({ ...prev, step: 'select', action: null }));
                                    else if (cycleConflict.step === 'topic-preview') setCycleConflict(prev => ({ ...prev, step: 'preview' }));
                                }}
                                onNext={() => {
                                    if (cycleConflict.step === 'select') handleHybridPreview();
                                }}
                                onClose={() => closeCycleConflictModal('button')}
                            />

                            {/* Área de Conteúdo - Lateral 2cm, Vertical 1cm */}
                            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto custom-scrollbar px-6 pb-4 pt-4 md:px-8">
                                <CycleConflictFeedbackNotices
                                    cycleConflict={cycleConflict}
                                    isRecoveringMerge={isRecoveringMerge}
                                    processingId={processingId}
                                    onDiscardRecoveredMerge={() => handleDiscardRecoveredMerge(cycleConflict.edital)}
                                />

                                <div className="flex flex-col gap-10">
                                <CycleCurrentSubjectsSection
                                    cycleConflict={cycleConflict}
                                    subjects={subjects}
                                />

                                <CycleNewEditalSection
                                    cycleConflict={cycleConflict}
                                    subjects={subjects}
                                    loadedEditalSubjects={loadedEditalSubjects}
                                    progressChoiceCard={progressChoiceCard}
                                    mergeProgressNoticeCard={mergeProgressNoticeCard}
                                    onToggleDetailedPreview={() => setCycleConflict(prev => ({ ...prev, showDetailedPreview: !prev.showDetailedPreview }))}
                                />

                                <CycleReplacementPreview
                                    cycleConflict={cycleConflict}
                                    subjects={subjects}
                                    finalPreviewIds={finalPreviewIds}
                                    expandedSubjects={expandedPreviewSubjects}
                                    onToggleSubject={togglePreviewSubjectExpansion}
                                    allExpanded={areReplacePreviewSubjectsExpanded}
                                    progressChoiceCard={progressChoiceCard}
                                    onToggleAll={() => {
                                        setExpandedPreviewSubjects(areReplacePreviewSubjectsExpanded ? new Set() : new Set(replacePreviewSubjectIds));
                                    }}
                                />

                                <CycleTopicPreviewSection
                                    cycleConflict={cycleConflict}
                                    pendingSuggestions={pendingSuggestions}
                                    isLoadingSuggestions={isLoadingSuggestions}
                                    onApproveSuggestion={handleApproveSuggestion}
                                    onRejectSuggestion={handleRejectSuggestion}
                                    onToggleSuggestions={(onlySuggestions) => setCycleConflict(prev => ({ ...prev, showIASuggestionsOnly: onlySuggestions }))}
                                    expandedSubjects={expandedPreviewSubjects}
                                    onToggleSubject={togglePreviewSubjectExpansion}
                                />

                                <CycleSuccessSummary
                                    cycleConflict={cycleConflict}
                                    stats={successCycleStats}
                                    sources={successCycleSources}
                                    cycleExamDateDraft={cycleExamDateDraft}
                                    cycleNameDraft={cycleNameDraft}
                                    selectedSourceIds={selectedCycleNameSourceIdSet}
                                    dateOptions={cycleExamDateOptions}
                                    isOpeningCycle={isOpeningCycle}
                                    onCycleNameChange={(value) => {
                                        setCycleNameDraft(value);
                                        setSelectedCycleNameSourceIds([]);
                                    }}
                                    onToggleSource={toggleCycleNameSource}
                                    onDateChange={setCycleExamDateDraft}
                                />

                                </div>
                            </div>

                            <CycleConflictModalFooter
                                cycleConflict={cycleConflict}
                                stats={cycleConflictStats}
                                isMerging={isMerging}
                                isAnalyzingTopics={isAnalyzingTopics}
                                isCycleFinalizationLocked={isCycleFinalizationLocked}
                                isOpeningCycle={isOpeningCycle}
                                processingId={processingId}
                                shouldAskProgressMode={shouldAskProgressMode}
                                onReplacePreview={() => {
                                    setExpandedPreviewSubjects(new Set(replacePreviewSubjectIds));
                                    setCycleConflict(prev => ({ ...prev, step: 'preview', action: 'replace' }));
                                }}
                                onHybridPreview={handleHybridPreview}
                                onTopicPreview={() => handleTopicPreview(true)}
                                onAction={handleCycleConflictAction}
                                onOpenCycle={handleGoToCycleAfterSuccess}
                            />
                        </motion.div>
                    </div>
                , document.body)}


            {/* ── Modal de Revisão de Sincronização ── */}
            {syncReview.isOpen && syncReview.edital && (
                <SyncReviewModal
                    isOpen={syncReview.isOpen}
                    onClose={() => setSyncReview(prev => ({ ...prev, isOpen: false }))}
                    onApply={applySyncChanges}
                    localSubjects={syncReview.localSubjects}
                    sourceSubjects={syncReview.sourceSubjects}
                    editalName={syncReview.edital.name}
                    hasMetadataUpdate={hasEditalMetadataDiff(syncReview.edital, syncReview.sourceMetadata || undefined)}
                />
            )}

            <EditEditalModal
                isOpen={editModal.isOpen}
                onClose={() => setEditModal({ isOpen: false, edital: null })}
                edital={editModal.edital}
                onSave={handleSaveEdital}
            />
        </div>
    );
};

export default Editais;
