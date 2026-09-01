import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Trash2, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Subject } from '@/types';
import type { UserEdital } from '@/pages/Editais';
import { toastGate } from '@/lib/errors/toastGate';
import { supabase } from '@/integrations/supabase/client';

import { ImportMethodSelector, type ImportMethod } from './import-edital/ImportMethodSelector';
import { ImportJourneyProgress } from './import-edital/ImportJourneyProgress';
import { ReadyEditalCatalog, type ReadyEdital } from './import-edital/ReadyEditalCatalog';
import { ManualEditalForm, type ManualEditalFormData } from './import-edital/ManualEditalForm';
import { AiInputStep } from './import-edital/AiInputStep';
import { AiCargoSelectionStep } from './import-edital/AiCargoSelectionStep';
import { AiProgressStep } from './import-edital/AiProgressStep';
import { AiReviewStep } from './import-edital/AiReviewStep';
import { EditalSuggestionDrawer } from './import-edital/EditalSuggestionDrawer';

import { useCatalogEditais } from './import-edital/useCatalogEditais';
import { useAiEditalExtraction } from './import-edital/useAiEditalExtraction';

interface ImportEditalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (subjects: Subject[], editalName?: string, isImported?: boolean, sourceId?: string, extraInfo?: { organ: string; position: string; year: string; category?: string; exam_date?: string; exam_board?: string | null; source_updated_at?: string | null }, aiExtractionUsed?: boolean) => Promise<void> | void;
    subjects: Subject[];
    userEditais?: UserEdital[];
    initialTab?: 'ready' | 'ia' | 'manual';
    manualModeChildren?: React.ReactNode;
    /** Renderiza o modal de forma inline sem os wrappers fixed e overlay */
    inlineMode?: boolean;
}

export const ImportEditalModal: React.FC<ImportEditalModalProps> = ({
    isOpen,
    onClose,
    onImport,
    userEditais = [],
    initialTab = 'ready',
    manualModeChildren,
    inlineMode = false
}) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'ready' | 'ia' | 'manual'>(initialTab);

    // Suggestion slide state
    const [showSuggestSlide, setShowSuggestSlide] = useState(false);
    const [suggestConcurso, setSuggestConcurso] = useState('');
    const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);
    const [suggestionSent, setSuggestionSent] = useState(false);

    // Manual form state
    const [manualOrigin, setManualOrigin] = useState('');
    const [manualPosition, setManualPosition] = useState('');
    const [manualBanca, setManualBanca] = useState('');
    const [manualYear, setManualYear] = useState('');
    const [importingManual, setImportingManual] = useState(false);

    // Catalog Hook
    const {
        editais,
        loadingEditais,
        importingReadyEditalId,
        setImportingReadyEditalId,
    } = useCatalogEditais(isOpen);

    // AI Extraction Hook
    const {
        iaOrigin,
        setIaOrigin,
        iaPosition,
        setIaPosition,
        iaBanca,
        setIaBanca,
        iaYear,
        setIaYear,
        examDate,
        setExamDate,
        inputText,
        setInputText,
        pdfFiles,
        aiSourceMode,
        setAiSourceMode,
        showOptionalContext,
        setShowOptionalContext,
        iaStage,
        iaEditalName,
        aiResult,
        setAiResult,
        isSavingAi,
        setIsSavingAi,
        processingMsg,
        iaProgress,
        pendingExtraction,
        analysisResult,
        selectedCargoId,
        setSelectedCargoId,
        selectedCargoName,
        setSelectedCargoName,
        loadingPending,
        iaErrorMessage,
        setIaErrorMessage,
        missingContentSource,
        weightExtractionStatus,
        weightBlockInfo,
        aiLimits,
        loadingAiLimits,
        pdfInputRef,
        handleFileChange,
        handleRemovePdf,
        handleIaImport,
        handleExtractSelectedCargo,
        handleJourneySecondaryAction,
        discardPendingExtractionData,
        aiExamWeightTotals,
        isGenericCargoName,
        formatLongDetectedText,
        hasOnlyGenericCargoAnalysis,
        getAiErrorHeading,
    } = useAiEditalExtraction(isOpen, activeTab);

    const handleCloseModal = async () => {
        onClose();
    };

    const handleOutsideModalClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            handleCloseModal();
        }
    };

    const handleSendSuggestion = async () => {
        if (!suggestConcurso.trim() || !user) return;
        setIsSendingSuggestion(true);
        try {
            const { error } = await supabase.from('edital_suggestions').insert({
                user_id: user.id,
                concurso_name: suggestConcurso.trim(),
            });
            if (error) throw error;
            setSuggestionSent(true);
        } catch (error) {
            console.error('Erro ao enviar sugestão:', error);
            toastGate.notifyError('Não foi possível enviar sua sugestão. Tente novamente.', 'SUGG-01');
        } finally {
            setIsSendingSuggestion(false);
        }
    };

    const handleSaveAiResult = async () => {
        setIsSavingAi(true);
        try {
            const newSubjects = aiResult.filter(s => s.selected).map(s => ({
                id: Math.random().toString(36).substr(2, 9),
                name: s.title,
                status: 'Nova',
                exam_weight_points: s.weight?.points ?? null,
                exam_weight_questions: s.weight?.questions ?? null,
                exam_weight_percentage: s.weight?.percentage ?? null,
                exam_weight_raw: (s.weight?.points !== null && s.weight?.points !== undefined) ||
                    (s.weight?.questions !== null && s.weight?.questions !== undefined) ||
                    (s.weight?.percentage !== null && s.weight?.percentage !== undefined)
                    ? s.weight?.rawText ?? null
                    : null,
                topics: s.topics.filter(t => t.selected && t.name.trim().length >= 2).map((t, idx) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: t.name.length > 500 ? t.name.substring(0, 497) + '...' : t.name,
                    completed: false,
                    reviewCount: 0,
                    review_count: 0,
                    position: t.position ?? idx
                }))
            } as Subject));

            const finalName = iaEditalName.trim() || `${iaOrigin} - ${iaPosition || selectedCargoName} (${iaYear})`.trim() || 'Edital Importado';
            const normalizedName = finalName.toLowerCase().trim();
            const exists = userEditais.some(e => e.name.toLowerCase().trim() === normalizedName);
            
            if (exists) {
                toastGate.notifyError('Você já possui um edital com este nome.', 'COMPONENTS-SUBJECTS-IMPORTEDITALMODAL-01', { severity: 'medium' });
                setIsSavingAi(false);
                return;
            }
            
            const extraInfo = {
                organ: iaOrigin,
                position: iaPosition || selectedCargoName,
                year: iaYear,
                exam_date: examDate,
                exam_board: iaBanca.trim() || analysisResult?.edital.banca || null
            };
            onClose();
            await onImport(newSubjects, finalName, true, undefined, extraInfo, true);
            await discardPendingExtractionData();
        } catch (error) {
            console.error('Erro ao salvar resultado da IA:', error);
            toastGate.notifyError('Erro ao salvar o edital importado.', 'SAVE-IA-01');
        } finally {
            setIsSavingAi(false);
        }
    };

    const handleSaveManual = async (formData?: ManualEditalFormData) => {
        const origin = (formData?.origin ?? manualOrigin).trim();
        const position = (formData?.position ?? manualPosition).trim();
        const year = (formData?.year ?? manualYear).trim();
        const board = (formData?.examBoard ?? manualBanca).trim();
        const exam_date = (formData?.examDate ?? examDate).trim();

        if (!origin || !position || !year) {
            toastGate.notifyError('Preencha os campos obrigatórios (origem, cargo e ano).', 'VAL-01', { severity: 'low' });
            return;
        }

        setImportingManual(true);
        try {
            const finalName = `${origin} - ${position}`;
            const normalizedName = finalName.toLowerCase().trim();
            const exists = userEditais.some(e => e.name.toLowerCase().trim() === normalizedName);
            
            if (exists) {
                toastGate.notifyError('Você já possui um edital com este nome/instituição e cargo.', 'VAL-DUP-02', { severity: 'medium' });
                setImportingManual(false);
                return;
            }

            const extraInfo = { organ: origin, position, year, exam_date: exam_date || undefined, exam_board: board || null };
            await discardPendingExtractionData();
            onClose();
            await onImport([], finalName, false, undefined, extraInfo); 
            
            setManualOrigin('');
            setManualPosition('');
            setManualYear('');
            setManualBanca('');
        } catch (error) {
            console.error('Erro ao salvar edital manual:', error);
        } finally {
            setImportingManual(false);
        }
    };

    const handleImportReadyEdital = async (edital: ReadyEdital) => {
        if (importingReadyEditalId) return;
        setImportingReadyEditalId(edital.id);
        try {
            const rawSubjects = Array.isArray(edital.subjects) ? edital.subjects : [];
            const mappedSubjects: Subject[] = rawSubjects.map((subject, idx) => ({
                id: subject.id || `imp-subj-${idx}-${Date.now()}`,
                name: subject.name,
                status: 'Nova',
                color: subject.color,
                priority: subject.priority,
                topics: (subject.topics || []).map((topic, tidx) => ({
                    id: topic.id || `imp-top-${idx}-${tidx}-${Date.now()}`,
                    name: topic.name,
                    completed: false,
                    reviewCount: 0,
                    review_count: 0,
                    position: tidx
                }))
            }));

            const finalName = `${edital.organ} - ${edital.position} (${edital.year})`.trim();
            const normalizedName = finalName.toLowerCase();
            const exists = userEditais.some(e => e.name.toLowerCase().trim() === normalizedName);
            
            if (exists) {
                toastGate.notifyError('Você já possui um edital com este nome importado.', 'VAL-DUP-03', { severity: 'medium' });
                return;
            }

            await discardPendingExtractionData();
            await onImport(
                mappedSubjects, 
                finalName, 
                true, 
                edital.id,
                { 
                    organ: edital.organ, 
                    position: edital.position, 
                    year: edital.year || '',
                    category: edital.category,
                    exam_date: edital.exam_date,
                    exam_board: edital.exam_board ?? null,
                    source_updated_at: edital.updated_at ?? null
                }
            );
            onClose();
        } catch (error) {
            console.error('Erro ao importar edital pronto:', error);
            toastGate.notifyError('Erro ao importar edital selecionado', 'IMP-01');
        } finally {
            setImportingReadyEditalId(null);
        }
    };

    if (!isOpen && !inlineMode) return null;

    const getAiUsageSummary = () => {
        if (activeTab !== 'ia') return null;
        if (loadingAiLimits) return 'IA · verificando';
        if (!aiLimits) return 'IA · indisponível';
        if (aiLimits.has_bypass) return 'IA · ilimitada';
        const remaining = aiLimits.remaining ?? Math.max(aiLimits.limit - aiLimits.usage, 0);
        if (!aiLimits.can_import) return `IA · ${aiLimits.usage}/${aiLimits.limit}`;
        return `IA · ${remaining} restante${remaining === 1 ? '' : 's'}`;
    };

    const aiUsageSummary = getAiUsageSummary();

    const getModalWidthClass = () => {
        if (activeTab === 'ia') {
            if (iaStage === 'analyzing' || iaStage === 'extracting') return 'max-w-[720px]';
            if (aiLimits && !aiLimits.can_import && !aiLimits.has_bypass && iaStage === 'input') return 'max-w-[720px]';
            if (iaStage === 'selectCargo') return 'max-w-[960px]';
            if (iaStage === 'review') return 'max-w-[960px]';
            return 'max-w-[1040px]';
        }
        return 'max-w-5xl';
    };

    const modalInnerContent = (
        <>
            {inlineMode ? (
                <div className="px-2 pt-6 pb-4 flex items-center shrink-0">
                    <button onClick={handleCloseModal} className="flex items-center gap-2 text-content-muted hover:text-foreground transition-colors font-semibold text-sm">
                        <ArrowLeft size={16} />
                        Voltar
                        <span className="text-foreground ml-2 font-bold hidden sm:inline-block">
                            • {activeTab === 'ready' ? 'Catálogo Oficial' : activeTab === 'ia' ? 'Importar com IA' : 'Criar Manualmente'}
                        </span>
                    </button>
                </div>
            ) : (
                <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0 bg-white dark:bg-[#18181A]">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 tracking-normal border-r border-border/50 dark:border-white/10 pr-3">
                            {activeTab === 'ready'
                                ? 'Catálogo Oficial'
                                : activeTab === 'ia' && iaStage === 'review'
                                    ? 'Resultado da extração'
                                    : activeTab === 'ia'
                                        ? 'Importar com IA'
                                        : 'Criar Manualmente'}
                        </h2>
                        <p className="text-[11px] text-content-muted font-medium italic hidden xl:block max-w-[360px] truncate">
                            {activeTab === 'ready'
                                ? 'Escolha um edital estruturado para começar com mais rapidez.'
                                : activeTab === 'ia' && iaStage === 'review'
                                    ? 'Revise os dados antes de importar.'
                                    : activeTab === 'ia'
                                        ? 'Extraia matérias e tópicos de PDFs ou sites automaticamente.'
                                        : 'Monte sua própria matriz de estudos e organize seu conteúdo do zero.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {aiUsageSummary && (
                            <div className="hidden sm:flex h-8 max-w-[132px] items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 text-[10px] font-black uppercase tracking-[0.08em] text-primary">
                                {loadingAiLimits ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <Sparkles size={12} />
                                )}
                                <span className="truncate whitespace-nowrap">{aiUsageSummary}</span>
                            </div>
                        )}
                        {activeTab === 'ia' && iaStage === 'review' && pendingExtraction?.source === 'db' && (
                            <button
                                type="button"
                                onClick={discardPendingExtractionData}
                                className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 text-[10px] font-bold text-amber-500 transition-colors hover:bg-amber-500/15"
                            >
                                <Trash2 size={12} />
                                Descartar
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary dark:bg-white/5 text-content-muted hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            aria-label="Fechar modal"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className={`${inlineMode ? 'px-2 pb-3' : 'px-5 pt-3'}`}>
                {activeTab === 'ia' && iaStage !== 'input' ? (
                    <ImportJourneyProgress stage={iaStage} onSecondaryAction={handleJourneySecondaryAction} />
                ) : (
                    <ImportMethodSelector value={activeTab} onChange={(method: ImportMethod) => setActiveTab(method)} />
                )}
            </div>
            <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" multiple onChange={handleFileChange} className="hidden" aria-hidden="true" />

            <div className={`${inlineMode ? 'overflow-visible flex-none pb-10 pt-0' : 'overflow-y-auto no-scrollbar flex-1 pt-2 px-5 pb-5'}`}>
                {activeTab === 'ready' ? (
                    <ReadyEditalCatalog
                        editais={editais}
                        userEditalSourceIds={new Set(userEditais.map(ue => ue.sourceId).filter(Boolean) as string[])}
                        loading={loadingEditais}
                        onImportEdital={handleImportReadyEdital}
                        importingEditalId={importingReadyEditalId}
                        onSwitchToIa={() => setActiveTab('ia')}
                        onSwitchToManual={() => setActiveTab('manual')}
                        onOpenSuggest={() => {
                            setShowSuggestSlide(true);
                            setSuggestionSent(false);
                            setSuggestConcurso('');
                        }}
                    />
                ) : activeTab === 'ia' ? (
                    <div className="space-y-6">
                        {loadingPending ? (
                            <div className="flex items-center justify-center py-8 gap-2">
                                <Loader2 size={16} className="animate-spin text-content-muted" />
                                <span className="text-[10px] text-content-muted font-medium">Carregando extração pendente...</span>
                            </div>
                        ) : iaStage === 'input' && !pendingExtraction ? (
                            <AiInputStep
                                aiLimits={aiLimits}
                                iaErrorMessage={iaErrorMessage}
                                getAiErrorHeading={getAiErrorHeading}
                                onClearErrorMessage={() => setIaErrorMessage('')}
                                aiSourceMode={aiSourceMode}
                                onSourceModeChange={setAiSourceMode}
                                pdfFiles={pdfFiles}
                                inputText={inputText}
                                onInputTextChange={setInputText}
                                onSelectFiles={() => pdfInputRef.current?.click()}
                                onRemoveFile={handleRemovePdf}
                                onAnalyze={handleIaImport}
                                showOptionalContext={showOptionalContext}
                                onToggleOptionalContext={setShowOptionalContext}
                                iaBanca={iaBanca}
                                onBancaChange={setIaBanca}
                                iaOrigin={iaOrigin}
                                onOriginChange={setIaOrigin}
                                iaPosition={iaPosition}
                                onCargoChange={(value) => {
                                    setIaPosition(value);
                                    setSelectedCargoName(value);
                                    setSelectedCargoId('');
                                }}
                                onSwitchToReady={() => setActiveTab('ready')}
                                onSwitchToManual={() => setActiveTab('manual')}
                                onCloseModal={handleCloseModal}
                            />
                        ) : null}

                        {(iaStage === 'analyzing' || iaStage === 'extracting') && (
                            <AiProgressStep
                                stage={iaStage}
                                processingMsg={processingMsg}
                                extractionCargoName={selectedCargoName || iaPosition}
                                iaProgress={iaProgress}
                                onCancel={handleJourneySecondaryAction}
                                isGenericCargoName={isGenericCargoName}
                                formatLongDetectedText={formatLongDetectedText}
                            />
                        )}

                        {iaStage === 'selectCargo' && analysisResult && (
                            <AiCargoSelectionStep
                                analysisResult={analysisResult}
                                selectedCargoId={selectedCargoId}
                                selectedCargoName={selectedCargoName}
                                onSelectCargo={(cargoId, cargoName) => {
                                    setSelectedCargoId(cargoId);
                                    setSelectedCargoName(cargoName);
                                    setIaPosition(cargoName);
                                }}
                                iaPosition={iaPosition}
                                iaOrigin={iaOrigin}
                                iaBanca={iaBanca}
                                missingContentSource={missingContentSource}
                                pdfFiles={pdfFiles}
                                onAddFile={() => pdfInputRef.current?.click()}
                                onRemoveFile={handleRemovePdf}
                                iaErrorMessage={iaErrorMessage}
                                getAiErrorHeading={getAiErrorHeading}
                                pendingExtraction={pendingExtraction}
                                onDiscardPending={discardPendingExtractionData}
                                isGenericCargoName={isGenericCargoName}
                                formatLongDetectedText={formatLongDetectedText}
                                hasOnlyGenericCargoAnalysis={hasOnlyGenericCargoAnalysis}
                            />
                        )}

                        {iaStage === 'selectCargo' && analysisResult && (
                            <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 px-6 py-3.5 bg-white/95 dark:bg-[#18181A]/95 backdrop-blur-md border-t border-border/70 dark:border-white/10 flex items-center justify-end gap-3 shadow-lg z-20">
                                <button
                                    type="button"
                                    onClick={handleJourneySecondaryAction}
                                    className="px-5 py-2.5 rounded-xl border border-border dark:border-white/10 text-xs font-bold text-content-muted hover:text-foreground hover:bg-secondary/50 transition-colors"
                                >
                                    Voltar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExtractSelectedCargo}
                                    disabled={!selectedCargoId}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                                >
                                    <Sparkles size={14} />
                                    Extrair Disciplinas
                                </button>
                            </div>
                        )}

                        {iaStage === 'review' && (
                            <AiReviewStep
                                origin={iaOrigin}
                                onOriginChange={setIaOrigin}
                                position={iaPosition}
                                onPositionChange={setIaPosition}
                                year={iaYear}
                                onYearChange={setIaYear}
                                examDate={examDate}
                                onExamDateChange={setExamDate}
                                aiResult={aiResult}
                                onAiResultChange={setAiResult}
                                weightExtractionStatus={weightExtractionStatus}
                                weightBlockInfo={weightBlockInfo}
                                examWeightTotals={aiExamWeightTotals}
                                isSaving={isSavingAi}
                                onConfirmImport={handleSaveAiResult}
                                inlineMode={inlineMode}
                            />
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 w-full pt-0 pb-12">
                        {manualModeChildren || (
                            <ManualEditalForm
                                initialData={{
                                    origin: manualOrigin,
                                    position: manualPosition,
                                    year: manualYear,
                                    examBoard: manualBanca,
                                    examDate,
                                }}
                                isLoading={importingManual}
                                onSubmit={handleSaveManual}
                            />
                        )}
                    </div>
                )}
            </div>

            <EditalSuggestionDrawer
                isOpen={showSuggestSlide}
                onClose={() => setShowSuggestSlide(false)}
                suggestConcurso={suggestConcurso}
                onSuggestConcursoChange={setSuggestConcurso}
                onSendSuggestion={handleSendSuggestion}
                isSending={isSendingSuggestion}
                isSent={suggestionSent}
            />
        </>
    );

    if (inlineMode) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-5xl mx-auto flex flex-col relative min-h-[60vh]"
            >
                {modalInnerContent}
            </motion.div>
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleOutsideModalClick}
                onMouseDown={(event) => event.stopPropagation()}
                className="absolute inset-0 bg-background/78 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                onClick={(event) => event.stopPropagation()}
                className={`relative w-full ${getModalWidthClass()} max-h-[90vh] bg-white dark:bg-[#18181A] border border-zinc-200 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden flex flex-col`}
            >
                {modalInnerContent}
            </motion.div>
        </div>,
        document.body
    );
};
