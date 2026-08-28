import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toastGate } from '@/lib/errors/toastGate';
import { errorService } from '@/lib/errors/errorService';
import { supabase } from '@/integrations/supabase/client';
import { invokeUserRpc } from '@/services/userRpcService';
import { mergeRecoveredCesgranrioBasicSubjects, recoverCesgranrioBasicSubjects } from '@/utils/cesgranrioContentStructure';
import { detectCargoOptionsFromEditalText, type DetectedCargoOption } from '@/utils/editalCargoDetector';
import { sliceTextForSubjects } from '@/utils/editalTextSlicer';
import { extractPdfText, type PdfTextExtractionResult } from '@/utils/pdfTextExtractor';
import {
    formatExamWeightInputValue,
    getExamWeightTotals,
    getEffectiveSubjectExamWeight,
    getSubjectExamWeightLine,
    parseOptionalExamWeightNumber
} from '@/utils/examWeight';
import type { AiSourceMode } from './AiSourceStep';
import type { AiSubject, AiTopic } from './AiReviewStep';
import type { AiEditalAnalysis } from './AiCargoSelectionStep';

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

export type WeightExtractionStatus = 'idle' | 'found' | 'not_found' | 'block_only' | 'ambiguous' | 'failed';

export type ExtractedSubjectWeight = {
    subjectId: string;
    points: number | null;
    questions: number | null;
    percentage: number | null;
    rawText: string | null;
};

export type ExtractedBlockWeight = {
    blockName?: string | null;
    points?: number | null;
    questions?: number | null;
    percentage?: number | null;
    rawText?: string | null;
};

export type WeightExtractionResponse = {
    status?: WeightExtractionStatus;
    subjects?: ExtractedSubjectWeight[];
    blockWeights?: ExtractedBlockWeight[];
    message?: string | null;
};

export interface UserAiLimits {
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

export interface MappedSubjectAnchor {
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

export type DocumentPayload = {
    inputText?: string;
    pdfUrl?: string;
    pdfPath?: string;
    pdfFileUri?: string;
    pdfPaths?: string[];
    sourceType: 'text' | 'pdf';
    detectedCargoOptions?: DetectedCargoOption[];
};

export function useAiEditalExtraction(isOpen: boolean, activeTab: string) {
    const { user } = useAuth();
    const [iaOrigin, setIaOrigin] = useState('');
    const [iaPosition, setIaPosition] = useState('');
    const [iaBanca, setIaBanca] = useState('');
    const [iaYear, setIaYear] = useState('');
    const [examDate, setExamDate] = useState('');
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
    const [showIaDataEditor, setShowIaDataEditor] = useState(false);
    const [weightExtractionStatus, setWeightExtractionStatus] = useState<WeightExtractionStatus>('idle');
    const [weightBlockInfo, setWeightBlockInfo] = useState<ExtractedBlockWeight[]>([]);
    
    const iaFlowCancelledRef = useRef(false);
    const aiRequestAbortRef = useRef<AbortController | null>(null);
    const pdfInputRef = useRef<HTMLInputElement | null>(null);

    const [aiLimits, setAiLimits] = useState<UserAiLimits | null>(null);
    const [loadingAiLimits, setLoadingAiLimits] = useState(false);

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

    const hasOnlyGenericCargoAnalysis = () => {
        if (!analysisResult?.cargos?.length) return false;
        return analysisResult.cargos.length === 1 && isGenericCargoName(analysisResult.cargos[0]?.name);
    };

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

        if (inString) result += '"';
        result = result.trim().replace(/,\s*$/, "");
        while (stack.length > 0) {
            result += stack.pop();
        }

        return result;
    };

    const cleanSubjectTitle = (rawTitle: string): string => {
        return rawTitle
            .replace(/^DISCIPLINA:\s*/i, '')
            .replace(/^MATÉRIA:\s*/i, '')
            .replace(/^CONTEÚDO:\s*/i, '')
            .replace(/^\d+[.\-)]\s*/, '')
            .replace(/:$/, '')
            .trim();
    };

    const mergeRecoveredCesgranrioBasicAiSubjects = (
        subjects: AiSubject[],
        sourceText?: string,
        cargoName?: string | null,
    ): AiSubject[] => {
        if (!sourceText) return subjects;
        const recoveredBasicSubjects = recoverCesgranrioBasicSubjects(sourceText, cargoName);
        if (recoveredBasicSubjects.length === 0) return subjects;

        const normalizedSubjectTitles = new Set(
            subjects.map(subject => subject.title.trim().toLowerCase())
        );

        const newRecoveredAiSubjects: AiSubject[] = recoveredBasicSubjects
            .filter(recovered => !normalizedSubjectTitles.has(recovered.name.trim().toLowerCase()))
            .map((recovered, idx) => ({
                id: `cesgranrio-recovered-${idx}-${Date.now()}`,
                title: recovered.name,
                knowledgeType: 'Conhecimentos Básicos',
                expanded: false,
                topics: (recovered.topics || []).map((topic, tIdx) => ({
                    id: `cesgranrio-rec-top-${idx}-${tIdx}`,
                    name: topic.name,
                    selected: true,
                    position: topic.position ?? tIdx,
                }))
            }));

        if (newRecoveredAiSubjects.length === 0) return subjects;
        return [...newRecoveredAiSubjects, ...subjects];
    };

    const hydrateDocumentPayloadText = async (payload: DocumentPayload): Promise<DocumentPayload> => {
        if (payload.inputText?.trim()) return payload;

        const pathsToHydrate = payload.pdfPaths?.length
            ? payload.pdfPaths
            : payload.pdfPath
                ? [payload.pdfPath]
                : [];

        if (pathsToHydrate.length === 0) return payload;

        try {
            const extractedChunks: string[] = [];
            for (const path of pathsToHydrate) {
                const { data, error } = await supabase.storage
                    .from('edital-files')
                    .download(path);
                if (error || !data) continue;
                const file = new File([data], path.split('/').pop() || 'documento.pdf', { type: 'application/pdf' });
                const extracted = await extractPdfText(file);
                if (extracted.fullText.trim()) extractedChunks.push(extracted.fullText.trim());
            }

            if (extractedChunks.length > 0) {
                const combined = extractedChunks.join('\n\n--- NOVO DOCUMENTO ---\n\n');
                return {
                    ...payload,
                    inputText: combined,
                    detectedCargoOptions: detectCargoOptionsFromEditalText(combined)
                };
            }
        } catch (err) {
            console.warn('[hydrateDocumentPayloadText] Falha ao hidratar texto:', err);
        }

        return payload;
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
                const storedAiResult = Array.isArray(data.ai_result) ? data.ai_result as unknown as AiSubject[] : [];
                const storedAnalysis = (data.analysis_result as unknown as AiEditalAnalysis) || null;
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
                            .update({ ai_result: repairedAiResult as unknown as unknown[] })
                            .eq('id', data.id);
                    }
                }

                setAiResult(restoredAiResult);
                setAnalysisResult(storedAnalysis);
                if (storedMissingContent) {
                    setMissingContentSource({
                        message: storedMissingContent.message,
                        originalFileCount: 0,
                    });
                } else if (!restoredAiResult.length && !restoredSourcePayload?.inputText && !restoredSourcePayload?.pdfUrl && !restoredSourcePayload?.pdfPath) {
                    setMissingContentSource({
                        message: 'Rascunho recuperado. Anexe o arquivo PDF do edital para extrair as disciplinas deste cargo.',
                        originalFileCount: 1,
                    });
                } else {
                    setMissingContentSource(null);
                }
                setSelectedCargoName(storedCargoName);
                setSelectedCargoId(resolveCargoIdFromAnalysis(storedAnalysis, storedCargoName));
                if (restoredSourcePayload) setSourcePayload(restoredSourcePayload);
                setIaEditalName(data.edital_name);
                const pendingExamDate = storedAnalysis?.edital?.examDate || storedAnalysis?.edital?.exam_date;
                if (data.origin || storedAnalysis?.edital?.organ) setIaOrigin(data.origin || storedAnalysis?.edital?.organ || '');
                if (storedAnalysis?.edital?.banca) setIaBanca(storedAnalysis.edital.banca);
                if (data.position) setIaPosition(data.position);
                setIaYear(data.year || storedAnalysis?.edital?.year || '');
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

    const discardPendingExtractionData = async () => {
        if (!user) return;
        try {
            await supabase
                .from('pending_ai_extractions')
                .delete()
                .eq('user_id', user.id);
            setPendingExtraction(null);
            setAiResult([]);
            setAnalysisResult(null);
            setSourcePayload(null);
            setIaStage('input');
        } catch (err) {
            console.error('Erro ao descartar extração pendente:', err);
        }
    };

    const extractSelectedPdfText = async (files: File[]): Promise<string> => {
        const textParts: string[] = [];
        for (const file of files) {
            const res: PdfTextExtractionResult = await extractPdfText(file);
            if (res.fullText.trim()) {
                textParts.push(res.fullText.trim());
            }
        }
        return textParts.join('\n\n--- NOVO DOCUMENTO ---\n\n');
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(event.target.files || []);
        if (newFiles.length === 0) return;
        const uniqueFiles = [...pdfFiles, ...newFiles.filter(f => !pdfFiles.some(pf => pf.name === f.name && pf.size === f.size))];
        setPdfFiles(uniqueFiles);
        setAiSourceMode('pdf');
        setSourcePayload(null);
        setAiResult([]);
        setIaErrorMessage('');
        setMissingContentSource(null);
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

    const handleJourneySecondaryAction = () => {
        if (iaStage === 'analyzing' || iaStage === 'extracting') {
            iaFlowCancelledRef.current = true;
            aiRequestAbortRef.current?.abort();
            setIaStage(analysisResult ? 'selectCargo' : 'input');
            return;
        }

        if (iaStage === 'review') {
            setIaStage('selectCargo');
            return;
        }

        setIaStage('input');
    };

    const getAiErrorHeading = () => {
        if (!iaErrorMessage) return '';
        if (iaErrorMessage.includes('limite') || iaErrorMessage.includes('cota')) return 'Limite atingido';
        if (iaErrorMessage.includes('documento') || iaErrorMessage.includes('anexo')) return 'Documento incompleto';
        return 'Erro na extração';
    };

    const getFriendlyAiExtractionError = (rawMessage: string): string => {
        const lower = rawMessage.toLowerCase();
        if (lower.includes('rate limit') || lower.includes('quota') || lower.includes('ai_limit_exceeded')) {
            return 'O serviço de inteligência artificial atingiu o limite de requisições temporário. Aguarde alguns instantes ou verifique seus créditos.';
        }
        if (lower.includes('content_source_missing') || lower.includes('conteúdo programático') || lower.includes('anexo') || lower.includes('forneca um arquivo pdf')) {
            return rawMessage;
        }
        return 'Não foi possível extrair o conteúdo do edital. Tente novamente ou use outro arquivo.';
    };

    const buildDocumentPayload = async (): Promise<DocumentPayload> => {
        if (sourcePayload?.inputText?.trim() || sourcePayload?.pdfUrl || sourcePayload?.pdfPath || sourcePayload?.pdfFileUri) {
            return sourcePayload;
        }
        if (pdfFiles.length > 0) {
            const rawText = await extractSelectedPdfText(pdfFiles);
            return {
                sourceType: 'pdf',
                inputText: rawText,
                detectedCargoOptions: detectCargoOptionsFromEditalText(rawText)
            };
        }
        const rawText = inputText.trim();
        if (rawText) {
            return {
                sourceType: aiSourceMode,
                inputText: rawText,
                detectedCargoOptions: detectCargoOptionsFromEditalText(rawText)
            };
        }
        return sourcePayload || {
            sourceType: aiSourceMode,
            inputText: '',
            detectedCargoOptions: []
        };
    };

    const getInputTextForFunction = (payload: DocumentPayload): string => {
        return payload.inputText || '';
    };

    const getDetectedCargoOptionsForFunction = (payload: DocumentPayload): DetectedCargoOption[] => {
        return payload.detectedCargoOptions || [];
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const applyAnalysisToForm = (analysis: AiEditalAnalysis) => {
        if (analysis.edital.organ && !iaOrigin) setIaOrigin(analysis.edital.organ);
        if (analysis.edital.banca && !iaBanca) setIaBanca(analysis.edital.banca);
        if (analysis.edital.year && !iaYear) setIaYear(analysis.edital.year);
        const detectedExamDate = analysis.edital.examDate || analysis.edital.exam_date;
        if (detectedExamDate && !examDate) setExamDate(detectedExamDate);
    };

    const savePendingExtraction = async (editalName: string, subjects: AiSubject[], extra?: { analysis?: AiEditalAnalysis | null; selectedCargo?: string | null; source?: DocumentPayload | null }) => {
        if (!user) return;
        try {
            await supabase.from('pending_ai_extractions').upsert({
                user_id: user.id,
                edital_name: editalName,
                ai_result: subjects as unknown as unknown[],
                analysis_result: (extra?.analysis || analysisResult) as unknown as Record<string, unknown>,
                selected_cargo: extra?.selectedCargo ?? selectedCargoName,
                source_type: extra?.source?.sourceType || sourcePayload?.sourceType || 'text',
                pdf_url: extra?.source?.pdfUrl || sourcePayload?.pdfUrl || null,
                source_files: extra?.source?.pdfPaths || sourcePayload?.pdfPaths || [],
                origin: iaOrigin,
                position: iaPosition,
                year: iaYear,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        } catch (err) {
            console.warn('[savePendingExtraction] Erro ao gravar rascunho:', err);
        }
    };

    const mapIncrementalSubjectToAiSubject = (
        rawSubject: unknown,
        mappedAnchor: MappedSubjectAnchor,
        index: number
    ): AiSubject | null => {
        const rec = asRecord(rawSubject);
        const title = cleanSubjectTitle(getString(rec, 'disciplina', 'title', 't') || mappedAnchor.titulo);
        const knowledgeType = getString(rec, 'tipo', 'tipo_conhecimento', 'type') || mappedAnchor.tipo_conhecimento || null;
        const rawTopics = getArray(rec, 'topicos', 'topics', 'p');
        
        const topics: AiTopic[] = rawTopics.map((rawTopic, tIdx) => {
            const topRec = asRecord(rawTopic);
            const name = typeof rawTopic === 'string' ? rawTopic : getString(topRec, 'name', 'n');
            return {
                id: `inc-top-${index}-${tIdx}-${Date.now()}`,
                name: name.trim(),
                selected: true,
                position: tIdx,
            };
        }).filter(t => t.name.length >= 2);

        const finalTopics: AiTopic[] = topics.length > 0
            ? topics
            : [{
                id: `inc-top-${index}-0-${Date.now()}`,
                name: title,
                selected: true,
                position: 0,
            }];

        return {
            id: `inc-subj-${index}-${Date.now()}`,
            title,
            knowledgeType,
            topics: finalTopics,
            selected: true,
            expanded: false
        };
    };

    const isAiRateLimitMessage = (msg: string): boolean => {
        const l = msg.toLowerCase();
        return l.includes('rate limit') || l.includes('429') || l.includes('too many requests');
    };

    const getFunctionErrorMessage = async (error: unknown, response?: Response): Promise<string> => {
        if (response) {
            try {
                const text = await response.text();
                const parsed = JSON.parse(text);
                if (parsed.message) return parsed.message;
            } catch {
                // ignore
            }
        }
        return getErrorMessage(error);
    };

    const extractOptionalWeightsForSubjects = async (
        baseSubjects: AiSubject[],
        documentPayload: DocumentPayload,
        cargoName: string,
        signal: AbortSignal
    ): Promise<AiSubject[]> => {
        try {
            const weightResult = await supabase.functions.invoke('extract-edital', {
                body: {
                    mode: 'extractWeights',
                    inputText: documentPayload.inputText,
                    selectedCargo: cargoName,
                    subjects: baseSubjects.map(s => ({ id: s.id, name: s.title, type: s.knowledgeType }))
                },
                signal,
            });

            if (weightResult.error || !weightResult.data) {
                setWeightExtractionStatus('not_found');
                return baseSubjects;
            }

            const data = weightResult.data as WeightExtractionResponse;
            setWeightExtractionStatus(data.status || 'not_found');
            if (data.blockWeights) setWeightBlockInfo(data.blockWeights);

            if (data.status === 'found' && data.subjects?.length) {
                const weightMap = new Map(data.subjects.map(s => [s.subjectId, s]));
                return baseSubjects.map(subject => {
                    const weight = weightMap.get(subject.id);
                    if (!weight) return subject;
                    return {
                        ...subject,
                        examWeightPoints: weight.points,
                        examWeightQuestions: weight.questions,
                        examWeightPercentage: weight.percentage,
                        examWeightRaw: weight.rawText,
                    };
                });
            }

            return baseSubjects;
        } catch (err) {
            if (signal.aborted) return baseSubjects;
            console.warn('[extract-edital weights] Falha opcional. Continuando sem peso.', err);
            setWeightExtractionStatus('failed');
            return baseSubjects;
        }
    };

    const tryIncrementalExtraction = async (
        documentPayload: DocumentPayload,
        confirmedAnalysis: AiEditalAnalysis,
        cargo: AiEditalAnalysis['cargos'][number],
        confirmedCargoName: string,
        signal: AbortSignal,
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
            },
            signal,
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
                    },
                    signal,
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
        aiRequestAbortRef.current?.abort();
        const requestController = new AbortController();
        aiRequestAbortRef.current = requestController;
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

        let progressInterval: ReturnType<typeof setInterval> | null = null;
        try {
            const targetCargoBeforeAnalysis = iaPosition.trim();
            const documentPayload = await buildDocumentPayload();
            if (iaFlowCancelledRef.current || requestController.signal.aborted) return;
            const detectedCargoOptions = getDetectedCargoOptionsForFunction(documentPayload);
            setSourcePayload(documentPayload);
            setProcessingMsg('Identificando cargos e áreas...');
            setIaProgress(15);

            progressInterval = setInterval(() => {
                setIaProgress((prev) => {
                    if (prev < 40) return prev + 5;
                    if (prev < 75) return prev + 2;
                    if (prev < 88) return prev + 1;
                    return prev;
                });
            }, 300);

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
                },
                signal: requestController.signal,
            });

            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }

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
            setIaProgress(100);
            await sleep(220);

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
            if (progressInterval) clearInterval(progressInterval);
            if (iaFlowCancelledRef.current) return;
            console.error('Erro na IA:', error);
            const msg = getErrorMessage(error);

            if (msg.includes('AI_LIMIT_EXCEEDED') || msg.toLowerCase().includes('esgotou seu limite') || msg.toLowerCase().includes('cota comercial')) {
                fetchAiLimits();
            }

            const friendly = getFriendlyAiExtractionError(msg);
            setIaErrorMessage(friendly);
            errorService.report(error, {
                module: 'ai-extraction',
                action: 'analyze-edital',
                severity: 'high',
                scope: 'core',
                userMessage: friendly,
                showToast: false
            });
            toastGate.notifyError(friendly, 'IA-01');
            setIaStage('input');
        } finally {
            if (aiRequestAbortRef.current === requestController) {
                aiRequestAbortRef.current = null;
            }
        }
    };

    const handleExtractSelectedCargo = async () => {
        if (!analysisResult || !analysisResult.cargos?.length) {
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
                    : item)
                : [...analysisResult.cargos, cargo]
        };

        aiRequestAbortRef.current?.abort();
        const requestController = new AbortController();
        aiRequestAbortRef.current = requestController;
        setIaStage('extracting');
        setIaProgress(10);
        setProcessingMsg(`Extraindo disciplinas de ${confirmedCargoName}...`);
        setIaErrorMessage('');
        setWeightExtractionStatus('idle');

        try {
            const documentPayload = await buildDocumentPayload();
            if (iaFlowCancelledRef.current || requestController.signal.aborted) return;
            
            const hasDocumentContent = !!(
                documentPayload.inputText?.trim() ||
                documentPayload.pdfUrl ||
                documentPayload.pdfPath ||
                documentPayload.pdfFileUri
            );

            if (!hasDocumentContent) {
                setIaStage('selectCargo');
                setMissingContentSource({
                    message: 'Para extrair as disciplinas deste cargo, anexe novamente o arquivo PDF do edital abaixo.',
                    originalFileCount: 1
                });
                toastGate.notifyWarning('Por favor, anexe o PDF do edital para extrair as disciplinas.', 'IA-DOC-01');
                return;
            }

            let finalSubjects: AiSubject[] | undefined = undefined;

            try {
                const incrementalSubjects = await tryIncrementalExtraction(
                    documentPayload,
                    confirmedAnalysis,
                    cargo,
                    confirmedCargoName,
                    requestController.signal
                );
                if (incrementalSubjects && incrementalSubjects.length > 0) {
                    finalSubjects = incrementalSubjects;
                }
            } catch (incrementalErr) {
                console.warn('[handleExtractSelectedCargo] Extração incremental falhou ou incompleta, executando fallback extractForCargo:', incrementalErr);
            }

            if (!finalSubjects?.length) {
                setProcessingMsg('Extraindo disciplinas do cargo...');
                setIaProgress(45);
                const result = await supabase.functions.invoke('extract-edital', {
                    body: {
                        mode: 'extractForCargo',
                        inputText: getInputTextForFunction(documentPayload),
                        pdfUrl: documentPayload.pdfUrl,
                        pdfPath: documentPayload.pdfPath,
                        pdfFileUri: documentPayload.pdfFileUri,
                        origin: iaOrigin,
                        banca: iaBanca,
                        year: iaYear,
                        selectedCargo: confirmedCargoName,
                        selectedCargoId: cargo.id,
                        analysis: confirmedAnalysis,
                        detectedCargoOptions: getDetectedCargoOptionsForFunction(documentPayload)
                    },
                    signal: requestController.signal,
                });

                if (result.error) {
                    const errBody = await getFunctionErrorMessage(result.error, result.response);
                    throw new Error(errBody);
                }

                if (result.data?.pdfFileUri) {
                    documentPayload.pdfFileUri = result.data.pdfFileUri;
                    setSourcePayload({ ...documentPayload });
                }

                finalSubjects = (result.data?.extraction?.subjects || result.data?.subjects) as AiSubject[] | undefined;
                if (!finalSubjects?.length) {
                    throw new Error('A extração não retornou disciplinas para o cargo.');
                }
            }

            setIaProgress(88);
            setProcessingMsg('Verificando pesos da prova...');

            const weightedSubjects = await extractOptionalWeightsForSubjects(
                finalSubjects,
                documentPayload,
                confirmedCargoName,
                requestController.signal
            );

            setIaProgress(100);
            setAiResult(weightedSubjects);
            const editalName = iaEditalName || `${confirmedAnalysis.edital.organ || 'Edital'} - ${confirmedAnalysis.edital.year || ''}`;
            await savePendingExtraction(editalName, weightedSubjects, {
                analysis: confirmedAnalysis,
                selectedCargo: confirmedCargoName,
                source: documentPayload
            });

            setIaStage('review');

        } catch (error: unknown) {
            if (iaFlowCancelledRef.current) return;
            console.error('Erro na extração do cargo:', error);
            const msg = getErrorMessage(error);
            const friendly = getFriendlyAiExtractionError(msg);
            setIaErrorMessage(friendly);
            toastGate.notifyError(friendly, 'IA-CARGO-EXTRACT');
            setIaStage('selectCargo');
        } finally {
            if (aiRequestAbortRef.current === requestController) {
                aiRequestAbortRef.current = null;
            }
        }
    };

    const aiExamWeightTotals = useMemo(() => {
        return getExamWeightTotals(aiResult.map(s => ({
            exam_weight_points: s.examWeightPoints ?? null,
            exam_weight_questions: s.examWeightQuestions ?? null,
            exam_weight_percentage: s.examWeightPercentage ?? null,
            exam_weight_raw: s.examWeightRaw ?? null,
        })));
    }, [aiResult]);

    useEffect(() => {
        if (isOpen && activeTab === 'ia') {
            fetchAiLimits();
            loadPendingExtraction();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, activeTab]);

    return {
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
        setPdfFiles,
        aiSourceMode,
        setAiSourceMode,
        showOptionalContext,
        setShowOptionalContext,
        iaStage,
        setIaStage,
        iaEditalName,
        setIaEditalName,
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
        fetchAiLimits,
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
    };
}
