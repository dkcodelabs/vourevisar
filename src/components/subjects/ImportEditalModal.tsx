import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Sparkles, Loader2, ChevronUp, ChevronDown, Trash2, Save, Plus, X, MessageSquare, CalendarDays, Database, Send, CheckCircle2, AlertTriangle, Eye, ArrowLeft, BookOpen, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Subject } from '@/types';
import { UserEdital } from '@/pages/Editais';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { errorService } from '@/lib/errors/errorService';
import { supabase } from '@/integrations/supabase/client';
import { invokeUserRpc } from '@/services/userRpcService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { mergeRecoveredCesgranrioBasicSubjects, recoverCesgranrioBasicSubjects } from '@/utils/cesgranrioContentStructure';
import { detectCargoOptionsFromEditalText, type DetectedCargoOption } from '@/utils/editalCargoDetector';
import { sliceTextForSubjects } from '@/utils/editalTextSlicer';
import { ImportMethodSelector, type ImportMethod } from '@/components/subjects/import-edital/ImportMethodSelector';
import { AiOptionalContext } from '@/components/subjects/import-edital/AiOptionalContext';
import { AiSourceStep, type AiSourceMode } from '@/components/subjects/import-edital/AiSourceStep';
import { AiContentSourceRecovery } from '@/components/subjects/import-edital/AiContentSourceRecovery';
import { ImportJourneyProgress } from '@/components/subjects/import-edital/ImportJourneyProgress';
import {
    formatExamWeightInputValue,
    getExamWeightTotals,
    getEffectiveSubjectExamWeight,
    getSubjectExamWeightLine,
    parseOptionalExamWeightNumber
} from '@/utils/examWeight';

interface AiTopic {
    name: string;
    selected: boolean;
    position?: number;
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
    typeof value === 'object' && value !== null && !Array.isArray(value) ? value as UnknownRecord : {};

const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error || 'Erro desconhecido');

const getErrorCode = (error: unknown): string | undefined => {
    const code = asRecord(error).code;
    return typeof code === 'string' ? code : undefined;
};

const getArray = (record: UnknownRecord, ...keys: string[]): unknown[] => {
    for (const key of keys) {
        if (Array.isArray(record[key])) return record[key];
    }
    return [];
};

const getString = (record: UnknownRecord, ...keys: string[]): string => {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string') return value;
    }
    return '';
};

const getNullableNumber = (record: UnknownRecord, key: string): number | null =>
    typeof record[key] === 'number' ? record[key] : null;

interface AiSubject {
    id: string;
    title: string;
    knowledgeType?: string | null;
    selected: boolean;
    expanded: boolean;
    weight?: {
        points: number | null;
        questions: number | null;
        percentage: number | null;
        rawText: string | null;
    };
    topics: AiTopic[];
}

type WeightExtractionStatus = 'idle' | 'found' | 'not_found' | 'block_only' | 'ambiguous' | 'failed';

type ExtractedSubjectWeight = {
    subjectId: string;
    points: number | null;
    questions: number | null;
    percentage: number | null;
    rawText: string | null;
};

type ExtractedBlockWeight = {
    blockName?: string | null;
    points?: number | null;
    questions?: number | null;
    percentage?: number | null;
    rawText?: string | null;
};

type WeightExtractionResponse = {
    status?: WeightExtractionStatus;
    subjects?: ExtractedSubjectWeight[];
    blockWeights?: ExtractedBlockWeight[];
    message?: string | null;
};

interface AiEditalAnalysis {
    edital: {
        name: string;
        organ: string | null;
        year: string | null;
        examDate: string | null;
        banca: string | null;
    };
    cargos: Array<{
        id: string;
        name: string;
        rawLabel: string;
        evidence: string;
        label_exibicao?: string | null;
        nome_cargo?: string | null;
        area_codigo?: string | null;
        area_enfase?: string | null;
    }>;
}

interface UserAiLimits {
    plan: string;
    status: string;
    effective_plan?: string;
    effective_status?: string;
    limit: number;
    usage: number;
    total_usage?: number;
    remaining?: number | null;
    usage_period?: 'monthly' | 'lifetime' | string;
    has_bypass: boolean;
    can_import: boolean;
}

interface MappedSubjectAnchor {
    chave: string;
    titulo: string;
    tipo_conhecimento: string;
    ordem: number;
    startHeading: string;
    endHeading?: string | null;
    startAnchor?: string | null;
    endAnchor?: string | null;
    firstTopicAnchor?: string | null;
    lastTopicAnchor?: string | null;
    confidence?: 'high' | 'medium' | 'low';
}

type DocumentPayload = {
    inputText?: string;
    pdfUrl?: string;
    pdfPath?: string;
    pdfFileUri?: string;
    pdfPaths?: string[];
    sourceType: 'text' | 'pdf';
    detectedCargoOptions?: DetectedCargoOption[];
};

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

export const ImportEditalModal = ({ isOpen, onClose, onImport, subjects, userEditais = [], initialTab = 'ready', manualModeChildren, inlineMode = false }: ImportEditalModalProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'ready' | 'ia' | 'manual'>(initialTab);
    const [showSuggestSlide, setShowSuggestSlide] = useState(false);
    const [suggestConcurso, setSuggestConcurso] = useState('');
    const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);
    const [suggestionSent, setSuggestionSent] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [expandedCatalogEditalId, setExpandedCatalogEditalId] = useState<string | null>(null);
    const [expandedCatalogSubjectKeys, setExpandedCatalogSubjectKeys] = useState<Set<string>>(new Set());
    const [iaOrigin, setIaOrigin] = useState('');
    const [iaPosition, setIaPosition] = useState('');
    const [iaBanca, setIaBanca] = useState('');

    // Manual States
    const [manualOrigin, setManualOrigin] = useState('');
    const [manualPosition, setManualPosition] = useState('');
    const [manualBanca, setManualBanca] = useState('');
    const [importingManual, setImportingManual] = useState(false);
    const [manualYear, setManualYear] = useState('');
    const [iaYear, setIaYear] = useState('');
    const [examDate, setExamDate] = useState('');

    // IA States
    const [inputText, setInputText] = useState('');
    const [pdfFiles, setPdfFiles] = useState<File[]>([]);
    const [aiSourceMode, setAiSourceMode] = useState<AiSourceMode>('pdf');
    const [showOptionalContext, setShowOptionalContext] = useState(false);
    const [iaStage, setIaStage] = useState<'input' | 'analyzing' | 'selectCargo' | 'extracting' | 'review'>('input');
    const [iaEditalName, setIaEditalName] = useState('');
    const [aiResult, setAiResult] = useState<AiSubject[]>([]);
    const [isSavingAi, setIsSavingAi] = useState(false);
    const [processingMsg, setProcessingMsg] = useState('Analisando edital com IA...');
    const [iaProgress, setIaProgress] = useState(0);
    const [pendingExtraction, setPendingExtraction] = useState<{ id: string; editalName: string; updatedAt: string; source: 'db' | 'fresh' } | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AiEditalAnalysis | null>(null);
    const [selectedCargoId, setSelectedCargoId] = useState('');
    const [selectedCargoName, setSelectedCargoName] = useState('');
    const [sourcePayload, setSourcePayload] = useState<DocumentPayload | null>(null);
    const [loadingPending, setLoadingPending] = useState(false);
    const [iaErrorMessage, setIaErrorMessage] = useState('');
    const [missingContentSource, setMissingContentSource] = useState<{ message: string; originalFileCount: number } | null>(null);
    const [, setShowIaDataEditor] = useState(false);
    const [weightExtractionStatus, setWeightExtractionStatus] = useState<WeightExtractionStatus>('idle');
    const [weightBlockInfo, setWeightBlockInfo] = useState<ExtractedBlockWeight[]>([]);
    const [closeAttentionPulse, setCloseAttentionPulse] = useState(false);
    const iaFlowCancelledRef = useRef(false);
    const pdfInputRef = useRef<HTMLInputElement | null>(null);

    // IA Limits & Quota States
    const [aiLimits, setAiLimits] = useState<UserAiLimits | null>(null);
    const [loadingAiLimits, setLoadingAiLimits] = useState(false);

    // Legacy complement mode states (kept for compatibility)
    const [isComplementMode, setIsComplementMode] = useState(false);
    const [selectedEditalToComplement, setSelectedEditalToComplement] = useState<string | null>(null);
    const [iaComplementSubjectName, setIaComplementSubjectName] = useState('');
    const [manualComplementSubjectName, setManualComplementSubjectName] = useState('');
    const [manualComplementTopics, setManualComplementTopics] = useState('');
    // Filter user editais (not from public catalog)
    const userCreatedEditais = userEditais.filter(e => !e.sourceId);

    const resolveCargoIdFromAnalysis = (analysis: AiEditalAnalysis | null, cargoName?: string | null) => {
        if (!analysis?.cargos?.length) return '';
        if (!cargoName) return analysis.cargos[0].id;
        const normalizedCargoName = cargoName.trim().toLowerCase();
        const matched = analysis.cargos.find(cargo =>
            cargo.id === cargoName ||
            cargo.name.trim().toLowerCase() === normalizedCargoName ||
            (cargo.label_exibicao || '').trim().toLowerCase() === normalizedCargoName
        );
        return matched?.id || analysis.cargos[0].id;
    };

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

    const isGenericCargoName = (value?: string | null) => {
        const normalized = String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
        return !normalized || ['cargo unico', 'cargo único', 'cargo', 'sem cargo'].includes(normalized);
    };

    const formatLongDetectedText = (value?: string | null) => {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        if (!text) return '';

        const letters = text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
        const uppercaseLetters = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, '');
        const isMostlyUppercase = letters.length > 12 && uppercaseLetters.length / letters.length > 0.75;
        if (!isMostlyUppercase) return text;

        const lower = text.toLocaleLowerCase('pt-BR');
        return lower
            .replace(/^\s*[a-zà-öø-ÿ]/, match => match.toLocaleUpperCase('pt-BR'))
            .replace(/([.!?]\s+)([a-zà-öø-ÿ])/g, (_, prefix, char) => `${prefix}${char.toLocaleUpperCase('pt-BR')}`);
    };

    const shouldOpenIaDataEditor = (analysis: AiEditalAnalysis | null, cargoName?: string | null) => {
        if (!analysis) return false;
        return Boolean(
            iaErrorMessage ||
            !analysis.edital?.banca ||
            !analysis.edital?.organ ||
            isGenericCargoName(cargoName || analysis.cargos?.[0]?.name)
        );
    };

    const hasManualCargoTarget = () => false;

    const hasOnlyGenericCargoAnalysis = () => {
        if (!analysisResult?.cargos?.length) return false;
        return analysisResult.cargos.length === 1 && isGenericCargoName(analysisResult.cargos[0]?.name);
    };

    // State for dynamic editais from database
    interface ReadyEdital {
        id: string;
        name: string;
        organ: string;
        origin?: string;
        position: string;
        year?: string;
        status?: string;
        subjects: {
            id?: string;
            name: string;
            color?: string;
            priority?: number;
            topics: { id?: string; name: string }[];
        }[];
        category?: string;
        exam_date?: string;
        exam_board?: string | null;
        published_at?: string;
        updated_at?: string | null;
    }
    const [editais, setEditais] = useState<ReadyEdital[]>([]);
    const [loadingEditais, setLoadingEditais] = useState(true);
    const [importingReadyEditalId, setImportingReadyEditalId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPublicEditais = async () => {
            try {
                const { data, error } = await supabase
                    .from('public_editais')
                    .select('*')
                    .eq('is_public', true)
                    .order('created_at', { ascending: false });
                
                if (!error && data) {
                    setEditais(data as ReadyEdital[]);
                }
            } catch (err) {
                console.error('Error fetching global editais:', err);
            } finally {
                setLoadingEditais(false);
            }
        };

        if (isOpen) {
            fetchPublicEditais();
        }
    }, [isOpen]);

    const filteredEditais = editais.filter(e => {
        const matchesSearch = `${e.organ} ${e.position}`.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'Todos' || e.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleToggleCatalogEdital = (editalId: string) => {
        setExpandedCatalogEditalId(prev => prev === editalId ? null : editalId);
    };

    const handleToggleCatalogSubject = (subjectKey: string) => {
        setExpandedCatalogSubjectKeys(prev => {
            const next = new Set(prev);
            if (next.has(subjectKey)) {
                next.delete(subjectKey);
            } else {
                next.add(subjectKey);
            }
            return next;
        });
    };

    const fetchAiLimits = async () => {
        if (!user) return;
        setLoadingAiLimits(true);
        try {
            let rpcLimits: UserAiLimits | null = null;
            let rpcError: unknown = null;
            try {
                rpcLimits = await invokeUserRpc<UserAiLimits | null>('get_user_ai_limits', { p_user_id: user.id });
            } catch (error) {
                rpcError = error;
            }

            if (!rpcError && rpcLimits) {
                const parsed = rpcLimits;
                let totalUsage: number | undefined;

                if (parsed.has_bypass) {
                    const { count: totalCount } = await supabase
                        .from('user_editais')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .eq('ai_extraction_used', true);
                    totalUsage = totalCount || 0;
                }

                setAiLimits({
                    ...parsed,
                    total_usage: totalUsage,
                    remaining: parsed.limit === -1 ? null : Math.max((parsed.remaining ?? parsed.limit - parsed.usage), 0),
                });
                return;
            }

            console.error('[ImportEditalModal] Não foi possível verificar a cota de IA:', getErrorMessage(rpcError));
            setAiLimits(null);
            toastGate.notifyError('Não foi possível verificar sua cota de IA. Atualize a página e tente novamente.', 'IA-QUOTA-01');
        } catch (err) {
            console.error("Falha ao buscar limites da IA:", err);
        } finally {
            setLoadingAiLimits(false);
        }
    };

    const loadPendingExtraction = async () => {
        if (!user) return;
        setLoadingPending(true);
        try {
            const { data, error } = await supabase
                .from('pending_ai_extractions')
                .select('id, edital_name, updated_at, ai_result, analysis_result, selected_cargo, source_type, pdf_url, source_files, origin, position, year')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (data && !error) {
                const storedAiResult = Array.isArray(data.ai_result) ? data.ai_result : [];
                const storedAnalysis = data.analysis_result || null;
                const storedCargoName = data.selected_cargo || data.position || '';
                let restoredAiResult = storedAiResult;
                let restoredSourcePayload: DocumentPayload | null = null;

                if (storedAiResult.length === 0 && !storedAnalysis?.cargos?.length) {
                    await supabase
                        .from('pending_ai_extractions')
                        .delete()
                        .eq('id', data.id);
                    return;
                }

                setPendingExtraction({
                    id: data.id,
                    editalName: data.edital_name,
                    updatedAt: data.updated_at,
                    source: 'db'
                });
                if (data.source_type || data.pdf_url || data.source_files) {
                    const storedPdfRef = data.pdf_url || undefined;
                    const storedPdfPaths = Array.isArray(data.source_files)
                        ? data.source_files.filter((value): value is string => typeof value === 'string')
                        : [];
                    restoredSourcePayload = {
                        sourceType: data.source_type === 'pdf' ? 'pdf' : 'text',
                        pdfUrl: storedPdfRef?.startsWith('http') ? storedPdfRef : undefined,
                        pdfPath: storedPdfRef && !storedPdfRef.startsWith('http') ? storedPdfRef : undefined,
                        pdfPaths: storedPdfPaths.length ? storedPdfPaths : undefined
                    };
                }

                if (storedAiResult.length > 0 && restoredSourcePayload && storedCargoName) {
                    const hydratedPayload = await hydrateDocumentPayloadText(restoredSourcePayload);
                    restoredSourcePayload = hydratedPayload;
                    const repairedAiResult = mergeRecoveredCesgranrioBasicAiSubjects(
                        storedAiResult,
                        hydratedPayload.inputText,
                        storedCargoName
                    );

                    if (repairedAiResult.length !== storedAiResult.length) {
                        restoredAiResult = repairedAiResult;
                        await supabase
                            .from('pending_ai_extractions')
                            .update({ ai_result: repairedAiResult })
                            .eq('id', data.id);
                    }
                }

                setAiResult(restoredAiResult);
                setAnalysisResult(storedAnalysis);
                setSelectedCargoName(storedCargoName);
                setSelectedCargoId(resolveCargoIdFromAnalysis(storedAnalysis, storedCargoName));
                if (restoredSourcePayload) setSourcePayload(restoredSourcePayload);
                setIaEditalName(data.edital_name);
                const pendingExamDate = data.analysis_result?.edital?.examDate || data.analysis_result?.edital?.exam_date;
                if (data.origin || data.analysis_result?.edital?.organ) setIaOrigin(data.origin || data.analysis_result.edital.organ);
                if (data.analysis_result?.edital?.banca) setIaBanca(data.analysis_result.edital.banca);
                if (data.position) setIaPosition(data.position);
                setIaYear(data.year || data.analysis_result?.edital?.year || '');
                if (pendingExamDate) setExamDate(pendingExamDate);
                setIaStage(restoredAiResult.length ? 'review' : storedAnalysis?.cargos?.length ? 'selectCargo' : 'input');
                setShowIaDataEditor(shouldOpenIaDataEditor(storedAnalysis, storedCargoName));
            }
        } catch (err: unknown) {
            console.error('[loadPending] catch error:', getErrorCode(err), getErrorMessage(err));
        } finally {
            setLoadingPending(false);
        }
    };

    useEffect(() => {
        if (isOpen && activeTab === 'ia') {
            fetchAiLimits();
            loadPendingExtraction();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, activeTab]);

    const getProgressTarget = useCallback((stage: typeof iaStage, message: string) => {
        const normalized = message.toLowerCase();
        if (stage === 'analyzing') {
            if (normalized.includes('extraindo cargos')) return 88;
            if (normalized.includes('identificando cargos')) return 66;
            if (normalized.includes('lendo edital') || normalized.includes('lendo o documento')) return 24;
            return 24;
        }
        if (stage === 'extracting') {
            if (normalized.includes('organizando resultado')) return 94;
            if (normalized.includes('validando estrutura')) return 91;
            if (normalized.includes('finalizando')) return 92;
            if (normalized.includes('buscando peso')) return 90;
            if (normalized.includes('preparando revisão')) return 86;
            if (normalized.includes('mapeando tópicos')) return 82;
            if (normalized.includes('identificando disciplinas')) return 64;
            if (normalized.includes('separando conhecimentos')) return 46;
            if (normalized.includes('localizando conteúdo')) return 31;
            return 22;
        }
        return 0;
    }, []);

    useEffect(() => {
        if (iaStage !== 'analyzing' && iaStage !== 'extracting') return;

        const target = getProgressTarget(iaStage, processingMsg);
        const interval = window.setInterval(() => {
            setIaProgress(prev => {
                if (prev >= target) return prev;
                const distance = target - prev;
                return Math.min(target, prev + Math.max(0.6, distance * 0.08));
            });
        }, 120);

        return () => window.clearInterval(interval);
    }, [getProgressTarget, iaStage, processingMsg]);

    const savePendingExtraction = async (
        editalName: string,
        results: AiSubject[],
        options?: {
            analysis?: AiEditalAnalysis | null;
            selectedCargo?: string | null;
            source?: DocumentPayload | null;
        }
    ) => {
        if (!user) return;
        try {
            const { data: existing } = await supabase
                .from('pending_ai_extractions')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            const payload = {
                user_id: user.id,
                edital_name: editalName,
                origin: options?.analysis?.edital?.organ || iaOrigin || null,
                position: (options?.selectedCargo ?? selectedCargoName ?? iaPosition) || null,
                year: options?.analysis?.edital?.year || iaYear || null,
                ai_result: results,
                analysis_result: options?.analysis ?? analysisResult,
                selected_cargo: (options?.selectedCargo ?? selectedCargoName) || null,
                source_type: options?.source?.sourceType ?? sourcePayload?.sourceType ?? null,
                pdf_url: options?.source?.pdfPath ?? options?.source?.pdfUrl ?? sourcePayload?.pdfPath ?? sourcePayload?.pdfUrl ?? null,
                source_files: options?.source?.pdfPaths ?? sourcePayload?.pdfPaths ?? []
            };

            if (existing) {
                await supabase
                    .from('pending_ai_extractions')
                    .update(payload)
                    .eq('id', existing.id);
                setPendingExtraction({
                    id: existing.id,
                    editalName,
                    updatedAt: new Date().toISOString(),
                    source: 'fresh'
                });
            } else {
                const { data: inserted } = await supabase
                    .from('pending_ai_extractions')
                    .insert(payload)
                    .select('id')
                    .single();
                if (inserted?.id) {
                    setPendingExtraction({
                        id: inserted.id,
                        editalName,
                        updatedAt: new Date().toISOString(),
                        source: 'fresh'
                    });
                }
            }
        } catch (err: unknown) {
            console.error('[savePending] catch error:', getErrorCode(err), getErrorMessage(err));
        }
    };

    const isGenericEditalName = (value?: string | null) => {
        const normalized = String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
        return !normalized || ['edital', 'edital analisado por ia', 'edital importado por ia'].includes(normalized);
    };

    const discardPendingExtractionData = async () => {
        if (pendingExtraction && user && pendingExtraction.id && !pendingExtraction.id.startsWith('pending-')) {
            try {
                await supabase
                    .from('pending_ai_extractions')
                    .delete()
                    .eq('id', pendingExtraction.id);
            } catch (err: unknown) {
                console.warn('[discardPending]', getErrorCode(err) ?? getErrorMessage(err));
            }
        }
        setPendingExtraction(null);
        setAiResult([]);
        setAnalysisResult(null);
        setSelectedCargoId('');
        setSelectedCargoName('');
        setSourcePayload(null);
        setIaEditalName('');
        setIaStage('input');
        setIaOrigin('');
        setIaPosition('');
        setIaBanca('');
        setShowIaDataEditor(false);
        setInputText('');
        setPdfFiles([]);
        setAiSourceMode('pdf');
        setShowOptionalContext(false);
        setExamDate('');
        setMissingContentSource(null);
    };

    const handleCloseModal = async () => {
        if (activeTab === 'ia' && ['analyzing', 'extracting'].includes(iaStage)) {
            iaFlowCancelledRef.current = true;
        }

        onClose();
    };

    const handleOutsideModalClick = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setCloseAttentionPulse(true);
        window.setTimeout(() => setCloseAttentionPulse(false), 900);
    };

    const resetPendingState = useCallback(() => {
        setPendingExtraction(null);
        setAiResult([]);
        setAnalysisResult(null);
        setSelectedCargoId('');
        setSelectedCargoName('');
        setSourcePayload(null);
        setIaEditalName('');
        setIaStage('input');
        setIaOrigin('');
        setIaPosition('');
        setIaBanca('');
        setShowIaDataEditor(false);
        setInputText('');
        setPdfFiles([]);
        setAiSourceMode('pdf');
        setShowOptionalContext(false);
        setExamDate('');
        setMissingContentSource(null);
    }, []);

    useEffect(() => {
        setActiveTab(initialTab);
        if (!isOpen) {
            resetPendingState();
        }
    }, [initialTab, isOpen, resetPendingState]);

    const handleOpenSuggest = () => {
        setSuggestConcurso(searchQuery.trim());
        setSuggestionSent(false);
        setShowSuggestSlide(true);
    };

    const handleSendSuggestion = async () => {
        if (!suggestConcurso.trim()) return;
        setIsSendingSuggestion(true);
        try {
            await supabase
                .from('edital_suggestions')
                .insert({
                    user_id: user?.id,
                    concurso: suggestConcurso.trim().toUpperCase(),
                    status: 'pending'
                });
            setSuggestionSent(true);
        } catch (err) {
            console.error('Erro ao enviar sugestão:', err);
        } finally {
            setIsSendingSuggestion(false);
        }
    };

    const extractSelectedPdfText = async (files: File[]) => {
        const { extractPdfText } = await import('@/utils/pdfTextExtractor');
        const extracted = await Promise.all(files.map(async (file, index) => {
            try {
                const result = await extractPdfText(file);
                console.log('[pdfTextExtractor] Métricas de qualidade:', { file: file.name, ...result.metrics });
                if (result.metrics.extractionQuality === 'poor' && result.fullText.length < 1000) return '';
                return `\n\n===== DOCUMENTO ${index + 1}: ${file.name} =====\n\n${result.fullText}`;
            } catch (error) {
                console.warn('[pdfTextExtractor] Falha na leitura local:', file.name, error);
                return '';
            }
        }));
        return extracted.filter(Boolean).join('').trim();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(event.target.files || []);
        event.target.value = '';
        if (!selected.length) return;

        const invalidType = selected.find(file => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
        if (invalidType) {
            toastGate.notifyError('Apenas arquivos PDF são aceitos.', 'PDF-02', { severity: 'low' });
            return;
        }
        const oversized = selected.find(file => file.size > 5 * 1024 * 1024);
        if (oversized) {
            toastGate.notifyError(`O arquivo ${oversized.name} excede 5 MB.`, 'PDF-01', { severity: 'low' });
            return;
        }

        const uniqueFiles = [...pdfFiles, ...selected].filter((file, index, all) =>
            all.findIndex(candidate => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified) === index
        );
        if (uniqueFiles.length > 4) {
            toastGate.notifyError('Envie no máximo 4 documentos por importação.', 'PDF-03', { severity: 'low' });
            return;
        }

        setPdfFiles(uniqueFiles);
        setAiSourceMode('pdf');
        setSourcePayload(null);
        setAiResult([]);
        setIaErrorMessage('');
        const extractedText = await extractSelectedPdfText(uniqueFiles);
        setInputText(extractedText);
    };

    const handleRemovePdf = async (index: number) => {
        const remaining = pdfFiles.filter((_, fileIndex) => fileIndex !== index);
        setPdfFiles(remaining);
        setSourcePayload(null);
        setIaErrorMessage('');
        setInputText(remaining.length ? await extractSelectedPdfText(remaining) : '');
    };

    const handleImportMethodChange = (method: ImportMethod) => {
        setActiveTab(method);
    };

    const handleJourneySecondaryAction = () => {
        if (iaStage === 'analyzing' || iaStage === 'extracting') {
            iaFlowCancelledRef.current = true;
            setIaStage(analysisResult ? 'selectCargo' : 'input');
            return;
        }

        if (iaStage === 'review') {
            setIaStage('selectCargo');
            return;
        }

        setIaStage('input');
    };

    const repairJson = (jsonStr: string): string => {
        let result = "";
        let inString = false;
        let escaped = false;
        const stack: string[] = [];

        for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i];
            
            if (escaped) {
                result += char;
                escaped = false;
                continue;
            }

            if (char === '\\') {
                result += char;
                escaped = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                result += char;
                continue;
            }

            if (inString) {
                // JSON.parse error: Bad control character in string literal
                // Escapa TODOS os caracteres de controle (0x00-0x1F)
                const code = char.charCodeAt(0);
                if (code <= 0x1F) {
                    if (char === '\n') result += '\\n';
                    else if (char === '\r') result += '\\r';
                    else if (char === '\t') result += '\\t';
                    else result += '\\u' + code.toString(16).padStart(4, '0');
                } else {
                    result += char;
                }
                continue;
            }

            if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}') stack.pop();
            else if (char === ']') stack.pop();
            
            result += char;
        }

        // Se terminou dentro de uma string, fecha a aspa
        if (inString) result += '"';

        // Remove vírgula pendente (ex: {"a": 1, )
        result = result.trim().replace(/,\s*$/, "");

        // Fecha tudo que sobrou na pilha
        while (stack.length > 0) {
            result += stack.pop();
        }

        return result;
    };

    const extractJsonFromText = (text: string): AiSubject[] => {
        let sanitized = text.trim();
        
        // Se a IA colocar entre ```json ... ```, extraímos apenas o conteúdo
        const jsonMatch = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            sanitized = jsonMatch[1];
        }

        // Se a resposta não começa com { ou [, não é JSON válido
        const trimmed = sanitized.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            throw new Error(`Resposta da IA não contém JSON válido. A IA pode ter ignorado o prompt. Tente usar texto mais limpo ou um PDF diferente.`);
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(sanitized);
        } catch (initialError) {
            try {
                const repaired = repairJson(sanitized);
                parsed = JSON.parse(repaired);
            } catch (repairError) {
                const harvested: AiSubject[] = [];
                const subjectRegex = /["'](?:title|t)["']\s*:\s*["']([^"']+)["']\s*,\s*["'](?:topics|p)["']\s*:\s*\[([\s\S]*?)\]/g;
                let match;
                
                while ((match = subjectRegex.exec(sanitized)) !== null) {
                    const title = match[1];
                    const topicsText = match[2];
                    const topicRegex = /["'](?:name|n)["']\s*:\s*["']([^"']+)["']/g;
                    let topicMatch;
                    const topics: AiTopic[] = [];
                    while ((topicMatch = topicRegex.exec(topicsText)) !== null) {
                        const cleanName = topicMatch[1].trim().replace(/\s+/g, ' ');
                        if (cleanName.length >= 2) {
                            topics.push({ name: cleanName, selected: true });
                        }
                    }
                    if (topics.length > 0) {
                        harvested.push({ 
                            id: `harvest-${harvested.length}-${Date.now()}`,
                            title: cleanSubjectTitle(title),
                            topics, 
                            selected: true,
                            expanded: false
                        });
                    }
                }

                if (harvested.length > 0) {
                    return harvested;
                }

                throw new Error("A IA retornou um formato inesperado. Tente simplificar o texto do edital.");
            }
        }

        try {
            // 3. Normalização da Estrutura (Aceita formato Full ou Minified)
            const parsedRecord = asRecord(parsed);
            const rawData = parsedRecord.s || parsedRecord.subjects || parsed;
            const rawSubjects = Array.isArray(rawData) ? rawData : [];

            const extractPosition = (name: string): { position: number; cleanName: string } => {
                const trimmed = name.trim();
                // Regex para numeração decimal: 1., 1.1., 1.2.3 etc.
                const match = trimmed.match(/^(\d+(?:\.\d+)*)\s*[.)]?\s*(.+)$/);
                
                if (match) {
                    const numberPart = match[1];
                    const textPart = match[2];
                    
                    // Converte "1.1.2" em um valor numérico para ordenação (ex: 1.12)
                    // Multiplicamos cada nível por uma potência de 0.1
                    const parts = numberPart.split('.');
                    let weight = 0;
                    parts.forEach((p, i) => {
                        weight += parseInt(p, 10) * Math.pow(0.1, i * 2);
                    });

                    return { 
                        position: weight, 
                        cleanName: trimmed 
                    };
                }
                return { position: 0, cleanName: trimmed };
            };

            const result = rawSubjects.map((rawSubject, idx): AiSubject => {
                const subject = asRecord(rawSubject);
                return {
                id: `ia-${idx}-${Date.now()}`,
                title: cleanSubjectTitle(getString(subject, 't', 'title', 'disciplina')),
                knowledgeType: getString(subject, 'tipo', 'type') || null,
                expanded: false,
                topics: getArray(subject, 'p', 'topics', 'topicos').map((rawTopic, tIdx): AiTopic => {
                    const topic = asRecord(rawTopic);
                    const rawName = typeof rawTopic === 'string' ? rawTopic : getString(topic, 'n', 'name');
                    const { position, cleanName } = extractPosition(rawName);
                    return {
                        name: cleanName,
                        selected: true,
                        position: position > 0 ? position : tIdx
                    };
                }).filter((t: AiTopic) => {
                    const clean = t.name.trim().replace(/\s+/g, ' ');
                    return clean.length >= 2;
                }),
                selected: true
            };
            });
            return result;
        } catch (normError) {
            console.error("Erro na normalização do JSON:", normError);
            return [];
        }
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const startProgressHints = (hints: Array<{ delay: number; message: string }>) => {
        const timers = hints.map(({ delay, message }) => window.setTimeout(() => {
            setProcessingMsg(message);
        }, delay));
        return () => timers.forEach(timer => window.clearTimeout(timer));
    };

    const getFunctionErrorMessage = async (error: unknown, response?: Response) => {
        const context = asRecord(error).context;
        const errorResponse = response || (context instanceof Response ? context : undefined);
        if (errorResponse) {
            try {
                const body: unknown = await errorResponse.clone().json();
                const bodyRecord = asRecord(body);
                const message = getString(bodyRecord, 'error', 'message') || JSON.stringify(body);
                const code = getString(bodyRecord, 'code');
                return code ? `${code}: ${message}` : message;
            } catch {
                try {
                    const text = await errorResponse.clone().text();
                    if (text) return text;
                } catch {
                    // Mantem fallback abaixo.
                }
            }
        }
        return getErrorMessage(error);
    };

    const getFriendlyAiExtractionError = (message: string) => {
        const normalized = message.toLowerCase();

        if (message.includes('EDITAL_CONTENT_SOURCE_MISSING')) {
            return message.replace('EDITAL_CONTENT_SOURCE_MISSING:', '').trim();
        }

        // 1. Tratar cota comercial do estudante excedida
        if (message.includes('AI_LIMIT_EXCEEDED') || normalized.includes('esgotou seu limite') || normalized.includes('cota comercial')) {
            return message.replace('AI_LIMIT_EXCEEDED:', '').trim();
        }

        // 2. Tratar disjuntor global diário (circuit breaker)
        if (message.includes('AI_CIRCUIT_BREAKER_TRIGGERED') || normalized.includes('manutencao devido a alta demanda global')) {
            return 'O extrator por IA está temporariamente em manutenção devido à altíssima demanda hoje. Por favor, utilize a criação manual ou nosso catálogo oficial (100% gratuitos).';
        }

        if (
            normalized.includes('429') ||
            normalized.includes('quota') ||
            normalized.includes('limite') ||
            normalized.includes('rate-limit') ||
            normalized.includes('rate limit') ||
            normalized.includes('rate limited') ||
            normalized.includes('exceeded')
        ) {
            return 'A IA ficou temporariamente indisponível para novas extrações. Tente novamente em alguns minutos.';
        }

        if (normalized.includes('failed to fetch') || normalized.includes('network') || normalized.includes('internet')) {
            return 'Não consegui conectar com a IA agora. Confira sua conexão e tente novamente.';
        }

        return 'Não consegui concluir a extração agora. Tente novamente ou revise os dados do edital antes de extrair.';
    };

    const isAiRateLimitMessage = (message: string) => {
        const normalized = message.toLowerCase();
        return (
            normalized.includes('ai_rate_limited') ||
            normalized.includes('429') ||
            normalized.includes('limite de tentativas') ||
            normalized.includes('rate-limit') ||
            normalized.includes('rate limit') ||
            normalized.includes('rate limited')
        );
    };

    const isMissingContentSourceMessage = (message: string) => (
        message.includes('EDITAL_CONTENT_SOURCE_MISSING')
    );

    const getAiErrorHeading = () => (
        iaErrorMessage.toLowerCase().includes('conteúdo programático')
            ? 'O conteúdo programático não está neste arquivo.'
            : 'Não consegui concluir a extração agora.'
    );

    const buildDocumentPayload = async () => {
        const payload: DocumentPayload = { sourceType: 'text' };

        if (aiSourceMode === 'pdf' && pdfFiles.length > 0) {
            if (!user?.id) {
                throw new Error('Sua sessão expirou. Faça login novamente para enviar o PDF.');
            }

            setProcessingMsg(pdfFiles.length > 1 ? 'Lendo edital e anexos...' : 'Lendo o documento...');
            const uploadedPaths: string[] = [];
            for (const file of pdfFiles) {
                const safeFileName = file.name
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9._-]/g, '-')
                    .replace(/-+/g, '-')
                    .toLowerCase();
                const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeFileName || 'edital.pdf'}`;
                const { error: uploadError } = await supabase.storage
                    .from('temporary_editais')
                    .upload(fileName, file, { contentType: 'application/pdf', upsert: false });
                if (uploadError) {
                    console.error('Erro no upload:', uploadError);
                    throw new Error(`Falha ao enviar ${file.name} para o armazenamento temporário.`);
                }
                uploadedPaths.push(fileName);
            }

            if (inputText.trim()) {
                payload.inputText = inputText;
            }
            payload.pdfPath = uploadedPaths[0];
            payload.pdfPaths = uploadedPaths;
            payload.sourceType = 'pdf';
            return payload;
        }

        if (inputText.trim()) {
            payload.inputText = inputText;
            payload.sourceType = 'text';
            return payload;
        }

        throw new Error('Forneça um arquivo PDF ou o texto do edital.');
    };

    const getInputTextForFunction = (payload: DocumentPayload) => {
        if (payload.pdfPaths && payload.pdfPaths.length > 1 && payload.inputText?.trim()) return payload.inputText;
        if (payload.pdfFileUri || payload.pdfPath || payload.pdfUrl) return undefined;
        return payload.inputText?.trim() ? payload.inputText : undefined;
    };

    const hydrateDocumentPayloadText = async (payload: DocumentPayload): Promise<DocumentPayload> => {
        const paths = payload.pdfPaths?.length ? payload.pdfPaths : payload.pdfPath ? [payload.pdfPath] : [];
        if (payload.inputText?.trim() || !paths.length) return payload;

        try {
            const { extractPdfText } = await import('@/utils/pdfTextExtractor');
            const extracted = await Promise.all(paths.map(async (path, index) => {
                const { data, error } = await supabase.storage.from('temporary_editais').download(path);
                if (error || !data) {
                    console.warn('[pdfTextExtractor] Não foi possível recuperar PDF pendente.', path, error);
                    return '';
                }
                const result = await extractPdfText(data);
                return result.fullText.trim().length >= 1000
                    ? `\n\n===== DOCUMENTO ${index + 1} =====\n\n${result.fullText}`
                    : '';
            }));
            const fullText = extracted.filter(Boolean).join('').trim();
            if (fullText) return {
                ...payload,
                inputText: fullText,
                detectedCargoOptions: payload.detectedCargoOptions || detectCargoOptionsFromEditalText(fullText)
            };
        } catch (err) {
            console.warn('[pdfTextExtractor] Falha ao reconstruir texto dos PDFs pendentes.', err);
        }

        return payload;
    };

    const getDetectedCargoOptionsForFunction = (payload: DocumentPayload) => {
        if (payload.detectedCargoOptions) return payload.detectedCargoOptions;
        const detected = detectCargoOptionsFromEditalText(payload.inputText || '');
        payload.detectedCargoOptions = detected;
        return detected;
    };

    const getManualWeightRawText = () => {
        return 'Informado manualmente pelo aluno na revisão da importação';
    };

    const getAiSubjectWeightAdapter = (subject: AiSubject) => ({
        exam_weight_points: subject.weight?.points ?? null,
        exam_weight_questions: subject.weight?.questions ?? null,
        exam_weight_percentage: subject.weight?.percentage ?? null,
        exam_weight_raw: subject.weight?.rawText ?? null
    });

    const getAiSubjectWeightHelpText = (subject: AiSubject) => {
        const weight = getAiSubjectWeightAdapter(subject);
        const effectiveWeight = getEffectiveSubjectExamWeight(weight);

        if (effectiveWeight.source === 'none') {
            if (weightExtractionStatus === 'block_only') {
                return 'O edital trouxe peso para o bloco de conhecimentos, mas não separou peso por disciplina. Confira o bloco no edital antes de preencher manualmente.';
            }

            return 'Peso não identificado. Preencha apenas se constar no edital.';
        }

        if (effectiveWeight.source === 'points') {
            return 'Pontos representam o total da matéria na prova. Confira no edital antes de salvar.';
        }

        if (effectiveWeight.source === 'percentage') {
            return 'Percentual representa a participação da matéria na prova. Confira no edital antes de salvar.';
        }

        return 'A IA identificou apenas a quantidade de questões. Confira no edital e informe os pontos se houver.';
    };

    const aiExamWeightTotals = useMemo(
        () => getExamWeightTotals(aiResult.filter(subject => subject.selected).map(getAiSubjectWeightAdapter)),
        [aiResult]
    );

    function formatBlockWeightInfo(block: ExtractedBlockWeight) {
        const parts = [
            block.questions != null ? `${formatExamWeightInputValue(block.questions)} questões` : null,
            block.points != null ? `${formatExamWeightInputValue(block.points)} pontos` : null,
            block.percentage != null ? `${formatExamWeightInputValue(block.percentage)}%` : null
        ].filter(Boolean);

        return `${block.blockName || 'Bloco do edital'}${parts.length ? `: ${parts.join(' · ')}` : ''}`;
    }

    const extractionCargoName = useMemo(() => {
        const selectedCargo = analysisResult?.cargos?.find(cargo => cargo.id === selectedCargoId);
        return (
            iaPosition ||
            selectedCargoName ||
            selectedCargo?.label_exibicao ||
            selectedCargo?.name ||
            ''
        ).trim();
    }, [analysisResult?.cargos, iaPosition, selectedCargoId, selectedCargoName]);

    const extractionCargoLabel = selectedCargoId ? 'Cargo selecionado' : 'Cargo informado';

    const getCurrentAiEditalName = () => {
        const visibleCargo = (iaPosition || selectedCargoName).trim();
        if (!visibleCargo) return iaEditalName.trim() || 'Edital Importado por IA';

        const rawBase = iaOrigin.trim() || iaEditalName.trim() || analysisResult?.edital?.name || 'Edital';
        const withoutYear = rawBase.replace(/\s*\([^)]*\)\s*$/, '').trim();
        const baseWithoutCargo = withoutYear.includes(' - ')
            ? withoutYear.slice(0, withoutYear.lastIndexOf(' - ')).trim()
            : withoutYear;
        const baseName = baseWithoutCargo || 'Edital';

        return `${baseName} - ${visibleCargo}${iaYear.trim() ? ` (${iaYear.trim()})` : ''}`;
    };

    const applyAnalysisToForm = (analysis: AiEditalAnalysis) => {
        const edital = analysis.edital;
        if (edital.organ) setIaOrigin(edital.organ);
        if (edital.year) setIaYear(edital.year);
        if (edital.examDate) setExamDate(edital.examDate);
        if (edital.name) setIaEditalName(edital.name);
        if (edital.banca) setIaBanca(edital.banca);
    };

    const cleanSubjectTitle = (value: unknown) => {
        const title = String(value || '').replace(/\s+/g, ' ').trim();
        return title.replace(/\s*[:;.-]\s*$/g, '').trim() || 'Sem Título';
    };

    const mapExtractionToAiSubjects = (extraction: unknown): AiSubject[] => {
        const extractionRecord = asRecord(extraction);
        const rawSubjects = getArray(extractionRecord, 'subjects', 'conteudo');
        const normalizeKnowledgeType = (value: unknown): string | null => {
            const normalized = String(value || '').trim();
            if (!normalized) return null;
            const ascii = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            if (ascii.includes('basico')) return 'Conhecimentos Básicos';
            if (ascii.includes('especifico')) return 'Conhecimentos Específicos';
            if (ascii.includes('geral')) return 'Geral';
            return normalized;
        };

        return rawSubjects.map((rawSubject, idx): AiSubject => {
            const subject = asRecord(rawSubject);
            const rawTopics = getArray(subject, 'topics', 'topicos');
            const weight = asRecord(subject.weight);
            return {
                id: `ia-${idx}-${Date.now()}`,
                title: cleanSubjectTitle(getString(subject, 'title', 'name', 'disciplina')),
                knowledgeType: normalizeKnowledgeType(subject.type || subject.tipo),
                selected: true,
                expanded: false,
                weight: {
                    points: getNullableNumber(weight, 'points'),
                    questions: getNullableNumber(weight, 'questions'),
                    percentage: getNullableNumber(weight, 'percentage'),
                    rawText: getString(weight, 'rawText') || null
                },
                topics: rawTopics.map((rawTopic, tIdx): AiTopic => {
                    const topic = asRecord(rawTopic);
                    return {
                    name: String(typeof rawTopic === 'string' ? rawTopic : getString(topic, 'name', 'n')).trim(),
                    selected: true,
                    position: typeof topic.position === 'number' ? topic.position : tIdx
                };
                }).filter((topic: AiTopic) => topic.name.length >= 2)
            };
        }).filter((s: AiSubject) => s.title.trim().length > 0 && s.topics.length > 0);
    };

    const normalizeSubjectKeyForRecovery = (value: string) => value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, '_');

    const parseNumberedTopicsFromExcerpt = (excerpt: string, subjectTitle: string): AiTopic[] => {
        const normalizedExcerpt = excerpt.replace(/\s+/g, ' ').trim();
        const titleIndex = normalizedExcerpt
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .indexOf(subjectTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
        const content = titleIndex >= 0
            ? normalizedExcerpt.slice(titleIndex + subjectTitle.length).trim()
            : normalizedExcerpt;
        const matches = Array.from(content.matchAll(/\b(?:\d{1,3}|[IVXLCDM]{1,8})\s*[.-]\s+/gi));

        if (!matches.length) return [];

        return matches.map((match, index): AiTopic => {
            const start = match.index || 0;
            const end = matches[index + 1]?.index ?? content.length;
            return {
                name: content.slice(start, end).replace(/\s+/g, ' ').trim(),
                selected: true,
                position: index
            };
        }).filter(topic => topic.name.length >= 2);
    };

    const mergeRecoveredCesgranrioBasicAiSubjects = (
        subjects: AiSubject[],
        fullText: string | undefined,
        selectedCargo: string
    ): AiSubject[] => {
        if (!fullText?.trim()) return subjects;

        const recoveredAnchors = recoverCesgranrioBasicSubjects(fullText, selectedCargo);
        if (!recoveredAnchors.length) return subjects;

        const subjectsByKey = new Map(subjects.map(subject => [normalizeSubjectKeyForRecovery(subject.title), subject]));
        const recoveredSlices = sliceTextForSubjects(fullText, recoveredAnchors);
        const recoveredSubjects = recoveredAnchors.map((anchor, index): AiSubject | null => {
            const existing = subjectsByKey.get(normalizeSubjectKeyForRecovery(anchor.titulo));
            const slice = recoveredSlices.find(item => item.subject.chave === anchor.chave);
            const topics = parseNumberedTopicsFromExcerpt(slice?.sourceExcerpt || '', anchor.titulo);
            if (!topics.length) return existing || null;

            return {
                id: existing?.id || `ia-recovered-cesgranrio-${index}-${Date.now()}`,
                title: cleanSubjectTitle(anchor.titulo),
                knowledgeType: anchor.tipo_conhecimento,
                selected: true,
                expanded: existing?.expanded ?? false,
                weight: {
                    points: existing?.weight?.points ?? null,
                    questions: existing?.weight?.questions ?? null,
                    percentage: existing?.weight?.percentage ?? null,
                    rawText: existing?.weight?.rawText ?? null
                },
                topics
            };
        }).filter((subject): subject is AiSubject => !!subject);

        if (!recoveredSubjects.length) return subjects;

        const recoveredKeys = new Set(recoveredSubjects.map(subject => normalizeSubjectKeyForRecovery(subject.title)));
        const remainingSubjects = subjects.filter(subject => !recoveredKeys.has(normalizeSubjectKeyForRecovery(subject.title)));

        return [...recoveredSubjects, ...remainingSubjects];
    };

    const mapIncrementalSubjectToAiSubject = (subjectResult: unknown, fallback: MappedSubjectAnchor, idx: number): AiSubject | null => {
        const subject = asRecord(subjectResult);
        const rawTopics = getArray(subject, 'topicos', 'topics');
        const topics = rawTopics
            .map((rawTopic, tIdx): AiTopic => {
                const topic = asRecord(rawTopic);
                return {
                name: String(typeof rawTopic === 'string' ? rawTopic : getString(topic, 'name', 'n')).trim(),
                selected: true,
                position: typeof topic.position === 'number' ? topic.position : tIdx
            };
            })
            .filter((topic: AiTopic) => topic.name.length >= 2);

        if (topics.length === 0) return null;

        return {
            id: `ia-incremental-${idx}-${Date.now()}`,
            title: cleanSubjectTitle(getString(subject, 'disciplina', 'title') || fallback.titulo),
            knowledgeType: getString(subject, 'tipo') || fallback.tipo_conhecimento || null,
            selected: true,
            expanded: false,
            weight: {
                points: null,
                questions: null,
                percentage: null,
                rawText: null
            },
            topics
        };
    };

    const mergeSubjectsWithOptionalWeights = (baseSubjects: AiSubject[], weightData?: WeightExtractionResponse): AiSubject[] => {
        const weightedSubjects = Array.isArray(weightData?.subjects) ? weightData.subjects : [];
        if (weightedSubjects.length === 0) return baseSubjects;

        const weightsById = new Map<string, ExtractedSubjectWeight>(
            weightedSubjects
                .filter((item) => item?.subjectId && item?.rawText)
                .map((item) => [String(item.subjectId), {
                    subjectId: String(item.subjectId),
                    points: typeof item.points === 'number' ? item.points : null,
                    questions: typeof item.questions === 'number' ? item.questions : null,
                    percentage: typeof item.percentage === 'number' ? item.percentage : null,
                    rawText: item.rawText ? String(item.rawText) : null
                }])
        );

        return baseSubjects.map(subject => {
            const weight = weightsById.get(subject.id);
            if (!weight) return subject;

            return {
                ...subject,
                weight: {
                    points: typeof weight.points === 'number' ? weight.points : null,
                    questions: typeof weight.questions === 'number' ? weight.questions : null,
                    percentage: typeof weight.percentage === 'number' ? weight.percentage : null,
                    rawText: weight.rawText ? String(weight.rawText) : null
                }
            };
        });
    };

    const hasOptionalWeightSignals = (text?: string) => {
        const normalized = String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        if (!normalized) return true;

        const sample = normalized.slice(0, 180000);
        const signalPatterns = [
            /\b(peso|pesos|ponderacao|ponderada|pontuacao|pontuacoes|pontos?|questao|questoes|itens?)\b/,
            /\b(prova objetiva|nota final|nota da prova|valor de cada|carater eliminatorio|carater classificatorio)\b/,
            /\b(conhecimentos basicos|conhecimentos especificos)\b.{0,140}\b\d+\s*(questoes?|pontos?)\b/
        ];

        return signalPatterns.some(pattern => pattern.test(sample));
    };

    const extractOptionalWeights = async (
        documentPayload: DocumentPayload,
        confirmedAnalysis: AiEditalAnalysis,
        cargo: AiEditalAnalysis['cargos'][number],
        confirmedCargoName: string,
        baseSubjects: AiSubject[]
    ): Promise<AiSubject[]> => {
        if (!baseSubjects.length) return baseSubjects;

        setWeightExtractionStatus('idle');
        setWeightBlockInfo([]);

        const weightSourceText = documentPayload.inputText?.trim();
        if (weightSourceText && weightSourceText.length >= 1500 && !hasOptionalWeightSignals(weightSourceText)) {
            console.info('[extract-edital weights] Chamada opcional ignorada: texto sem indicios de peso oficial.');
            setWeightExtractionStatus('not_found');
            return baseSubjects;
        }

        setProcessingMsg('Buscando peso oficial das disciplinas...');
        setIaProgress(prev => Math.max(prev, 86));

        try {
            const result = await supabase.functions.invoke('extract-edital', {
                body: {
                    mode: 'extractWeights',
                    inputText: getInputTextForFunction(documentPayload),
                    pdfUrl: documentPayload.pdfUrl,
                    pdfPath: documentPayload.pdfPath,
                    pdfFileUri: documentPayload.pdfFileUri,
                    validationText: documentPayload.inputText?.trim() || undefined,
                    selectedCargoId: cargo.id,
                    selectedCargo: confirmedCargoName,
                    analysis: confirmedAnalysis,
                    subjects: baseSubjects.map(subject => ({
                        id: subject.id,
                        title: subject.title,
                        knowledgeType: subject.knowledgeType || null
                    }))
                }
            });

            if (result.error) {
                const errBody = await getFunctionErrorMessage(result.error, result.response);
                throw new Error(errBody);
            }

            const weights = result.data?.weights as WeightExtractionResponse | undefined;
            const status = (weights?.status || 'not_found') as WeightExtractionStatus;
            setWeightExtractionStatus(status);
            setWeightBlockInfo(Array.isArray(weights?.blockWeights) ? weights.blockWeights : []);

            if (status !== 'found') {
                console.info('[extract-edital weights] Peso por matéria não aplicado:', {
                    status,
                    message: weights?.message,
                    blockWeights: weights?.blockWeights
                });
                return baseSubjects;
            }

            return mergeSubjectsWithOptionalWeights(baseSubjects, weights);
        } catch (error) {
            console.warn('[extract-edital weights] Falha opcional. Continuando sem peso.', error);
            setWeightExtractionStatus('failed');
            return baseSubjects;
        }
    };

    const tryIncrementalExtraction = async (
        documentPayload: DocumentPayload,
        confirmedAnalysis: AiEditalAnalysis,
        cargo: AiEditalAnalysis['cargos'][number],
        confirmedCargoName: string
    ): Promise<AiSubject[] | null> => {
        const fullText = documentPayload.inputText?.trim();
        if (!fullText || fullText.length < 3000) return null;

        setProcessingMsg('Mapeando matérias do conteúdo programático...');
        setIaProgress(prev => Math.max(prev, 12));

        const structureResult = await supabase.functions.invoke('extract-edital', {
            body: {
                mode: 'mapContentStructure',
                inputText: fullText,
                selectedCargoId: cargo.id,
                selectedCargo: confirmedCargoName,
                analysis: confirmedAnalysis
            }
        });

        if (structureResult.error) {
            const errBody = await getFunctionErrorMessage(structureResult.error, structureResult.response);
            throw new Error(errBody);
        }

        const mappedSubjects = structureResult.data?.structure?.materias as MappedSubjectAnchor[] | undefined;
        if (!mappedSubjects?.length) {
            throw new Error('O mapeamento incremental não retornou matérias.');
        }
        const mappedWithRecoveredBasics = mergeRecoveredCesgranrioBasicSubjects(
            mappedSubjects,
            fullText,
            confirmedCargoName,
        );

        const slices = sliceTextForSubjects(fullText, mappedWithRecoveredBasics);
        const usableSlices = slices.filter(slice => slice.confidence !== 'failed' && slice.sourceExcerpt.trim().length >= 50);

        console.log('[extract-edital incremental] Slices:', {
            total: slices.length,
            usable: usableSlices.length,
            failed: slices.length - usableSlices.length,
            warnings: slices.flatMap(slice => slice.warnings)
        });

        if (usableSlices.length === 0 || usableSlices.length / mappedWithRecoveredBasics.length < 0.6) {
            throw new Error('Fatiamento incremental com baixa confiança.');
        }

        const extractedSubjects: AiSubject[] = [];
        let consecutiveFailures = 0;

        const CONCURRENCY = 2;
        let completedSlices = 0;

        for (let i = 0; i < usableSlices.length; i += CONCURRENCY) {
            if (iaFlowCancelledRef.current) return null;

            const chunk = usableSlices.slice(i, i + CONCURRENCY);
            
            if (chunk[0]) {
                setProcessingMsg(`Extraindo em lote: ${chunk[0].subject.titulo}...`);
            }

            const chunkPromises = chunk.map(async (slice, chunkIndex) => {
                const index = i + chunkIndex;
                const subjectTitle = slice.subject.titulo;

                const subjectResult = await supabase.functions.invoke('extract-edital', {
                    body: {
                        mode: 'extractSubject',
                        subjectTitle,
                        knowledgeType: slice.subject.tipo_conhecimento,
                        sourceExcerpt: slice.sourceExcerpt
                    }
                });

                if (subjectResult.error) {
                    const errBody = await getFunctionErrorMessage(subjectResult.error, subjectResult.response);
                    if (isAiRateLimitMessage(errBody)) {
                        throw new Error(errBody);
                    }
                }

                return { index, slice, subjectTitle, subjectResult };
            });

            const chunkResults = await Promise.all(chunkPromises);

            for (const { slice, subjectTitle, subjectResult, index } of chunkResults) {
                if (iaFlowCancelledRef.current) return null;
                
                completedSlices += 1;
                setIaProgress(Math.min(92, 18 + Math.round((completedSlices / Math.max(usableSlices.length, 1)) * 70)));

                if (subjectResult.error) {
                    consecutiveFailures += 1;
                    console.warn('[extract-edital incremental] Falha ao extrair matéria:', subjectTitle);
                } else {
                    const mapped = mapIncrementalSubjectToAiSubject(subjectResult.data?.subject, slice.subject, index);
                    if (mapped) {
                        extractedSubjects.push(mapped);
                        consecutiveFailures = 0;
                    } else {
                        consecutiveFailures += 1;
                        console.warn('[extract-edital incremental] Matéria sem tópicos:', subjectTitle);
                    }
                }
            }

            // Aumentamos a tolerância para 5 por causa do processamento em lote
            if (consecutiveFailures >= 5) {
                throw new Error('Muitas falhas consecutivas na extração incremental.');
            }
        }

        if (extractedSubjects.length === 0 || extractedSubjects.length / usableSlices.length < 0.6) {
            throw new Error('Extração incremental retornou poucas matérias úteis.');
        }

        return mergeRecoveredCesgranrioBasicAiSubjects(
            extractedSubjects,
            fullText,
            confirmedCargoName
        );
    };

    const handleIaImport = async () => {
        iaFlowCancelledRef.current = false;
        setMissingContentSource(null);
        setIaStage('analyzing');
        setIaProgress(0);
        setProcessingMsg('Lendo o documento...');
        setAiResult([]);
        setAnalysisResult(null);
        setSelectedCargoId('');
        setSelectedCargoName('');
        setShowIaDataEditor(false);
        setIaErrorMessage('');
        setWeightExtractionStatus('idle');

        try {
            const targetCargoBeforeAnalysis = iaPosition.trim();
            const documentPayload = await buildDocumentPayload();
            const detectedCargoOptions = getDetectedCargoOptionsForFunction(documentPayload);
            setSourcePayload(documentPayload);
            await sleep(250);
            setProcessingMsg('Identificando cargos e áreas...');

            const result = await supabase.functions.invoke('extract-edital', {
                body: {
                    mode: 'analyze',
                    inputText: getInputTextForFunction(documentPayload),
                    pdfUrl: documentPayload.pdfUrl,
                    pdfPath: documentPayload.pdfPath,
                    pdfFileUri: documentPayload.pdfFileUri,
                    origin: iaOrigin,
                    banca: iaBanca,
                    year: iaYear,
                    targetCargo: targetCargoBeforeAnalysis || undefined,
                    detectedCargoOptions: detectedCargoOptions.length ? detectedCargoOptions : undefined
                }
            });

            if (result.error) {
                const errBody = await getFunctionErrorMessage(result.error, result.response);
                throw new Error(errBody);
            }

            if (iaFlowCancelledRef.current) return;

            const analysis = result.data?.analysis as AiEditalAnalysis | undefined;
            if (!analysis?.cargos?.length) {
                throw new Error('A IA não conseguiu identificar cargos no edital.');
            }

            if (result.data?.pdfFileUri) {
                documentPayload.pdfFileUri = result.data.pdfFileUri;
                setSourcePayload({ ...documentPayload });
            }

            setProcessingMsg('Extraindo cargos disponíveis...');
            await sleep(250);
            setIaProgress(100);
            await sleep(180);

            const firstCargo = analysis.cargos[0];
            const analysisOnlyFoundGenericCargo = analysis.cargos.length === 1 && isGenericCargoName(firstCargo.name);
            const cargoFieldForNextStep = analysisOnlyFoundGenericCargo && targetCargoBeforeAnalysis
                ? targetCargoBeforeAnalysis
                : firstCargo.name;
            setAnalysisResult(analysis);
            applyAnalysisToForm(analysis);
            setSelectedCargoId(analysisOnlyFoundGenericCargo ? '' : firstCargo.id);
            setSelectedCargoName(analysisOnlyFoundGenericCargo ? '' : firstCargo.name);
            setIaPosition(cargoFieldForNextStep);
            setShowIaDataEditor(shouldOpenIaDataEditor(analysis, cargoFieldForNextStep));

            const editalName = analysis.edital.name || `${analysis.edital.organ || iaOrigin || 'Edital'} - ${analysis.edital.year || iaYear}`;
            setIaEditalName(editalName);
            await savePendingExtraction(editalName, [], {
                analysis,
                selectedCargo: analysisOnlyFoundGenericCargo ? null : firstCargo.name,
                source: documentPayload
            });

            setIaStage('selectCargo');

        } catch (error: unknown) {
            if (iaFlowCancelledRef.current) return;
            console.error('Erro na IA:', error);
            const msg = getErrorMessage(error);

            // Se for cota comercial excedida, atualiza limites locais instantaneamente
            if (msg.includes('AI_LIMIT_EXCEEDED') || msg.toLowerCase().includes('esgotou seu limite') || msg.toLowerCase().includes('cota comercial')) {
                fetchAiLimits();
            }

            const friendlyMessage = getFriendlyAiExtractionError(msg);
            setIaErrorMessage(friendlyMessage);
            errorService.report(error, {
                module: 'ai-extraction',
                action: 'analyze-edital',
                severity: 'high',
                scope: 'core',
                userMessage: friendlyMessage,
                showToast: false
            });
            toastGate.notifyError(friendlyMessage, 'IA-01');
            setIaStage('input');
        }
    };

    const handleExtractSelectedCargo = async () => {
        if (!analysisResult) return;
        iaFlowCancelledRef.current = false;
        if (hasOnlyGenericCargoAnalysis()) {
            toastGate.notifyError('A IA não listou cargos reais do edital. Tente analisar novamente sem preencher cargo, ou use o nome completo exatamente como aparece no edital.', 'IA-CARGO-03');
            setShowIaDataEditor(true);
            return;
        }
        if (!selectedCargoId) {
            toastGate.notifyError('Selecione um cargo identificado no edital antes de extrair as disciplinas.', 'IA-CARGO-04');
            return;
        }
        const selectedCargo = analysisResult.cargos.find(c => c.id === selectedCargoId);
        const confirmedCargoName = (iaPosition || selectedCargoName || selectedCargo?.name || '').trim();
        if (!confirmedCargoName) {
            toastGate.notifyError('Informe o cargo, área ou ênfase para a extração.', 'IA-CARGO-02');
            return;
        }
        const cargo = selectedCargo || {
            id: `manual-${Date.now()}`,
            name: confirmedCargoName,
            rawLabel: confirmedCargoName,
            evidence: 'Informado manualmente pelo aluno',
            label_exibicao: confirmedCargoName,
            nome_cargo: confirmedCargoName,
            area_codigo: null,
            area_enfase: null
        };
        const confirmedAnalysis: AiEditalAnalysis = {
            ...analysisResult,
            edital: {
                ...analysisResult.edital,
                organ: iaOrigin.trim() || analysisResult.edital.organ,
                year: iaYear.trim() || analysisResult.edital.year,
                examDate: examDate || analysisResult.edital.examDate,
                banca: iaBanca.trim() || analysisResult.edital.banca
            },
            cargos: selectedCargo
                ? analysisResult.cargos.map(item => item.id === selectedCargo.id
                    ? {
                        ...item,
                        name: confirmedCargoName,
                        rawLabel: confirmedCargoName,
                        label_exibicao: confirmedCargoName,
                        nome_cargo: confirmedCargoName
                    }
                    : item
                )
                : [cargo, ...analysisResult.cargos]
        };

        setIaStage('extracting');
        setMissingContentSource(null);
        setIaProgress(0);
        setIaErrorMessage('');
        setAnalysisResult(confirmedAnalysis);
        setSelectedCargoName(confirmedCargoName);
        setIaPosition(confirmedCargoName);
        setProcessingMsg(`Analisando conteúdo programático de ${confirmedCargoName}...`);
        let stopProgressHints: (() => void) | null = null;

        try {
            const documentPayload = await hydrateDocumentPayloadText(sourcePayload || await buildDocumentPayload());
            setSourcePayload(documentPayload);
            await sleep(200);
            setProcessingMsg(`Analisando conteúdo programático de ${confirmedCargoName}...`);

            try {
                const incrementalResults = await tryIncrementalExtraction(documentPayload, confirmedAnalysis, cargo, confirmedCargoName);
                if (incrementalResults && incrementalResults.length > 0) {
                    stopProgressHints?.();
                    stopProgressHints = null;
                    if (iaFlowCancelledRef.current) return;

                    const analysisEdital = confirmedAnalysis.edital;
                    const baseName = !isGenericEditalName(analysisEdital.name)
                        ? analysisEdital.name
                        : analysisEdital.organ || iaOrigin || 'Edital';
                    const finalYear = analysisEdital.year || iaYear;
                    const finalExamDate = analysisEdital.examDate;
                    const finalName = `${baseName} - ${confirmedCargoName}${finalYear ? ` (${finalYear})` : ''}`;

                    setIaEditalName(finalName);
                    setIaOrigin(analysisEdital.organ || iaOrigin);
                    setIaYear(finalYear || iaYear);
                    if (finalExamDate) setExamDate(finalExamDate);

                    const weightedResults = await extractOptionalWeights(
                        documentPayload,
                        confirmedAnalysis,
                        cargo,
                        confirmedCargoName,
                        incrementalResults
                    );
                    if (iaFlowCancelledRef.current) return;
                    setAiResult(weightedResults);

                    setProcessingMsg('Finalizando extração incremental...');
                    await savePendingExtraction(finalName, weightedResults, {
                        analysis: confirmedAnalysis,
                        selectedCargo: confirmedCargoName,
                        source: documentPayload
                    });
                    setIaProgress(100);
                    await sleep(180);
                    setIaStage('review');
                    return;
                }
            } catch (incrementalError: unknown) {
                const incrementalMessage = getErrorMessage(incrementalError);
                if (isAiRateLimitMessage(incrementalMessage) || isMissingContentSourceMessage(incrementalMessage)) {
                    throw incrementalError;
                }
                console.warn('[extract-edital incremental] Fallback para extração antiga:', incrementalMessage);
                setProcessingMsg('Usando extração compatível...');
            }

            stopProgressHints = startProgressHints([
                { delay: 5000, message: `Localizando conteúdo de ${confirmedCargoName}...` },
                { delay: 12000, message: 'Separando conhecimentos básicos e específicos...' },
                { delay: 20000, message: 'Identificando disciplinas...' },
                { delay: 32000, message: 'Mapeando tópicos por disciplina...' },
                { delay: 47000, message: 'Buscando peso oficial das disciplinas...' },
                { delay: 62000, message: 'Organizando resultado para revisão...' }
            ]);

            const result = await supabase.functions.invoke('extract-edital', {
                body: {
                    mode: 'extractForCargo',
                    inputText: getInputTextForFunction(documentPayload),
                    pdfUrl: documentPayload.pdfUrl,
                    pdfPath: documentPayload.pdfPath,
                    pdfFileUri: documentPayload.pdfFileUri,
                    selectedCargoId: cargo.id,
                    selectedCargo: confirmedCargoName,
                    analysis: confirmedAnalysis
                }
            });
            stopProgressHints?.();

            if (result.error) {
                const errBody = await getFunctionErrorMessage(result.error, result.response);
                throw new Error(errBody);
            }

            if (iaFlowCancelledRef.current) return;

            setProcessingMsg('Preparando revisão...');
            await sleep(200);
            const extraction = result.data?.extraction;
            const mappedResults = mergeRecoveredCesgranrioBasicAiSubjects(
                mapExtractionToAiSubjects(extraction),
                documentPayload.inputText,
                confirmedCargoName
            );

            if (mappedResults.length === 0) {
                throw new Error("A IA não conseguiu extrair matérias para o cargo selecionado.");
            }

            const edital = extraction?.edital || {};
            const analysisEdital = confirmedAnalysis.edital;
            const baseName = !isGenericEditalName(edital.name)
                ? edital.name
                : !isGenericEditalName(analysisEdital.name)
                    ? analysisEdital.name
                    : edital.organ || analysisEdital.organ || iaOrigin || 'Edital';
            const finalYear = edital.year || analysisEdital.year || iaYear;
            const finalExamDate = edital.examDate || analysisEdital.examDate;
            const finalName = `${baseName} - ${confirmedCargoName}${finalYear ? ` (${finalYear})` : ''}`;
            setIaEditalName(finalName);
            setIaOrigin(edital.organ || analysisEdital.organ || iaOrigin);
            setIaYear(finalYear || iaYear);
            if (finalExamDate) setExamDate(finalExamDate);

            const weightedResults = await extractOptionalWeights(
                documentPayload,
                confirmedAnalysis,
                cargo,
                confirmedCargoName,
                mappedResults
            );
            if (iaFlowCancelledRef.current) return;
            setAiResult(weightedResults);

            setProcessingMsg('Finalizando extração...');
            await savePendingExtraction(finalName, weightedResults, {
                analysis: confirmedAnalysis,
                selectedCargo: confirmedCargoName,
                source: documentPayload
            });
            setIaProgress(100);
            await sleep(180);

            setIaStage('review');
        } catch (error: unknown) {
            stopProgressHints?.();
            if (iaFlowCancelledRef.current) return;
            const technicalMessage = getErrorMessage(error);
            const friendlyMessage = getFriendlyAiExtractionError(technicalMessage);

            if (isMissingContentSourceMessage(technicalMessage)) {
                console.info('[extract-edital] O edital informa que o conteúdo programático está em um documento separado.');
                setIaErrorMessage('');
                setMissingContentSource({
                    message: friendlyMessage,
                    originalFileCount: pdfFiles.length,
                });
                setIaStage(analysisResult ? 'selectCargo' : 'input');
                return;
            }

            console.error('Erro na extração do cargo:', error);
            setIaErrorMessage(friendlyMessage);
            setMissingContentSource(null);
            setShowIaDataEditor(true);
            errorService.report(error, {
                module: 'ai-extraction',
                action: 'extract-cargo',
                severity: 'high',
                scope: 'core',
                userMessage: friendlyMessage,
                showToast: false
            });
            toastGate.notifyError(friendlyMessage, 'IA-EXTRACT-01');
            setIaStage(analysisResult ? 'selectCargo' : 'input');
        }
    };

    const handleSaveAiResult = async () => {
        setIsSavingAi(true);
        try {
            const newSubjects = aiResult.filter(s => s.selected).map(s => ({
                id: Math.random().toString(36).substr(2, 9),
                name: s.title,
                status: 'Nova', // Ensure status is set for new subjects
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
                    reviewCount: 0, // Ensure reviewCount is set
                    review_count: 0, // Ensure review_count is set
                    position: t.position ?? idx
                }))
            } as Subject));

            const finalName = getCurrentAiEditalName();

            // Validação de duplicidade por nome
            const normalizedName = finalName.toLowerCase().trim();
            const exists = userEditais.some(e => e.name.toLowerCase().trim() === normalizedName);
            
            if (exists) {
                toastGate.notifyError('Você já possui um edital com este nome.', 'COMPONENTS-SUBJECTS-IMPORTEDITALMODAL-01', { severity: 'medium' });
                setIsSavingAi(false);
                return;
            }
            
            const extraInfo = { organ: iaOrigin, position: iaPosition || selectedCargoName, year: iaYear, exam_date: examDate, exam_board: iaBanca.trim() || analysisResult.edital.banca || null };
            await onImport(newSubjects, finalName, true, undefined, extraInfo, true);
            await discardPendingExtractionData();
            onClose();
        } catch (error) {
            console.error('Erro ao salvar resultado da IA:', error);
            toastGate.notifyError('Erro ao salvar o edital importado.', 'SAVE-IA-01');
        } finally {
            setIsSavingAi(false);
        }
    };

    const handleSaveManual = async () => {
        if (!manualOrigin.trim()) {
            toastGate.notifyError('Preencha a origem/concurso', 'VAL-01', { severity: 'low' });
            return;
        }

        if (!manualPosition.trim()) {
            toastGate.notifyError('Preencha o cargo/função', 'VAL-02', { severity: 'low' });
            return;
        }

        if (!manualYear.trim()) {
            toastGate.notifyError('Preencha o ano do edital', 'VAL-03', { severity: 'low' });
            return;
        }

        setImportingManual(true);
        try {
            const finalName = `${manualOrigin.trim()} - ${manualPosition.trim()}`;
            
            // Validação de duplicidade por nome
            const normalizedName = finalName.toLowerCase().trim();
            const exists = userEditais.some(e => e.name.toLowerCase().trim() === normalizedName);
            
            if (exists) {
                toastGate.notifyError('Você já possui um edital com este nome/instituição e cargo.', 'VAL-DUP-02', { severity: 'medium' });
                setImportingManual(false);
                return;
            }

            const extraInfo = { organ: manualOrigin, position: manualPosition, year: manualYear, exam_date: examDate, exam_board: manualBanca.trim() || null };
            // Descartar extração por IA pendente se existir, para evitar conflitos
            await discardPendingExtractionData();

            await onImport([], finalName, false, undefined, extraInfo); 
            
            onClose();
            setManualOrigin('');
            setManualPosition('');
            setManualYear('');
            setManualBanca('');
            setExamDate('');
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
                topics: subject.topics.map((topic, tidx) => ({
                    id: topic.id || `imp-top-${idx}-${tidx}-${Date.now()}`,
                    name: topic.name,
                    completed: false,
                    reviewCount: 0,
                    review_count: 0,
                    position: tidx
                }))
            }));

            // Validação de duplicidade por nome
            const finalName = `${edital.organ} - ${edital.position} (${edital.year})`.trim();
            const normalizedName = finalName.toLowerCase();
            const exists = userEditais.some(e => e.name.toLowerCase().trim() === normalizedName);
            
            if (exists) {
                toastGate.notifyError('Você já possui um edital com este nome importado.', 'VAL-DUP-03', { severity: 'medium' });
                return;
            }

            // Descartar extração por IA pendente se existir, para evitar conflitos
            await discardPendingExtractionData();

            await onImport(
                mappedSubjects, 
                `${edital.organ} - ${edital.position} (${edital.year})`, 
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

        if (aiLimits.has_bypass) {
            return 'IA · ilimitada';
        }

        const remaining = aiLimits.remaining ?? Math.max(aiLimits.limit - aiLimits.usage, 0);
        if (!aiLimits.can_import) return `IA · ${aiLimits.usage}/${aiLimits.limit}`;
        return `IA · ${remaining} restante${remaining === 1 ? '' : 's'}`;
    };

    const aiUsageSummary = getAiUsageSummary();

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
                        {inlineMode && (
                            <button 
                                onClick={handleCloseModal}
                                className="mr-2 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-content-muted hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-2"
                            >
                                <ArrowLeft size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Voltar</span>
                            </button>
                        )}
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
                                ? 'Milhares de concursos já organizados pela nossa equipe.'
                                : activeTab === 'ia' && iaStage === 'review'
                                    ? 'Revise os dados antes de importar.'
                                    : activeTab === 'ia'
                                        ? 'Extraia matérias e tópicos de PDFs ou sites automaticamente.'
                                        : 'Monte sua própria matriz de estudos e organize seu conteúdo do zero.'}
                        </p>
                    </div>
                    {!inlineMode && (
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
                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                    closeAttentionPulse
                                        ? 'animate-pulse bg-red-500/20 text-red-400 ring-2 ring-red-500/60'
                                        : 'bg-secondary dark:bg-white/5 text-content-muted hover:bg-black/10 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100'
                                }`}
                                aria-label="Fechar modal"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className={`${inlineMode ? 'px-2 pb-3' : 'px-5 pt-3'}`}>
                {activeTab === 'ia' && iaStage !== 'input' ? (
                    <ImportJourneyProgress stage={iaStage} onSecondaryAction={handleJourneySecondaryAction} />
                ) : (
                    <ImportMethodSelector value={activeTab} onChange={handleImportMethodChange} />
                )}
            </div>
            <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" multiple onChange={handleFileChange} className="hidden" aria-hidden="true" />

            <div className={`${inlineMode ? 'overflow-visible flex-none pb-10 pt-0' : 'overflow-y-auto no-scrollbar flex-1 pt-2 px-5 pb-5'}`}>

                    {activeTab === 'ready' ? (
                        <div className="space-y-4">
                            {pendingExtraction?.source === 'db' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                                            <FileText size={18} className="text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-amber-800 dark:text-amber-300">
                                                Extração recuperada disponível
                                            </p>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium truncate">
                                                {formatLongDetectedText(pendingExtraction.editalName)} · Atualizado {new Date(pendingExtraction.updatedAt).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button 
                                            onClick={discardPendingExtractionData}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={12} />
                                            Descartar
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            <div className="space-y-4">
                                {/* Busca */}
                                <div className="relative w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por concurso, órgão ou cargo..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-12 bg-black/5 dark:bg-[#09090B] border border-border dark:border-white/[0.05] rounded-xl pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all text-content-main placeholder:text-content-muted/40"
                                    />
                                </div>
                                {/* Filtros */}
                                <div className="flex flex-wrap items-center gap-6 px-2 border-b border-border/40 dark:border-white/[0.02]">
                                    {['Todos', 'Carreiras Policiais', 'Tribunais', 'Bancárias', 'Administrativo', 'Educação'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`transition-all text-[10px] font-black uppercase tracking-widest px-1 py-3 border-b-2 -mb-[1px] ${
                                                selectedCategory === cat 
                                                ? 'text-[#0ea5e9] border-[#0ea5e9]' 
                                                : 'text-content-muted border-transparent hover:text-foreground hover:border-white/10'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {loadingEditais ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <LoadingSpinner size="medium" />
                                    <p className="text-xs text-content-muted mt-4 font-bold uppercase tracking-widest animate-pulse">Carregando catálogo...</p>
                                </div>
                            ) : filteredEditais.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {filteredEditais.map(edital => {
                                        const isAlreadyImported = userEditais.some(ue => ue.sourceId === edital.id);
                                        const isExpanded = expandedCatalogEditalId === edital.id;
                                        const totalTopics = edital.subjects?.reduce((acc: number, s: { name: string; topics?: { name: string }[] }) => acc + (s.topics?.length || 0), 0) || 0;
                                        const isImportingThisEdital = importingReadyEditalId === edital.id;
                                        const isImportingAnotherEdital = importingReadyEditalId !== null && !isImportingThisEdital;

                                        return (
                                            <div
                                                key={edital.id}
                                                className={`rounded-2xl border transition-all relative overflow-hidden ${
                                                    isAlreadyImported
                                                        ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10'
                                                        : 'border-border dark:border-white/5 bg-secondary/30 dark:bg-zinc-800/20 hover:bg-secondary/50 dark:hover:bg-zinc-800/50 hover:border-primary/30'
                                                }`}
                                            >
                                                <div className="px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleCatalogEdital(edital.id)}
                                                        className="w-8 h-8 bg-primary/10 hover:bg-primary/20 rounded-lg flex items-center justify-center shrink-0 z-10 transition-colors"
                                                        aria-label={isExpanded ? 'Recolher conteúdo do edital' : 'Ver matérias e tópicos do edital'}
                                                    >
                                                        <FileText size={16} className="text-primary" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleCatalogEdital(edital.id)}
                                                        className="flex-1 min-w-0 z-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-left"
                                                    >
                                                        <h4 className="font-bold text-content-main text-[13px] tracking-tight uppercase transition-colors truncate">
                                                            {edital.organ}
                                                        </h4>

                                                        <div className="flex items-center gap-2 text-[11px] text-content-muted font-medium min-w-0">
                                                            <span className="opacity-20">•</span>
                                                            <span className="truncate">{edital.position}</span>
                                                            <span className="opacity-20">•</span>
                                                            <span className="shrink-0 font-black text-zinc-400 dark:text-zinc-500">{edital.year}</span>
                                                        </div>

                                                        {isAlreadyImported && (
                                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0 uppercase tracking-tighter ml-auto">
                                                                <CheckCircle2 size={10} /> JÁ IMPORTADO
                                                            </span>
                                                        )}
                                                    </button>

                                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto z-10">
                                                        <div className="flex items-center gap-2">
                                                            {edital.subjects && edital.subjects.length > 0 ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary dark:bg-zinc-900/50 rounded-lg border border-border dark:border-white/5 transition-all">
                                                                        <Database size={12} className="text-primary/60" />
                                                                        <span className="text-[9px] font-black text-content-muted dark:text-zinc-400 uppercase">
                                                                            {edital.subjects.length} MATÉRIAS
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary dark:bg-zinc-900/50 rounded-lg border border-border dark:border-white/5 transition-all">
                                                                        <Info size={12} className="text-primary/60" />
                                                                        <span className="text-[9px] font-black text-content-muted dark:text-zinc-400 uppercase">
                                                                            {totalTopics} TÓPICOS
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-amber-500/60 flex items-center gap-1 uppercase tracking-wider bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/10">
                                                                    <AlertTriangle size={10} /> Sem conteúdos
                                                                </span>
                                                            )}
                                                        </div>

                                                        {edital.subjects && edital.subjects.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleCatalogEdital(edital.id)}
                                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                                                    isExpanded
                                                                        ? 'bg-primary text-white'
                                                                        : 'bg-secondary dark:bg-zinc-900/50 text-content-muted hover:text-primary border border-border dark:border-white/5'
                                                                }`}
                                                                aria-label={isExpanded ? 'Recolher conteúdo' : 'Visualizar conteúdo'}
                                                                title={isExpanded ? 'Recolher conteúdo' : 'Visualizar matérias e tópicos'}
                                                            >
                                                                {isExpanded ? <ChevronUp size={16} /> : <Eye size={16} />}
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isAlreadyImported) return;
                                                                handleImportReadyEdital(edital);
                                                            }}
                                                            disabled={isImportingThisEdital || isImportingAnotherEdital || isAlreadyImported}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                                                isAlreadyImported
                                                                    ? 'bg-emerald-500/20 text-emerald-500 cursor-default'
                                                                    : 'bg-primary/10 text-primary hover:bg-primary hover:text-white disabled:opacity-50'
                                                            }`}
                                                            aria-label={isAlreadyImported ? 'Edital já importado' : 'Importar edital'}
                                                            title={isAlreadyImported ? 'Edital já importado' : 'Importar edital'}
                                                        >
                                                            {isImportingThisEdital ? <Loader2 className="animate-spin" size={16} /> : isAlreadyImported ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <AnimatePresence initial={false}>
                                                    {isExpanded && edital.subjects && edital.subjects.length > 0 && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden border-t border-border/60 dark:border-white/5"
                                                        >
                                                            <div className="px-4 py-3 bg-black/[0.02] dark:bg-black/10 space-y-2">
                                                                <div className="flex items-center justify-between gap-3 px-1">
                                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-content-muted">
                                                                        <BookOpen size={13} className="text-primary" />
                                                                        Conteúdo do edital
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-content-muted">
                                                                        {edital.subjects.length} matérias · {totalTopics} tópicos
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    {edital.subjects.map((subject, subjectIdx) => {
                                                                        const subjectKey = `${edital.id}-${subject.name}-${subjectIdx}`;
                                                                        const subjectExpanded = expandedCatalogSubjectKeys.has(subjectKey);
                                                                        const topics = subject.topics || [];

                                                                        return (
                                                                            <div
                                                                                key={subjectKey}
                                                                                className="rounded-xl border border-border/70 dark:border-white/5 bg-card/70 dark:bg-zinc-950/30 overflow-hidden"
                                                                            >
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleToggleCatalogSubject(subjectKey)}
                                                                                    className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-secondary/60 dark:hover:bg-white/[0.03] transition-colors"
                                                                                >
                                                                                    <div className="min-w-0 flex items-center gap-2">
                                                                                        <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">
                                                                                            {subjectIdx + 1}
                                                                                        </span>
                                                                                        <span className="text-xs font-bold text-content-main uppercase truncate">
                                                                                            {subject.name}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                                        <span className="text-[10px] font-bold text-content-muted">
                                                                                            {topics.length} {topics.length === 1 ? 'tópico' : 'tópicos'}
                                                                                        </span>
                                                                                        <ChevronDown className={`w-4 h-4 text-content-muted transition-transform ${subjectExpanded ? 'rotate-180' : ''}`} />
                                                                                    </div>
                                                                                </button>

                                                                                <AnimatePresence initial={false}>
                                                                                    {subjectExpanded && (
                                                                                        <motion.div
                                                                                            initial={{ height: 0, opacity: 0 }}
                                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                                            exit={{ height: 0, opacity: 0 }}
                                                                                            transition={{ duration: 0.18 }}
                                                                                            className="overflow-hidden"
                                                                                        >
                                                                                            {topics.length > 0 ? (
                                                                                                <div className="ml-7 mr-3 pb-3 pt-2 pl-4 space-y-1.5 border-t border-border/50 dark:border-white/5">
                                                                                                    {topics.map((topic, topicIdx) => {
                                                                                                        const topicTone = topicIdx % 2 === 0
                                                                                                            ? 'bg-secondary/45 dark:bg-white/[0.025]'
                                                                                                            : 'bg-transparent';

                                                                                                        return (
                                                                                                            <div key={`${subjectKey}-topic-${topicIdx}`} className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs text-content-muted leading-relaxed ${topicTone}`}>
                                                                                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                                                                                                                <span className="break-words">{topic.name}</span>
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="ml-7 mr-3 pb-3 pt-2 pl-4 border-t border-border/50 dark:border-white/5 text-[11px] font-medium text-content-muted">
                                                                                                    Nenhum tópico cadastrado nesta matéria.
                                                                                                </div>
                                                                                            )}
                                                                                        </motion.div>
                                                                                    )}
                                                                                </AnimatePresence>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-12 text-center max-w-sm mx-auto">
                                    <div className="w-16 h-16 bg-secondary dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                        <Search className="text-content-muted" size={26} />
                                    </div>

                                    {searchQuery.trim() ? (
                                        <>
                                            <p className="text-base font-black text-foreground mb-1 tracking-tight">
                                                Nenhum resultado para &ldquo;{searchQuery}&rdquo;
                                            </p>
                                            <p className="text-sm text-content-muted font-medium leading-relaxed mb-6">
                                                Esse concurso ainda não está no catálogo. Você pode sugerir a inclusão, ou criar o seu plano de outra forma:
                                            </p>

                                            {/* Ações alternativas */}
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
                                                <button
                                                    onClick={() => setActiveTab('ia')}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all"
                                                >
                                                    <Sparkles size={13} />
                                                    Importar com IA
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('manual')}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary dark:bg-white/5 hover:bg-secondary/80 text-foreground text-[11px] font-bold uppercase tracking-wider rounded-xl border border-border transition-all"
                                                >
                                                    <Plus size={13} />
                                                    Criar Manualmente
                                                </button>
                                            </div>

                                            {/* Sugestão discreta */}
                                            <button
                                                onClick={handleOpenSuggest}
                                                className="inline-flex items-center gap-1.5 text-[11px] text-content-muted hover:text-foreground transition-colors font-medium"
                                            >
                                                <MessageSquare size={12} />
                                                Sugerir inclusão desse concurso no catálogo
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-base font-black text-foreground mb-1 tracking-tight">Catálogo vazio</p>
                                            <p className="text-sm text-content-muted font-medium leading-relaxed mb-6">
                                                Ainda não há planos disponíveis no catálogo. Seja o primeiro a sugerir ou crie o seu!
                                            </p>
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                                <button
                                                    onClick={handleOpenSuggest}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all"
                                                >
                                                    <MessageSquare size={13} />
                                                    Sugerir ao catálogo
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('manual')}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary dark:bg-white/5 hover:bg-secondary/80 text-foreground text-[11px] font-bold uppercase tracking-wider rounded-xl border border-border transition-all"
                                                >
                                                    <Plus size={13} />
                                                    Criar Manualmente
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'ia' ? (
                        <div className="space-y-6">
                            {pendingExtraction?.source === 'db' && iaStage === 'review' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="sticky top-0 z-20 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 backdrop-blur-md"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                                                <FileText size={16} className="text-amber-300" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-200">
                                                    Extração recuperada
                                                </p>
                                                <p className="truncate text-[10px] font-medium text-amber-100/75">
                                                    {formatLongDetectedText(pendingExtraction.editalName)} · Atualizado {new Date(pendingExtraction.updatedAt).toLocaleString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={discardPendingExtractionData}
                                            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-500/15 px-3 text-[10px] font-bold text-amber-200 transition-all hover:bg-amber-500/20"
                                        >
                                            <Trash2 size={12} />
                                            Descartar
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {pendingExtraction && pendingExtraction.source === 'db' && !['analyzing', 'extracting', 'review'].includes(iaStage) && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                                            <FileText size={18} className="text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-amber-800 dark:text-amber-300">
                                                Extração recuperada disponível
                                            </p>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
                                                {formatLongDetectedText(pendingExtraction.editalName)} · Atualizado {new Date(pendingExtraction.updatedAt).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={discardPendingExtractionData}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={12} />
                                            Descartar
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                            {loadingPending ? (
                                <div className="flex items-center justify-center py-8 gap-2">
                                    <Loader2 size={16} className="animate-spin text-content-muted" />
                                    <span className="text-[10px] text-content-muted font-medium">Carregando extração pendente...</span>
                                </div>
                                                        ) : iaStage === 'input' && !pendingExtraction ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                                    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full">
                                        
                                        {/* BLOQUEIO DE LIMITE DE CRÉDITOS */}
                                        {aiLimits && !aiLimits.can_import && !aiLimits.has_bypass ? (
                                            <div className="mx-auto my-4 w-full max-w-[620px] rounded-2xl border border-border bg-card p-5 text-center shadow-xl dark:border-white/5 dark:bg-zinc-900/30 sm:p-6">
                                                <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                                                    <Sparkles size={24} className="text-primary" />
                                                    <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1 border-2 border-card">
                                                        <X size={10} strokeWidth={3} />
                                                    </div>
                                                </div>

                                                <h3 className="mb-2 text-lg font-black tracking-tight text-foreground sm:text-xl">
                                                    Limite de Importações por IA Atingido
                                                </h3>

                                                <p className="mx-auto mb-5 max-w-md text-sm font-medium leading-relaxed text-content-muted">
                                                    {aiLimits.plan === 'free_trial' || aiLimits.status === 'trial' || aiLimits.status === 'free' ? (
                                                        <span>
                                                            Seu acesso gratuito inclui <strong>1 importação completa por IA</strong> para experimentar. Você já usou <strong>{aiLimits.usage}</strong> de <strong>{aiLimits.limit}</strong>. Para importar novos editais com IA, assine um plano.
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            Você atingiu o limite mensal de <strong>{aiLimits.limit} importações com IA</strong> do seu plano. O catálogo oficial e a criação manual continuam disponíveis sem limite.
                                                        </span>
                                                    )}
                                                </p>

                                                {/* Alternativas */}
                                                <div className="mx-auto grid w-full max-w-[560px] grid-cols-1 gap-3 sm:grid-cols-3">
                                                    <button
                                                        onClick={() => {
                                                            if (aiLimits.plan === 'free_trial' || aiLimits.status === 'trial' || aiLimits.status === 'free') {
                                                                onClose();
                                                                navigate('/planos');
                                                            } else {
                                                                toast.info("Entre em contato com o suporte para expandir seus créditos.");
                                                            }
                                                        }}
                                                        className="group relative flex min-h-[116px] flex-col items-start justify-between overflow-hidden rounded-2xl border border-primary/25 bg-primary/10 p-4 text-left transition-all hover:border-primary/45 hover:bg-primary/15"
                                                    >
                                                        <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-primary/10 transition-all group-hover:bg-primary/15" />
                                                        <div className="z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                                                            <Sparkles size={18} />
                                                        </div>
                                                        <div className="z-10">
                                                            <p className="text-[11px] font-black uppercase tracking-wider text-foreground">
                                                                {aiLimits.plan === 'free_trial' || aiLimits.status === 'trial' || aiLimits.status === 'free' ? 'Assinar' : 'Suporte'}
                                                            </p>
                                                            <p className="mt-1 text-[10px] font-medium leading-snug text-content-muted">
                                                                {aiLimits.plan === 'free_trial' || aiLimits.status === 'trial' || aiLimits.status === 'free' ? 'Ver planos e liberar IA' : 'Pedir mais créditos'}
                                                            </p>
                                                        </div>
                                                    </button>

                                                    <button
                                                        onClick={() => setActiveTab('ready')}
                                                        className="group relative flex min-h-[116px] flex-col items-start justify-between overflow-hidden rounded-2xl border border-border bg-secondary/40 p-4 text-left transition-all hover:border-sky-500/40 hover:bg-sky-500/10 dark:bg-white/[0.03]"
                                                    >
                                                        <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-sky-500/5 transition-all group-hover:bg-sky-500/10" />
                                                        <div className="z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                                                            <Database size={18} />
                                                        </div>
                                                        <div className="z-10">
                                                            <p className="text-[11px] font-black uppercase tracking-wider text-foreground">Catálogo</p>
                                                            <p className="mt-1 text-[10px] font-medium leading-snug text-content-muted">Usar edital pronto</p>
                                                        </div>
                                                    </button>

                                                    <button
                                                        onClick={() => setActiveTab('manual')}
                                                        className="group relative flex min-h-[116px] flex-col items-start justify-between overflow-hidden rounded-2xl border border-border bg-secondary/40 p-4 text-left transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 dark:bg-white/[0.03]"
                                                    >
                                                        <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-emerald-500/5 transition-all group-hover:bg-emerald-500/10" />
                                                        <div className="z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                                                            <Plus size={18} />
                                                        </div>
                                                        <div className="z-10">
                                                            <p className="text-[11px] font-black uppercase tracking-wider text-foreground">Manual</p>
                                                            <p className="mt-1 text-[10px] font-medium leading-snug text-content-muted">Criar do zero</p>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* COTA ATIVA / CRÉDITOS RESTANTES */}
                                                {loadingAiLimits && (
                                                    <div className="border border-border rounded-2xl px-5 py-4 flex items-center gap-3 text-content-muted">
                                                        <Loader2 size={16} className="animate-spin" />
                                                        <span className="text-xs font-bold">Verificando uso de IA...</span>
                                                    </div>
                                                )}

                                                {aiLimits && (
                                                    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                                                                <Sparkles size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-foreground">
                                                                    Importador Inteligente de Editais com IA
                                                                </p>
                                                                <p className="text-[10px] text-content-muted font-medium">
                                                                    {aiLimits.has_bypass ? (
                                                                        <>
                                                                            Acesso administrativo ilimitado. Você importou <strong>{aiLimits.usage}</strong> edital{aiLimits.usage === 1 ? '' : 's'} com IA neste mês{typeof aiLimits.total_usage === 'number' ? <> · <strong>{aiLimits.total_usage}</strong> no total</> : null}.
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            Você usou <strong>{aiLimits.usage}</strong> de <strong>{aiLimits.limit}</strong> extrações com IA. Restam <strong className="text-primary">{aiLimits.remaining ?? Math.max(aiLimits.limit - aiLimits.usage, 0)}</strong> {aiLimits.usage_period === 'monthly' ? 'neste mês' : 'no seu acesso gratuito'}.
                                                                        </>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] text-content-muted font-medium">
                                                                {aiLimits.has_bypass ? 'Admin não consome limite comercial.' : 'Precisa de mais? Catálogo e Manual são ilimitados.'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {!loadingAiLimits && !aiLimits && (
                                                    <div className="rounded-2xl border border-border bg-secondary/30 px-5 py-4 text-content-muted dark:bg-white/[0.03]">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                                <Sparkles size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-foreground">
                                                                    Uso de IA
                                                                </p>
                                                                <p className="text-[10px] font-medium">
                                                                    Não consegui carregar seu uso agora. A extração ainda pode ser iniciada, e o limite será validado pelo servidor.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {iaErrorMessage && (
                                            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4">
                                        <p className="text-xs font-bold text-red-300">
                                            {getAiErrorHeading()}
                                                </p>
                                                <p className="text-[11px] text-red-200/80 mt-1 leading-relaxed">
                                                    {iaErrorMessage}
                                                </p>
                                            </div>
                                        )}
                                        <AiSourceStep
                                            mode={isComplementMode ? 'text' : aiSourceMode}
                                            onModeChange={setAiSourceMode}
                                            files={pdfFiles}
                                            inputText={inputText}
                                            onTextChange={setInputText}
                                            onSelectFiles={() => pdfInputRef.current?.click()}
                                            onRemoveFile={handleRemovePdf}
                                            onAnalyze={handleIaImport}
                                            disabled={isComplementMode
                                                ? (!inputText.trim() || !selectedEditalToComplement || !iaComplementSubjectName.trim())
                                                : (aiSourceMode === 'pdf' ? pdfFiles.length === 0 : !inputText.trim())}
                                        />
                                        {!isComplementMode && (
                                            <AiOptionalContext
                                                open={showOptionalContext}
                                                onOpenChange={setShowOptionalContext}
                                                banca={iaBanca}
                                                organ={iaOrigin}
                                                cargo={iaPosition}
                                                onBancaChange={setIaBanca}
                                                onOrganChange={setIaOrigin}
                                                onCargoChange={(value) => {
                                                    setIaPosition(value);
                                                    setSelectedCargoName(value);
                                                    setSelectedCargoId('');
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                                    </div>
                                </motion.div>
                            ) : null}

                            {(iaStage === 'analyzing' || iaStage === 'extracting') && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl mx-auto py-8">
                                    <div className="rounded-2xl border border-border dark:border-white/10 bg-card dark:bg-zinc-900/50 p-5 sm:p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                                <Sparkles size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-content-main">
                                                    {iaStage === 'analyzing' ? 'Analisando edital...' : 'Extraindo disciplinas...'}
                                                </h3>
                                                <p className="text-[11px] text-content-muted">
                                                    {iaStage === 'analyzing' ? processingMsg : 'Isso pode levar alguns instantes.'}
                                                </p>
                                            </div>
                                        </div>

                                        {iaStage === 'extracting' && extractionCargoName && !isGenericCargoName(extractionCargoName) && (
                                            <div className="mb-5 rounded-xl border border-white/10 bg-secondary/45 px-4 py-3.5 dark:bg-zinc-950/20">
                                                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-content-muted">
                                                    {extractionCargoLabel}
                                                </p>
                                                <p className="text-xs font-semibold leading-snug text-content-main">
                                                    {formatLongDetectedText(extractionCargoName)}
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {(iaStage === 'analyzing'
                                                ? [
                                                    { label: 'Lendo edital', from: 0, to: 34 },
                                                    { label: 'Identificando cargos e áreas', from: 34, to: 80 },
                                                    { label: 'Extraindo cargos disponíveis', from: 80, to: 100 }
                                                ]
                                                : [
                                                    { label: 'Lendo conteúdo do cargo', from: 0, to: 36 },
                                                    { label: 'Organizando matérias e tópicos', from: 36, to: 86 },
                                                    { label: 'Verificando pesos da prova', from: 86, to: 94 },
                                                    { label: 'Organizando resultado', from: 94, to: 100 }
                                                ]
                                            ).map((step) => {
                                                const stepProgress = Math.max(0, Math.min(100, ((iaProgress - step.from) / (step.to - step.from)) * 100));
                                                const done = stepProgress >= 100;
                                                const active = stepProgress > 0 && stepProgress < 100;
                                                return (
                                                    <div key={step.label} className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            {done ? (
                                                                <CheckCircle2 size={14} className="text-emerald-400" />
                                                            ) : active ? (
                                                                <Loader2 size={14} className="text-primary animate-spin" />
                                                            ) : (
                                                                <span className="w-3.5 h-3.5 rounded-full border border-content-muted/40" />
                                                            )}
                                                            <span className={`text-xs font-bold flex-1 ${done || active ? 'text-content-main' : 'text-content-muted/60'}`}>
                                                                {step.label}
                                                            </span>
                                                            {(done || active) && (
                                                                <span className={`text-[10px] font-bold ${done ? 'text-emerald-400' : 'text-primary'}`}>
                                                                    {done ? 'Concluído' : 'Em andamento'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="ml-5 h-1 rounded-full bg-white/10 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-[width] duration-200 ease-out ${done ? 'bg-emerald-400' : active ? 'bg-primary' : 'bg-white/20'}`}
                                                                style={{ width: `${stepProgress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {iaStage === 'extracting' && (
                                            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-3 text-amber-800 dark:text-amber-100" role="status">
                                                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
                                                <div>
                                                    <p className="text-xs font-bold">Não feche esta janela</p>
                                                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-amber-800/80 dark:text-amber-100/75">
                                                        Mantenha esta tela aberta até a revisão aparecer.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {iaStage === 'selectCargo' && analysisResult && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-4">
                                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                                            Dados detectados
                                        </p>
                                        <h3 className="mt-2 max-w-3xl text-xs font-semibold leading-snug text-foreground sm:text-[13px]">
                                            {formatLongDetectedText(analysisResult.edital.name) || 'Edital analisado'}
                                        </h3>
                                        <p className="mt-1 text-xs leading-relaxed text-content-muted">
                                            {iaOrigin || analysisResult.edital.organ || 'Órgão não identificado'}
                                            {analysisResult.edital.year ? ` · ${analysisResult.edital.year}` : ''}
                                            {(iaBanca || analysisResult.edital.banca) ? ` · ${iaBanca || analysisResult.edital.banca}` : ''}
                                        </p>
                                        {hasOnlyGenericCargoAnalysis() && (
                                            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                                                <p className="text-[11px] font-semibold leading-relaxed text-amber-200/90">
                                                    Não encontrei cargos reais com segurança. Volte, ajuste os dados informados e analise novamente antes de continuar.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {missingContentSource ? (
                                        <AiContentSourceRecovery
                                            message={missingContentSource.message}
                                            files={pdfFiles}
                                            originalFileCount={missingContentSource.originalFileCount}
                                            selectedCargoName={selectedCargoName || iaPosition}
                                            onAdd={() => pdfInputRef.current?.click()}
                                            onRemove={handleRemovePdf}
                                        />
                                    ) : null}

                                    {iaErrorMessage && !missingContentSource && (
                                        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4">
                                            <p className="text-xs font-bold text-red-300">
                                                {getAiErrorHeading()}
                                            </p>
                                            <p className="text-[11px] text-red-200/80 mt-1 leading-relaxed">
                                                {iaErrorMessage}
                                            </p>
                                        </div>
                                    )}

                                    <div className="rounded-2xl border border-border bg-card p-4 dark:border-white/10 dark:bg-zinc-900/40">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted">
                                                        {hasManualCargoTarget()
                                                            ? 'Cargo alvo'
                                                            : 'Cargos encontrados no edital'}
                                                    </p>
                                                    {!hasManualCargoTarget() && !hasOnlyGenericCargoAnalysis() && (
                                                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-primary">
                                                            {analysisResult.cargos.filter((cargo) => !isGenericCargoName(cargo.name)).length === 1
                                                                ? '1 cargo'
                                                                : `${analysisResult.cargos.filter((cargo) => !isGenericCargoName(cargo.name)).length} cargos`}
                                                        </span>
                                                    )}
                                                </div>
                                            {!hasManualCargoTarget() && (
                                                <p className="text-[11px] leading-relaxed text-content-muted">
                                                    Selecione o cargo para extrair o conteúdo programático.
                                                </p>
                                            )}
                                            </div>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {hasManualCargoTarget() ? (
                                                <div className="w-full px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 text-content-main">
                                                    <p className="text-xs font-bold leading-snug break-words">{iaPosition}</p>
                                                    <p className="text-[11px] text-content-muted mt-1">
                                                        A IA não listou cargos com segurança. A extração usará o cargo, área ou ênfase informado acima.
                                                    </p>
                                                </div>
                                            ) : (
                                                analysisResult.cargos.filter((cargo) => !isGenericCargoName(cargo.name)).length > 0 ? (
                                                    analysisResult.cargos
                                                        .filter((cargo) => !isGenericCargoName(cargo.name))
                                                        .map((cargo) => (
                                                            <button
                                                                key={cargo.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedCargoId(cargo.id);
                                                                    setSelectedCargoName(cargo.name);
                                                                    setIaPosition(cargo.name);
                                                                }}
                                                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                                                                    selectedCargoId === cargo.id
                                                                        ? 'border-primary bg-primary/10 text-content-main shadow-sm shadow-primary/10'
                                                                        : 'border-border dark:border-white/10 bg-secondary/40 hover:border-primary/40 text-content-main'
                                                                }`}
                                                            >
                                                                <span className="flex items-center justify-between gap-3">
                                                                    <span className="text-xs font-bold leading-snug break-words">{cargo.label_exibicao || cargo.name}</span>
                                                                    {selectedCargoId === cargo.id && (
                                                                        <CheckCircle2 size={15} className="shrink-0 text-primary" />
                                                                    )}
                                                                </span>
                                                            </button>
                                                        ))
                                                ) : (
                                                    <div className="w-full px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-content-main">
                                                        <p className="text-xs font-bold leading-snug">Não consegui identificar cargos reais no edital.</p>
                                                        <p className="text-[11px] text-content-muted mt-1">
                                                            Revise banca e órgão/concurso e clique em Analisar novamente.
                                                        </p>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {iaStage === 'review' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                        <p className="text-[11px] font-black text-content-main uppercase tracking-[0.14em]">Dados do edital</p>

                                        <div className="mt-3 rounded-xl border border-primary/15 bg-card/80 p-4 dark:bg-zinc-900/45">
                                            {weightExtractionStatus !== 'idle' && (weightExtractionStatus !== 'found' || weightBlockInfo.length > 0) && (
                                                <div className="mb-4 rounded-[8px] border border-amber-500/20 bg-amber-500/10 px-3 py-3">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-300">
                                                        {weightExtractionStatus === 'block_only' || weightBlockInfo.length > 0
                                                            ? 'Peso identificado por bloco'
                                                            : 'Peso por matéria não identificado'}
                                                    </p>
                                                    <p className="mt-1 text-[10px] font-semibold leading-relaxed text-amber-200/90">
                                                        {weightExtractionStatus === 'block_only' || weightBlockInfo.length > 0
                                                            ? 'Quando o edital não divide o peso por disciplina, o sistema não distribui automaticamente. Você pode ajustar depois na edição do edital.'
                                                            : 'Você pode preencher manualmente agora ou ajustar depois na edição do edital.'}
                                                    </p>
                                                    {weightBlockInfo.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {weightBlockInfo.map((block, index) => (
                                                                <span key={`${block.blockName || 'bloco'}-${index}`} className="rounded-[5px] border border-amber-500/20 bg-black/15 px-2 py-1 text-[10px] font-semibold leading-snug text-content-main">
                                                                    {formatBlockWeightInfo(block)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="space-y-1">
                                                        <span className="block text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Concurso</span>
                                                    <input
                                                        type="text"
                                                        value={iaOrigin}
                                                        onChange={(e) => setIaOrigin(e.target.value)}
                                                        className="h-8 w-full rounded-[6px] border border-primary/15 bg-zinc-950/35 px-2 text-[10px] font-bold uppercase text-content-main outline-none transition-all hover:border-primary/25 focus:border-primary/45 focus:bg-zinc-950/45"
                                                    />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="block text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Cargo</span>
                                                    <input
                                                        type="text"
                                                        value={iaPosition}
                                                        onChange={(e) => setIaPosition(e.target.value)}
                                                        className="h-8 w-full rounded-[6px] border border-primary/15 bg-zinc-950/35 px-2 text-[10px] font-bold uppercase text-content-main outline-none transition-all hover:border-primary/25 focus:border-primary/45 focus:bg-zinc-950/45"
                                                    />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:justify-self-end">
                                                    <div className="space-y-1 md:w-20">
                                                        <span className="block text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Ano</span>
                                                    <input
                                                        type="text"
                                                        value={iaYear}
                                                        onChange={(e) => setIaYear(e.target.value.replace(/\D/g, ''))}
                                                        className="h-8 w-full rounded-[6px] border border-primary/15 bg-zinc-950/35 px-2 text-[10px] font-bold text-content-main outline-none transition-all hover:border-primary/25 focus:border-primary/45 focus:bg-zinc-950/45"
                                                        placeholder="AAAA"
                                                        maxLength={4}
                                                    />
                                                    </div>
                                                    <div className="space-y-1 md:w-[150px]">
                                                        <span className="block text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Data da Prova</span>
                                                    <input
                                                        type="date"
                                                        value={examDate}
                                                        onChange={(e) => setExamDate(e.target.value)}
                                                        className="h-8 w-full rounded-[6px] border border-primary/15 bg-zinc-950/35 px-2 text-[10px] font-bold text-content-main outline-none transition-all hover:border-primary/25 focus:border-primary/45 focus:bg-zinc-950/45"
                                                    />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-border bg-card p-4 dark:border-white/10 dark:bg-zinc-900/40">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[11px] font-black text-content-main uppercase tracking-[0.14em]">Matérias e tópicos</p>
                                                <p className="text-[10px] text-content-muted">
                                                    Selecione o que deseja importar.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const shouldExpand = aiResult.some(s => !s.expanded);
                                                    setAiResult(aiResult.map(s => ({ ...s, expanded: shouldExpand })));
                                                }}
                                                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-black uppercase tracking-wider rounded-[4px] transition-all border border-primary/20 shrink-0"
                                            >
                                                {aiResult.some(s => !s.expanded) ? 'Expandir tudo' : 'Recolher tudo'}
                                            </button>
                                        </div>

                                        <div className="mt-3 space-y-2 pr-2 no-scrollbar">
                                            {aiResult.map((subj, sIdx) => (
                                                <div key={subj.id} className="overflow-hidden rounded-xl border border-border bg-secondary/40 text-content-main transition-all hover:border-primary/40 dark:border-white/10">
                                                    <div className="group flex items-center justify-between px-4 py-3">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={subj.selected}
                                                            onChange={() => {
                                                                const newResult = [...aiResult];
                                                                const nextSelected = !newResult[sIdx].selected;
                                                                newResult[sIdx] = {
                                                                    ...newResult[sIdx],
                                                                    selected: nextSelected,
                                                                    topics: newResult[sIdx].topics.map(topic => ({
                                                                        ...topic,
                                                                        selected: nextSelected
                                                                    }))
                                                                };
                                                                setAiResult(newResult);
                                                            }}
                                                            className="h-3.5 w-3.5 shrink-0 rounded border border-primary/30 accent-primary"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={subj.title}
                                                            onChange={(e) => {
                                                                const newResult = [...aiResult];
                                                                newResult[sIdx].title = e.target.value.toUpperCase();
                                                                setAiResult(newResult);
                                                            }}
                                                            className="w-full border-none bg-transparent text-xs font-bold uppercase text-content-main outline-none transition-colors focus:text-primary"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {subj.knowledgeType && (
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                                subj.knowledgeType.toLowerCase().includes('básic') || subj.knowledgeType.toLowerCase().includes('basic')
                                                                    ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                                                                    : subj.knowledgeType.toLowerCase().includes('espec')
                                                                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                                                        : 'bg-secondary/60 dark:bg-zinc-800/60 text-content-muted border-border dark:border-white/10'
                                                            }`}>
                                                                {subj.knowledgeType}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-bold bg-secondary dark:bg-zinc-800 text-muted-foreground px-1.5 py-0.5 rounded border border-border dark:border-white/5">
                                                            {subj.topics.length} tópicos
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                const newResult = [...aiResult];
                                                                newResult[sIdx].expanded = !newResult[sIdx].expanded;
                                                                setAiResult(newResult);
                                                            }}
                                                            className="text-content-muted hover:text-primary transition-colors"
                                                        >
                                                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${subj.expanded ? 'rotate-180' : ''}`} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {subj.expanded && (
                                                    <div className="flex flex-col gap-1 border-t border-white/10 bg-black/10 px-4 pb-3 pt-3 dark:bg-zinc-950/15">
                                                        <div className="mb-3 w-fit max-w-full rounded-[8px] border border-white/10 bg-secondary/55 px-3 py-2 dark:bg-zinc-800/45">
                                                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                                                                <p className="text-[10px] font-bold text-content-main">
                                                                    Peso da prova
                                                                </p>
                                                                <span className="h-4 w-px bg-primary/20" aria-hidden="true" />
                                                                <label className="flex items-center gap-1.5">
                                                                    <span className="text-[8px] font-bold text-content-muted uppercase tracking-[0.1em]">Questões</span>
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        value={formatExamWeightInputValue(subj.weight?.questions)}
                                                                        onChange={(e) => {
                                                                            const newResult = [...aiResult];
                                                                            const value = parseOptionalExamWeightNumber(e.target.value);
                                                                            newResult[sIdx].weight = {
                                                                                ...(newResult[sIdx].weight || { points: null, questions: null, percentage: null, rawText: null }),
                                                                                questions: value,
                                                                                rawText: value !== null ? getManualWeightRawText() : newResult[sIdx].weight?.rawText || null
                                                                            };
                                                                            setAiResult(newResult);
                                                                        }}
                                                                        className="h-6 w-10 rounded-[4px] border border-white/10 bg-zinc-950/25 px-1.5 text-center text-[10px] font-bold text-content-main outline-none transition-colors focus:border-primary/40"
                                                                    />
                                                                </label>
                                                                <label className="flex items-center gap-1.5">
                                                                    <span className="text-[8px] font-bold text-content-muted uppercase tracking-[0.1em]">Pontos</span>
                                                                    <input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        value={formatExamWeightInputValue(subj.weight?.points)}
                                                                        onChange={(e) => {
                                                                            const newResult = [...aiResult];
                                                                            const value = parseOptionalExamWeightNumber(e.target.value);
                                                                            newResult[sIdx].weight = {
                                                                                ...(newResult[sIdx].weight || { points: null, questions: null, percentage: null, rawText: null }),
                                                                                points: value,
                                                                                rawText: value !== null ? getManualWeightRawText() : newResult[sIdx].weight?.rawText || null
                                                                            };
                                                                            setAiResult(newResult);
                                                                        }}
                                                                        className="h-6 w-10 rounded-[4px] border border-white/10 bg-zinc-950/25 px-1.5 text-center text-[10px] font-bold text-content-main outline-none transition-colors focus:border-primary/40"
                                                                    />
                                                                </label>
                                                                {(subj.weight?.questions != null || subj.weight?.points != null || subj.weight?.percentage != null) ? (
                                                                    <span className="inline-flex h-5 items-center rounded-[4px] border border-emerald-500/20 bg-emerald-500/10 px-2 text-[8px] font-bold uppercase tracking-[0.08em] text-emerald-300">
                                                                        Peso encontrado
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex h-5 items-center rounded-[4px] border border-amber-500/20 bg-amber-500/10 px-2 text-[8px] font-bold uppercase tracking-[0.08em] text-amber-300">
                                                                        {weightExtractionStatus === 'block_only' ? 'Peso do bloco' : 'Sem peso encontrado'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {getSubjectExamWeightLine(getAiSubjectWeightAdapter(subj), aiExamWeightTotals, { derivePercentageFromQuestions: false, derivePercentageFromPoints: false }) && (
                                                                <p className="mt-2 border-t border-primary/10 pt-2 text-[10px] font-semibold leading-snug text-emerald-300">
                                                                    {getSubjectExamWeightLine(getAiSubjectWeightAdapter(subj), aiExamWeightTotals, { derivePercentageFromQuestions: false, derivePercentageFromPoints: false })}
                                                                </p>
                                                            )}
                                                            <p className="mt-2 flex items-center gap-1.5 border-t border-primary/10 pt-2 text-[10px] leading-snug text-content-muted">
                                                                <Info size={12} className="shrink-0 text-primary/80" />
                                                                {getAiSubjectWeightHelpText(subj)}
                                                            </p>
                                                            </div>
                                                        {subj.topics.map((topic, tIdx) => (
                                                            <div key={tIdx} className="flex items-start gap-2 rounded-[6px] py-1.5 pl-1 pr-2 transition-colors hover:bg-primary/[0.06]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={topic.selected}
                                                                    onChange={() => {
                                                                        const newResult = [...aiResult];
                                                                        newResult[sIdx].topics[tIdx].selected = !newResult[sIdx].topics[tIdx].selected;
                                                                        setAiResult(newResult);
                                                                    }}
                                                                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded accent-primary"
                                                                />
                                                                <p
                                                                    className="text-xs text-content-main leading-relaxed flex-1 whitespace-normal break-words"
                                                                >
                                                                    {topic.name}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Botão removido daqui para o rodapé fixo */}
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 w-full pt-0 pb-12">
                            {pendingExtraction?.source === 'db' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                                            <FileText size={18} className="text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-amber-800 dark:text-amber-300">
                                                Extração recuperada disponível
                                            </p>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium truncate">
                                                {formatLongDetectedText(pendingExtraction.editalName)} · Atualizado {new Date(pendingExtraction.updatedAt).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button 
                                            onClick={discardPendingExtractionData}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={12} />
                                            Descartar
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Novo Layout Criar Manualmente - Duas Colunas */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-5xl mx-auto w-full">
                                {/* Coluna Esquerda: Informação */}
                                <div className="md:col-span-5 bg-secondary/50 dark:bg-white-[0.02] rounded-3xl p-8 flex flex-col justify-center items-start border border-border/50 dark:border-white/5 relative overflow-hidden">
                                    <h3 className="text-3xl font-black text-foreground mb-4 leading-tight tracking-tight">Criar<br/>Manualmente</h3>
                                    <p className="text-sm text-content-muted font-medium mb-12">
                                        Monte sua própria matriz de estudos e organize seu conteúdo do zero para exames e concursos públicos. Preencha os campos com as informações do seu edital.
                                    </p>
                                    <div className="w-full flex justify-center text-primary/20 dark:text-white/10 mt-auto">
                                        <div className="relative transform -rotate-6">
                                            <BookOpen size={140} strokeWidth={1} />
                                            <Settings className="absolute -bottom-4 -right-4 text-emerald-500/80" size={64} strokeWidth={1.5} />
                                        </div>
                                    </div>
                                </div>

                                {/* Coluna Direita: Formulário */}
                                <div className="md:col-span-7 flex flex-col justify-start space-y-6 bg-card dark:bg-zinc-900/40 rounded-3xl p-8 border border-border/50 dark:border-white/5">
                                    <div className="mb-2 flex items-center gap-2">
                                        <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                                        <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Dados do Edital</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
                                        {/* Primeira Coluna: Instituição e Cargo */}
                                        <div className="sm:col-span-8 space-y-6">
                                            <div className="space-y-2 group">
                                                <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Origem / Instituição</label>
                                                <input
                                                    type="text"
                                                    placeholder="EX: PC-ES, INSS, Banco do Brasil"
                                                    value={manualOrigin}
                                                    onChange={(e) => setManualOrigin(e.target.value)}
                                                    className="w-full h-12 bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 text-xs font-bold text-content-main outline-none transition-all placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
                                                />
                                            </div>

                                            <div className="space-y-2 group">
                                                <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Cargo / Função</label>
                                                <input
                                                    type="text"
                                                    placeholder="EX: AGENTE, ANALISTA, TÉCNICO"
                                                    value={manualPosition}
                                                    onChange={(e) => setManualPosition(e.target.value)}
                                                    className="w-full h-12 bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 text-xs font-bold text-content-main outline-none transition-all placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
                                                />
                                            </div>
                                        </div>

                                        {/* Segunda Coluna: Ano e Data */}
                                        <div className="sm:col-span-4 space-y-6">
                                            <div className="space-y-2 group">
                                                <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Ano do Edital</label>
                                                <input
                                                    type="text"
                                                    placeholder="EX: 2024"
                                                    value={manualYear}
                                                    onChange={(e) => setManualYear(e.target.value)}
                                                    className="w-full h-12 bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 text-xs font-bold text-content-main outline-none transition-all placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
                                                />
                                            </div>

                                            <div className="space-y-2 group">
                                                <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Data da Prova</label>
                                                <input
                                                    type="date"
                                                    value={examDate}
                                                    onChange={(e) => setExamDate(e.target.value)}
                                                    className="w-full h-12 bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 text-xs font-bold text-content-main outline-none transition-all uppercase placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
                                                />
                                            </div>
                                            <div className="space-y-2 group">
                                                <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Banca (opcional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="EX: IDCAP"
                                                    value={manualBanca}
                                                    onChange={(e) => setManualBanca(e.target.value)}
                                                    className="w-full h-12 bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 text-xs font-bold text-content-main outline-none transition-all uppercase placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            onClick={handleSaveManual}
                                            disabled={!manualOrigin.trim() || !manualPosition.trim() || !manualYear.trim() || importingManual}
                                            className="w-full h-[52px] bg-[#22c55e] hover:bg-[#16a34a] text-white font-black text-[12px] rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 justify-center uppercase tracking-widest border-b-[3px] border-[#15803d] active:border-b-0 active:mt-[3px]"
                                        >
                                            {importingManual ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Criando Edital...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={18} strokeWidth={3} />
                                                    CRIAR EDITAL E ADICIONAR MATÉRIAS
                                                </>
                                            )}
                                        </button>
                                        
                                        <div className="mt-4 flex items-center gap-2 justify-center text-content-muted">
                                            <Info size={13} className="opacity-70" />
                                            <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">
                                                Você poderá adicionar matérias e tópicos logo após a criação.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            {/* ── Fixed Footer for Import ── */}
            {activeTab === 'ia' && iaStage === 'review' && (
                <div className={`z-30 flex shrink-0 flex-col gap-3 border-t border-border bg-card/95 px-6 py-2.5 backdrop-blur dark:border-white/5 dark:bg-zinc-900/95 sm:flex-row sm:items-center sm:justify-between ${
                    inlineMode
                        ? 'sticky bottom-0 mt-6 rounded-2xl shadow-2xl shadow-black/20'
                        : 'rounded-b-[32px]'
                }`}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-content-muted">
                        <span>
                            <strong className="font-black text-content-main">{aiResult.filter(s => s.selected).length}</strong> de {aiResult.length} matérias
                        </span>
                        <span>
                            <strong className="font-black text-content-main">
                                {aiResult.reduce((acc, s) => s.selected ? acc + s.topics.filter(t => t.selected).length : acc, 0)}
                            </strong> de {aiResult.reduce((acc, s) => s.selected ? acc + s.topics.length : acc, 0)} tópicos
                        </span>
                    </div>
                    <button
                        onClick={handleSaveAiResult}
                        disabled={isSavingAi}
                        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] bg-emerald-500 px-5 text-[10px] font-black uppercase tracking-[0.1em] text-white shadow-lg shadow-emerald-500/15 transition-all hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    >
                        {isSavingAi ? (
                            <><Loader2 className="animate-spin" size={15} /> SALVANDO...</>
                        ) : (
                            <>
                                <CheckCircle2 size={15} />
                                {isComplementMode ? 'ADICIONAR AO EDITAL' : 'IMPORTAR SELECIONADOS'}
                            </>
                        )}
                    </button>
                </div>
            )}

            {activeTab === 'ia' && iaStage === 'selectCargo' && analysisResult && (
                <div className="flex shrink-0 justify-end rounded-b-[32px] border-t border-border bg-card px-6 py-2.5 dark:border-white/5 dark:bg-zinc-900">
                    <button
                        type="button"
                        onClick={hasOnlyGenericCargoAnalysis() ? handleIaImport : handleExtractSelectedCargo}
                        disabled={(!hasOnlyGenericCargoAnalysis() && !selectedCargoId) || Boolean(missingContentSource && pdfFiles.length <= missingContentSource.originalFileCount)}
                        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] bg-primary px-5 text-[10px] font-black uppercase tracking-[0.1em] text-white shadow-lg shadow-primary/15 transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        <Sparkles size={15} />
                        {hasOnlyGenericCargoAnalysis()
                            ? 'ANALISAR NOVAMENTE'
                            : missingContentSource
                                ? pdfFiles.length > missingContentSource.originalFileCount
                                    ? 'USAR ANEXO E CONTINUAR'
                                    : 'ADICIONE O ANEXO PARA CONTINUAR'
                                : 'CONTINUAR EXTRAÇÃO'}
                    </button>
                </div>
            )}
            
            {/* ── Sugerir Edital Drawer ── */}
            <AnimatePresence>
                {showSuggestSlide && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSuggestSlide(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-[32px] z-10"
                        />
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="absolute inset-y-0 right-0 w-full max-w-sm bg-card dark:bg-zinc-900 border-l border-border dark:border-white/10 rounded-r-[32px] flex flex-col z-20 shadow-2xl"
                        >
                            <div className="px-6 pt-7 pb-5 border-b border-white/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                                        <MessageSquare size={18} className="text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Sugerir Edital</h3>
                                        <p className="text-[11px] text-content-muted mt-0.5">Vamos analisar e cadastrar em breve</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSuggestSlide(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-secondary dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-content-muted hover:text-zinc-900 dark:hover:text-zinc-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col justify-center px-6 pb-8">
                                {suggestionSent ? (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-center py-8"
                                    >
                                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                                            <CheckCircle2 className="text-emerald-400" size={32} />
                                        </div>
                                        <h4 className="text-base font-black text-zinc-900 dark:text-zinc-100 mb-2">Sugestão Enviada!</h4>
                                        <p className="text-sm text-content-muted mb-6 leading-relaxed">
                                            Recebemos sua sugestão para <span className="text-primary font-bold">{suggestConcurso}</span>. Iremos analisar e te notificaremos quando disponível.
                                        </p>
                                        <button
                                            onClick={() => setShowSuggestSlide(false)}
                                            className="px-8 py-3 bg-secondary light:bg-slate-100 dark:bg-zinc-800 hover:bg-secondary-strong light:hover:bg-slate-200 dark:hover:bg-zinc-700 text-foreground light:text-slate-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all"
                                        >
                                            FECHAR
                                        </button>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em]">
                                                Nome do Concurso / Edital
                                            </label>
                                            <input
                                                type="text"
                                                value={suggestConcurso}
                                                onChange={e => setSuggestConcurso(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && suggestConcurso.trim() && handleSendSuggestion()}
                                                placeholder="Ex: PCES, PMES, INSS, TRT..."
                                                autoFocus
                                                className="w-full h-12 bg-secondary dark:bg-zinc-950/80 border border-border dark:border-white/8 rounded-2xl px-5 text-sm font-medium text-content-main placeholder:text-content-muted/40 focus:outline-none focus:border-primary/40 transition-all"
                                            />
                                            <p className="text-[10px] text-content-muted pl-1">
                                                Informe o nome ou sigla do concurso que deseja ter disponível no catálogo.
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleSendSuggestion}
                                            disabled={!suggestConcurso.trim() || isSendingSuggestion}
                                            className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                        >
                                            {isSendingSuggestion ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Send size={15} />
                                                    ENVIAR SUGESTÃO
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
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
