import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Sparkles, Loader2, Edit3, ChevronUp, ChevronDown, Trash2, Save, Plus, X, MessageSquare, CalendarDays, Database, Send, CheckCircle2, AlertTriangle, Info, Eye, ArrowLeft, BookOpen, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Subject } from '@/types';
import { UserEdital } from '@/pages/Editais';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface AiTopic {
    name: string;
    selected: boolean;
    position?: number;
}

interface AiSubject {
    id: string;
    title: string;
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
    }>;
}

type DocumentPayload = {
    inputText?: string;
    pdfUrl?: string;
    pdfPath?: string;
    pdfFileUri?: string;
    sourceType: 'text' | 'pdf';
};

interface ImportEditalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (subjects: Subject[], editalName?: string, isImported?: boolean, sourceId?: string, extraInfo?: { organ: string; position: string; year: string; category?: string; exam_date?: string }) => Promise<void> | void;
    subjects: Subject[];
    userEditais?: UserEdital[];
    initialTab?: 'ready' | 'ia' | 'manual';
    manualModeChildren?: React.ReactNode;
    /** Renderiza o modal de forma inline sem os wrappers fixed e overlay */
    inlineMode?: boolean;
}

export const ImportEditalModal = ({ isOpen, onClose, onImport, subjects, userEditais = [], initialTab = 'ready', manualModeChildren, inlineMode = false }: ImportEditalModalProps) => {
    const { user } = useAuth();
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

    // Manual States
    const [manualOrigin, setManualOrigin] = useState('');
    const [manualPosition, setManualPosition] = useState('');
    const [importingManual, setImportingManual] = useState(false);
    const [manualYear, setManualYear] = useState('');
    const [iaYear, setIaYear] = useState(new Date().getFullYear().toString());
    const [examDate, setExamDate] = useState('');

    // IA States
    const [inputText, setInputText] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
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
    const iaFlowCancelledRef = useRef(false);

    // Legacy complement mode states (kept for compatibility)
    const [isComplementMode, setIsComplementMode] = useState(false);
    const [selectedEditalToComplement, setSelectedEditalToComplement] = useState<string | null>(null);
    const [iaComplementSubjectName, setIaComplementSubjectName] = useState('');
    const [manualComplementSubjectName, setManualComplementSubjectName] = useState('');
    const [manualComplementTopics, setManualComplementTopics] = useState('');

    // Filter user editais (not from public catalog)
    const userCreatedEditais = userEditais.filter(e => !e.sourceId);

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
            name: string;
            topics: { name: string }[];
        }[];
        category?: string;
        exam_date?: string;
        published_at?: string;
    }
    const [editais, setEditais] = useState<ReadyEdital[]>([]);
    const [loadingEditais, setLoadingEditais] = useState(true);
    const [importingReadyEditalId, setImportingReadyEditalId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPublicEditais = async () => {
            try {
                const { data, error } = await (supabase as any)
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

    const loadPendingExtraction = async () => {
        if (!user) return;
        setLoadingPending(true);
        try {
            const { data, error } = await (supabase as any)
                .from('pending_ai_extractions')
                .select('id, edital_name, updated_at, ai_result, analysis_result, selected_cargo, source_type, pdf_url, origin, position, year')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (data && !error) {
                if (!Array.isArray(data.ai_result) || data.ai_result.length === 0) {
                    await (supabase as any)
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
                setAiResult(data.ai_result);
                setAnalysisResult(data.analysis_result || null);
                setSelectedCargoName(data.selected_cargo || data.position || '');
                setSelectedCargoId(data.selected_cargo || data.position || '');
                if (data.source_type || data.pdf_url) {
                    const storedPdfRef = data.pdf_url || undefined;
                    setSourcePayload({
                        sourceType: data.source_type === 'pdf' ? 'pdf' : 'text',
                        pdfUrl: storedPdfRef?.startsWith('http') ? storedPdfRef : undefined,
                        pdfPath: storedPdfRef && !storedPdfRef.startsWith('http') ? storedPdfRef : undefined
                    });
                }
                setIaEditalName(data.edital_name);
                if (data.origin) setIaOrigin(data.origin);
                if (data.position) setIaPosition(data.position);
                setIaYear(data.year);
                setIaStage(data.ai_result?.length ? 'review' : data.analysis_result ? 'selectCargo' : 'input');
            }
        } catch (err: any) {
            console.error('[loadPending] catch error:', err?.code, err?.message);
        } finally {
            setLoadingPending(false);
        }
    };

    useEffect(() => {
        if (isOpen && activeTab === 'ia') {
            loadPendingExtraction();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, activeTab]);

    const getProgressTarget = (stage: typeof iaStage, message: string) => {
        const normalized = message.toLowerCase();
        if (stage === 'analyzing') {
            if (normalized.includes('extraindo cargos')) return 88;
            if (normalized.includes('identificando')) return 66;
            return 24;
        }
        if (stage === 'extracting') {
            if (normalized.includes('finalizando')) return 92;
            if (normalized.includes('verificando')) return 78;
            if (normalized.includes('mapeando')) return 58;
            if (normalized.includes('identificando')) return 38;
            return 20;
        }
        return 0;
    };

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
    }, [iaStage, processingMsg]);

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
            const { data: existing } = await (supabase as any)
                .from('pending_ai_extractions')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            const payload = {
                user_id: user.id,
                edital_name: editalName,
                origin: iaOrigin,
                position: iaPosition,
                year: iaYear,
                ai_result: results,
                analysis_result: options?.analysis ?? analysisResult,
                selected_cargo: (options?.selectedCargo ?? selectedCargoName) || null,
                source_type: options?.source?.sourceType ?? sourcePayload?.sourceType ?? null,
                pdf_url: options?.source?.pdfPath ?? options?.source?.pdfUrl ?? sourcePayload?.pdfPath ?? sourcePayload?.pdfUrl ?? null
            };

            if (existing) {
                await (supabase as any)
                    .from('pending_ai_extractions')
                    .update(payload)
                    .eq('id', existing.id);
            } else {
                const { data: inserted } = await (supabase as any)
                    .from('pending_ai_extractions')
                    .insert(payload)
                    .select('id')
                    .single();
                if (inserted?.id) {
                    setPendingExtraction(prev => prev ? { ...prev, id: inserted.id } : prev);
                }
            }
        } catch (err: any) {
            console.error('[savePending] catch error:', err?.code, err?.message);
        }
    };

    const handleResumePendingExtraction = () => {
        setActiveTab('ia');
        if (aiResult.length > 0) {
            setIaStage('review');
            return;
        }
        if (analysisResult?.cargos?.length) {
            setIaStage('selectCargo');
            return;
        }
        setIaStage('input');
    };

    const discardPendingExtractionData = async () => {
        if (pendingExtraction && user && pendingExtraction.id && !pendingExtraction.id.startsWith('pending-')) {
            try {
                await (supabase as any)
                    .from('pending_ai_extractions')
                    .delete()
                    .eq('id', pendingExtraction.id);
            } catch (err: any) {
                console.warn('[discardPending]', err?.code ?? err?.message);
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
        setInputText('');
        setPdfFile(null);
        setExamDate('');
    };

    const handleCloseModal = async () => {
        const shouldDiscardIaState =
            activeTab === 'ia' &&
            ['analyzing', 'extracting', 'selectCargo', 'review'].includes(iaStage);

        if (shouldDiscardIaState) {
            iaFlowCancelledRef.current = true;
            await discardPendingExtractionData();
        }

        onClose();
    };

    const resetPendingState = () => {
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
        setInputText('');
        setPdfFile(null);
        setExamDate('');
    };

    useEffect(() => {
        setActiveTab(initialTab);
        if (!isOpen) {
            resetPendingState();
        } else if (user) {
            loadPendingExtraction();
        }
    }, [initialTab, isOpen, user]);

    const handleOpenSuggest = () => {
        setSuggestConcurso(searchQuery.trim());
        setSuggestionSent(false);
        setShowSuggestSlide(true);
    };

    const handleSendSuggestion = async () => {
        if (!suggestConcurso.trim()) return;
        setIsSendingSuggestion(true);
        try {
            await (supabase as any)
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toastGate.notifyError('O arquivo deve ter no máximo 5MB. Use o campo de texto se o arquivo for maior.', 'PDF-01', { severity: 'low' });
                e.target.value = '';
                return;
            }
            if (file.type !== 'application/pdf') {
                toastGate.notifyError('Apenas arquivos PDF são aceitos.', 'PDF-02', { severity: 'low' });
                e.target.value = '';
                return;
            }
            setPdfFile(file);
            setInputText(''); // limpa texto se enviar pdf
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

        let parsed: any;
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
                            title, 
                            topics, 
                            selected: true,
                            expanded: harvested.length === 0
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
            const rawData = parsed.s || parsed.subjects || parsed;
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

            const result = rawSubjects.map((s: any, idx: number): AiSubject => ({
                id: `ia-${idx}-${Date.now()}`,
                title: s.t || s.title || "Sem Título",
                expanded: idx === 0,
                topics: (s.p || s.topics || []).map((t: any, tIdx: number): AiTopic => {
                    const rawName = typeof t === 'string' ? t : (t.n || t.name || "");
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
            }));
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

    const getFunctionErrorMessage = async (error: any, response?: Response) => {
        const errorResponse = response || error?.context;
        if (errorResponse && typeof errorResponse.clone === 'function') {
            try {
                const body = await errorResponse.clone().json();
                return body?.error || body?.message || JSON.stringify(body);
            } catch {
                try {
                    const text = await errorResponse.clone().text();
                    if (text) return text;
                } catch {
                    // Mantem fallback abaixo.
                }
            }
        }
        return error?.message || JSON.stringify(error);
    };

    const buildDocumentPayload = async () => {
        const payload: DocumentPayload = { sourceType: 'text' };

        if (pdfFile) {
            if (!user?.id) {
                throw new Error('Sua sessão expirou. Faça login novamente para enviar o PDF.');
            }

            setProcessingMsg('Lendo o documento...');
            const safeFileName = pdfFile.name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9._-]/g, '-')
                .replace(/-+/g, '-')
                .toLowerCase();
            const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeFileName || 'edital.pdf'}`;
            const { error: uploadError } = await supabase.storage
                .from('temporary_editais')
                .upload(fileName, pdfFile, {
                    contentType: 'application/pdf',
                    upsert: false
                });

            if (uploadError) {
                console.error('Erro no upload:', uploadError);
                throw new Error('Falha ao enviar o arquivo para o storage temporário.');
            }

            payload.pdfPath = fileName;
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

    const applyAnalysisToForm = (analysis: AiEditalAnalysis) => {
        const edital = analysis.edital;
        if (edital.organ) setIaOrigin(edital.organ);
        if (edital.year) setIaYear(edital.year);
        if (edital.examDate) setExamDate(edital.examDate);
        if (edital.name) setIaEditalName(edital.name);
    };

    const mapExtractionToAiSubjects = (extraction: any): AiSubject[] => {
        const rawSubjects = Array.isArray(extraction?.subjects) ? extraction.subjects : [];
        return rawSubjects.map((s: any, idx: number): AiSubject => ({
            id: `ia-${idx}-${Date.now()}`,
            title: s.title || s.name || 'Sem Título',
            selected: true,
            expanded: idx === 0,
            weight: {
                points: s.weight?.points ?? null,
                questions: s.weight?.questions ?? null,
                percentage: s.weight?.percentage ?? null,
                rawText: s.weight?.rawText ?? null
            },
            topics: (Array.isArray(s.topics) ? s.topics : []).map((t: any, tIdx: number): AiTopic => ({
                name: String(typeof t === 'string' ? t : t.name || '').trim(),
                selected: true,
                position: typeof t?.position === 'number' ? t.position : tIdx
            })).filter((t: AiTopic) => t.name.length >= 2)
        })).filter((s: AiSubject) => s.title.trim().length > 0 && s.topics.length > 0);
    };

    const handleIaImport = async () => {
        iaFlowCancelledRef.current = false;
        setIaStage('analyzing');
        setIaProgress(0);
        setProcessingMsg('Lendo o documento...');
        setAiResult([]);
        setAnalysisResult(null);
        setSelectedCargoId('');
        setSelectedCargoName('');

        try {
            const documentPayload = await buildDocumentPayload();
            setSourcePayload(documentPayload);
            await sleep(250);
            setProcessingMsg('Identificando o concurso...');

            const result = await supabase.functions.invoke('extract-edital', {
                body: {
                    mode: 'analyze',
                    inputText: documentPayload.inputText,
                    pdfUrl: documentPayload.pdfUrl,
                    pdfPath: documentPayload.pdfPath,
                    pdfFileUri: documentPayload.pdfFileUri,
                    origin: iaOrigin,
                    year: iaYear
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
            setAnalysisResult(analysis);
            applyAnalysisToForm(analysis);

            const firstCargo = analysis.cargos[0];
            setSelectedCargoId(firstCargo.id);
            setSelectedCargoName(firstCargo.name);
            setIaPosition(firstCargo.name);

            const editalName = analysis.edital.name || `${analysis.edital.organ || iaOrigin || 'Edital'} - ${analysis.edital.year || iaYear}`;
            setIaEditalName(editalName);

            setIaStage('selectCargo');

        } catch (error: any) {
            console.error('Erro na IA:', error);
            const msg = error.message || 'Erro desconhecido';
            toastGate.notifyError(msg, 'IA-01');
            setIaStage('input');
        }
    };

    const handleExtractSelectedCargo = async () => {
        if (!analysisResult) return;
        iaFlowCancelledRef.current = false;
        const cargo = analysisResult.cargos.find(c => c.id === selectedCargoId) || analysisResult.cargos[0];
        if (!cargo) {
            toastGate.notifyError('Selecione um cargo para continuar.', 'IA-CARGO-01');
            return;
        }

        setIaStage('extracting');
        setIaProgress(0);
        setSelectedCargoName(cargo.name);
        setIaPosition(cargo.name);
        setProcessingMsg(`Analisando conteúdo programático de ${cargo.name}...`);
        let stopProgressHints: (() => void) | null = null;

        try {
            const documentPayload = sourcePayload || await buildDocumentPayload();
            setSourcePayload(documentPayload);
            await sleep(200);
            setProcessingMsg('Analisando conteúdo programático...');
            stopProgressHints = startProgressHints([
                { delay: 8000, message: 'Identificando disciplinas...' },
                { delay: 22000, message: 'Mapeando tópicos por disciplina...' },
                { delay: 38000, message: 'Verificando peso das matérias...' }
            ]);

            const result = await supabase.functions.invoke('extract-edital', {
                body: {
                    mode: 'extractForCargo',
                    inputText: documentPayload.inputText,
                    pdfUrl: documentPayload.pdfUrl,
                    pdfPath: documentPayload.pdfPath,
                    pdfFileUri: documentPayload.pdfFileUri,
                    selectedCargo: cargo.name,
                    analysis: analysisResult
                }
            });
            stopProgressHints?.();

            if (result.error) {
                const errBody = await getFunctionErrorMessage(result.error, result.response);
                throw new Error(errBody);
            }

            if (iaFlowCancelledRef.current) return;

            setProcessingMsg('Mapeando tópicos por disciplina...');
            await sleep(200);
            const extraction = result.data?.extraction;
            const mappedResults = mapExtractionToAiSubjects(extraction);

            if (mappedResults.length === 0) {
                throw new Error("A IA não conseguiu extrair matérias para o cargo selecionado.");
            }

            setProcessingMsg('Verificando peso das matérias...');
            await sleep(200);

            const edital = extraction?.edital || analysisResult.edital;
            const finalName = `${edital.organ || iaOrigin || 'Edital'} - ${cargo.name}${edital.year ? ` (${edital.year})` : ''}`;
            setIaEditalName(finalName);
            setIaOrigin(edital.organ || iaOrigin);
            setIaYear(edital.year || iaYear);
            if (edital.examDate) setExamDate(edital.examDate);
            setAiResult(mappedResults);

            setProcessingMsg('Finalizando extração...');
            await savePendingExtraction(finalName, mappedResults, {
                analysis: analysisResult,
                selectedCargo: cargo.name,
                source: documentPayload
            });
            setIaProgress(100);
            await sleep(180);

            setIaStage('review');
        } catch (error: any) {
            stopProgressHints?.();
            console.error('Erro na extração do cargo:', error);
            await discardPendingExtractionData();
            toastGate.notifyError(error.message || 'Erro desconhecido', 'IA-EXTRACT-01');
            setIaStage('input');
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
                exam_weight_raw: s.weight?.rawText ?? null,
                topics: s.topics.filter(t => t.selected && t.name.trim().length >= 2).map((t, idx) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: t.name.length > 500 ? t.name.substring(0, 497) + '...' : t.name,
                    completed: false,
                    reviewCount: 0, // Ensure reviewCount is set
                    review_count: 0, // Ensure review_count is set
                    position: t.position ?? idx
                }))
            } as Subject));

            const finalName = iaEditalName.trim() || 'Edital Importado por IA';

            // Validação de duplicidade por nome
            const normalizedName = finalName.toLowerCase().trim();
            const exists = userEditais.some(e => e.name.toLowerCase().trim() === normalizedName);
            
            if (exists) {
                toastGate.notifyError('Você já possui um edital com este nome.', 'VAL-DUP-01', { severity: 'medium' });
                setIsSavingAi(false);
                return;
            }
            
            const extraInfo = { organ: iaOrigin, position: selectedCargoName || iaPosition, year: iaYear, exam_date: examDate };
            await onImport(newSubjects, finalName, true, undefined, extraInfo);
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

            const extraInfo = { organ: manualOrigin, position: manualPosition, year: manualYear, exam_date: examDate };
            // Descartar extração por IA pendente se existir, para evitar conflitos
            await discardPendingExtractionData();

            await onImport([], finalName, false, undefined, extraInfo); 
            
            onClose();
            setManualOrigin('');
            setManualPosition('');
            setManualYear('');
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
            
            const mappedSubjects: Subject[] = rawSubjects.map((s: any, idx: number) => ({
                id: s.id || `imp-subj-${idx}-${Date.now()}`,
                name: s.name,
                status: 'Nova',
                color: s.color,
                priority: s.priority,
                topics: (Array.isArray(s.topics) ? s.topics : []).map((t: any, tidx: number) => ({
                    id: t.id || `imp-top-${idx}-${tidx}-${Date.now()}`,
                    name: typeof t === 'string' ? t : t.name,
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
                    exam_date: edital.exam_date
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
                            {activeTab === 'ready' ? 'Catálogo Oficial' : activeTab === 'ia' ? 'Importar com IA' : 'Criar Manualmente'}
                        </h2>
                        <p className="text-[11px] text-content-muted font-medium italic hidden md:block">
                            {activeTab === 'ready' ? 'Milhares de concursos já organizados pela nossa equipe.' : activeTab === 'ia' ? 'Extraia matérias e tópicos de PDFs ou sites automaticamente.' : 'Monte sua própria matriz de estudos e organize seu conteúdo do zero.'}
                        </p>
                    </div>
                    {!inlineMode && (
                        <button onClick={handleCloseModal} className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-content-muted hover:text-zinc-900 dark:hover:text-zinc-100">
                            <X size={16} />
                        </button>
                    )}
                </div>
            )}

            <div className={`overflow-y-auto no-scrollbar flex-1 ${inlineMode ? 'pb-10 pt-0' : 'pt-2 px-5 pb-5'}`}>

                    {activeTab === 'ready' ? (
                        <div className="space-y-4">
                            {pendingExtraction && (
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
                                                Extração anterior pendente
                                            </p>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium truncate">
                                                {pendingExtraction.editalName} · Atualizado {new Date(pendingExtraction.updatedAt).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button 
                                            onClick={handleResumePendingExtraction}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl transition-all"
                                        >
                                            <Eye size={12} />
                                            Continuar
                                        </button>
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
                                                Extração anterior pendente
                                            </p>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
                                                {pendingExtraction.editalName} · Atualizado {new Date(pendingExtraction.updatedAt).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={handleResumePendingExtraction}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl transition-all"
                                        >
                                            <Eye size={12} />
                                            Continuar
                                        </button>
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
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full">
                                            {/* Coluna Esquerda: Informação */}
                                            <div className="md:col-span-4 bg-secondary/40 dark:bg-white/[0.02] rounded-2xl p-5 flex flex-col justify-between items-start border border-border/50 dark:border-white/5 relative overflow-hidden min-h-[210px]">
                                                <div>
                                                    <h3 className="text-2xl font-bold text-foreground mb-3 leading-tight tracking-normal">Importar com IA</h3>
                                                    <p className="text-xs text-content-muted font-medium leading-relaxed max-w-sm">
                                                    Copie e cole o texto do seu edital ou envie o arquivo PDF, e a nossa IA fará todo o trabalho de estruturação da sua matriz de estudos.
                                                    </p>
                                                </div>
                                                <div className="w-full flex justify-end text-primary/20 dark:text-white/10 mt-4">
                                                    <div className="relative transform -rotate-6">
                                                        <Sparkles size={76} strokeWidth={1} />
                                                        <Settings className="absolute -bottom-2 -right-3 text-primary/80" size={34} strokeWidth={1.5} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Coluna Direita: Formulário */}
                                            <div className="md:col-span-8 flex flex-col justify-start bg-card dark:bg-zinc-900/40 rounded-2xl p-5 border border-border/50 dark:border-white/5">
                                                <div className="mb-5 flex items-center gap-2">
                                                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                                                    <h4 className="text-xs font-bold text-foreground uppercase tracking-[0.14em]">Dados do Edital</h4>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 w-full">
                                                    {/* Primeira Coluna: Instituição e Cargo */}
                                                    <div className="sm:col-span-8 space-y-4">
                                                        <div className="space-y-1.5 group">
                                                            <label className="text-[9px] font-bold text-content-muted uppercase tracking-[0.16em] ml-1">Instituição</label>
                                                            <input
                                                                type="text"
                                                                value={iaOrigin}
                                                                onChange={(e) => setIaOrigin(e.target.value)}
                                                                placeholder="EX: PC-ES"
                                                                className="w-full h-10 bg-black/5 dark:bg-white/5 border-none rounded-lg px-3 text-[11px] font-semibold text-content-main outline-none transition-all uppercase placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5 group">
                                                            <label className="text-[9px] font-bold text-content-muted uppercase tracking-[0.16em] ml-1">Cargo</label>
                                                            <input
                                                                type="text"
                                                                value={iaPosition}
                                                                onChange={(e) => setIaPosition(e.target.value)}
                                                                placeholder="EX: INVESTIGADOR"
                                                                className="w-full h-10 bg-black/5 dark:bg-white/5 border-none rounded-lg px-3 text-[11px] font-semibold text-content-main outline-none transition-all uppercase placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Segunda Coluna: Ano e Data da Prova */}
                                                    <div className="sm:col-span-4 space-y-4">
                                                        <div className="space-y-1.5 group">
                                                            <label className="text-[9px] font-bold text-content-muted uppercase tracking-[0.16em] ml-1">Ano</label>
                                                            <input
                                                                type="text"
                                                                value={iaYear}
                                                                onChange={(e) => setIaYear(e.target.value.replace(/\D/g, ''))}
                                                                inputMode="numeric"
                                                                maxLength={4}
                                                                placeholder="EX: 2024"
                                                                className="w-full h-10 bg-black/5 dark:bg-white/5 border-none rounded-lg px-3 text-[11px] font-semibold text-content-main outline-none transition-all uppercase placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5 group">
                                                            <label className="text-[9px] font-bold text-content-muted uppercase tracking-[0.16em] ml-1">Data da Prova</label>
                                                            <input
                                                                type="date"
                                                                value={examDate}
                                                                onChange={(e) => setExamDate(e.target.value)}
                                                                className="w-full h-10 bg-black/5 dark:bg-white/5 border-none rounded-lg px-3 text-[11px] font-semibold text-content-main outline-none transition-all uppercase placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full bg-card dark:bg-zinc-900/40 rounded-2xl p-5 border border-border/50 dark:border-white/5 flex flex-col space-y-4">
                                            <div className="w-full space-y-3">
                                                <div className="flex items-center justify-between gap-3 px-1">
                                                    <label className="text-[9px] font-bold text-content-muted uppercase tracking-[0.16em]">
                                                        {isComplementMode ? 'Texto do Conteúdo Adicional' : 'Documento ou Texto'}
                                                    </label>
                                                    
                                                    {!isComplementMode && (
                                                        <div className="relative overflow-hidden group/upload">
                                                            <input 
                                                                type="file" 
                                                                accept="application/pdf"
                                                                onChange={handleFileChange}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                                                title="Fazer upload de PDF" 
                                                            />
                                                            <button type="button" className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-bold rounded-lg transition-colors flex items-center gap-1.5 uppercase tracking-wider">
                                                                <FileText size={12} />
                                                                {pdfFile ? 'Trocar PDF' : 'Anexar PDF (até 5MB)'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {pdfFile && !isComplementMode ? (
                                                    <div className="w-full h-36 bg-secondary/50 dark:bg-white/[0.02] border border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center text-center transition-all px-4">
                                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                                                            <FileText size={18} className="text-primary" />
                                                        </div>
                                                        <h4 className="text-xs font-bold text-content-main mb-1">Arquivo PDF Anexado</h4>
                                                        <p className="text-[11px] text-content-muted font-medium mb-3 truncate max-w-full px-4">{pdfFile.name}</p>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setPdfFile(null)} 
                                                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] font-bold rounded-lg transition-colors uppercase tracking-wider flex items-center gap-1.5"
                                                        >
                                                            <Trash2 size={12} />
                                                            Remover
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <textarea
                                                        value={inputText}
                                                        onChange={(e) => setInputText(e.target.value)}
                                                        placeholder={isComplementMode ? "Cole aqui APENAS os tópicos da matéria (sem nome da matéria)..." : "Cole aqui o texto do conteúdo programático do edital.\n\nSe preferir, deixe este campo vazio e anexe o documento do edital no botão 'ANEXAR PDF' acima."}
                                                        className="w-full h-[clamp(12rem,28vh,17rem)] bg-secondary/50 dark:bg-white/[0.02] border-none rounded-xl p-4 text-xs leading-relaxed font-medium text-content-main outline-none transition-all resize-none focus:bg-secondary/80 dark:focus:bg-white/[0.04] placeholder:text-content-muted/45"
                                                    />
                                                )}
                                            </div>

                                            <div className="flex justify-end w-full">
                                                <button
                                                    onClick={handleIaImport}
                                                    disabled={
                                                        isComplementMode 
                                                            ? (!inputText.trim() || !selectedEditalToComplement || !iaComplementSubjectName.trim())
                                                            : (!inputText.trim() && !pdfFile)
                                                    }
                                                    className={`px-6 h-10 font-bold rounded-xl transition-all flex items-center gap-2 justify-center text-[10px] uppercase tracking-[0.12em] ${
                                                        (isComplementMode 
                                                            ? (!inputText.trim() || !selectedEditalToComplement || !iaComplementSubjectName.trim())
                                                            : (!inputText.trim() && !pdfFile)
                                                        ) 
                                                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-80' 
                                                        : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 active:scale-95'
                                                    }`}
                                                >
                                                    <Sparkles size={14} />
                                                    {isComplementMode ? 'Estruturar e Adicionar ao Edital' : 'Analisar edital'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : null}

                            {(iaStage === 'analyzing' || iaStage === 'extracting') && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto py-10">
                                    <div className="rounded-2xl border border-border dark:border-white/10 bg-card dark:bg-zinc-900/50 p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                                <Sparkles size={18} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-content-main">
                                                    {iaStage === 'analyzing' ? 'Analisando edital...' : 'Extraindo disciplinas...'}
                                                </h3>
                                                <p className="text-[11px] text-content-muted">{processingMsg}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {(iaStage === 'analyzing'
                                                ? [
                                                    { label: 'Lendo o documento', from: 0, to: 34 },
                                                    { label: 'Identificando o concurso', from: 34, to: 80 },
                                                    { label: 'Extraindo cargos disponíveis', from: 80, to: 100 }
                                                ]
                                                : [
                                                    { label: 'Analisando conteúdo programático', from: 0, to: 25 },
                                                    { label: 'Identificando disciplinas', from: 25, to: 45 },
                                                    { label: 'Mapeando tópicos por disciplina', from: 45, to: 70 },
                                                    { label: 'Verificando peso das matérias', from: 70, to: 90 },
                                                    { label: 'Finalizando extração', from: 90, to: 100 }
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
                                                            <span className={`text-[10px] tabular-nums font-bold ${done || active ? 'text-primary' : 'text-content-muted/40'}`}>
                                                                {Math.round(stepProgress)}%
                                                            </span>
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
                                    </div>
                                </motion.div>
                            )}

                            {iaStage === 'selectCargo' && analysisResult && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-4">
                                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                        <h3 className="text-sm font-bold text-content-main">{analysisResult.edital.name}</h3>
                                        <p className="text-xs text-content-muted mt-1">
                                            {analysisResult.edital.organ || 'Órgão não identificado'}
                                            {analysisResult.edital.year ? ` · ${analysisResult.edital.year}` : ''}
                                            {analysisResult.edital.banca ? ` · ${analysisResult.edital.banca}` : ''}
                                        </p>
                                        <p className="text-[11px] text-primary mt-2 font-bold">
                                            {analysisResult.cargos.length} cargo(s) identificado(s)
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-border dark:border-white/10 bg-card dark:bg-zinc-900/40 p-4">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-content-muted">
                                            Selecione seu cargo
                                        </label>
                                        <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1">
                                            {analysisResult.cargos.map((cargo) => (
                                                <button
                                                    key={cargo.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCargoId(cargo.id);
                                                        setSelectedCargoName(cargo.name);
                                                        setIaPosition(cargo.name);
                                                    }}
                                                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                                                        selectedCargoId === cargo.id
                                                            ? 'border-primary bg-primary/10 text-content-main'
                                                            : 'border-border dark:border-white/10 bg-secondary/40 hover:border-primary/40 text-content-main'
                                                    }`}
                                                >
                                                    <p className="text-xs font-bold">{cargo.name}</p>
                                                    {cargo.evidence && (
                                                        <p className="text-[10px] text-content-muted mt-1 line-clamp-2">{cargo.evidence}</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex justify-end gap-2 mt-4">
                                            <button
                                                type="button"
                                                onClick={() => setIaStage('input')}
                                                className="px-4 h-10 rounded-xl border border-border text-xs font-bold text-content-muted hover:text-content-main transition-colors"
                                            >
                                                Voltar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleExtractSelectedCargo}
                                                disabled={!selectedCargoId}
                                                className="px-5 h-10 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <Sparkles size={14} />
                                                Extrair disciplinas
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {iaStage === 'review' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                    <div className="flex items-start justify-between gap-4 pb-3 border-b border-border dark:border-white/5">
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-primary uppercase tracking-[0.16em]">Resultado da extração</p>
                                            <h3 className="text-base font-bold text-content-main mt-1 truncate">
                                                {iaEditalName || `${iaOrigin || 'Edital'} - ${iaPosition || selectedCargoName || 'Cargo'}`}
                                            </h3>
                                            <p className="text-[11px] text-content-muted mt-1">
                                                Revise os dados antes de importar para sua lista de editais.
                                            </p>
                                        </div>
                                        {pendingExtraction && (
                                            <button
                                                type="button"
                                                onClick={discardPendingExtractionData}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/15 rounded-lg border border-amber-500/20 transition-colors shrink-0"
                                            >
                                                <Trash2 size={12} />
                                                Descartar
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid gap-3 pb-4 border-b border-border dark:border-white/5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                                        <>
                                                <div className="space-y-1">
                                                    <span className="block text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Concurso</span>
                                                    <input
                                                        type="text"
                                                        value={iaOrigin}
                                                        onChange={(e) => setIaOrigin(e.target.value)}
                                                        className="w-full px-2.5 py-2 bg-secondary dark:bg-zinc-900/50 rounded-lg text-[10px] font-bold text-content-main uppercase outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="block text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Cargo</span>
                                                    <input
                                                        type="text"
                                                        value={iaPosition}
                                                        onChange={(e) => setIaPosition(e.target.value)}
                                                        className="w-full px-2.5 py-2 bg-secondary dark:bg-zinc-900/50 rounded-lg text-[10px] font-bold text-content-main uppercase outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="block text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Ano</span>
                                                    <input
                                                        type="text"
                                                        value={iaYear}
                                                        onChange={(e) => setIaYear(e.target.value.replace(/\D/g, ''))}
                                                        className="w-full px-2.5 py-2 bg-secondary dark:bg-zinc-900/50 rounded-lg text-[10px] font-bold text-content-main outline-none transition-all"
                                                        placeholder="AAAA"
                                                        maxLength={4}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="block text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Data da Prova</span>
                                                    <input
                                                        type="date"
                                                        value={examDate}
                                                        onChange={(e) => setExamDate(e.target.value)}
                                                        className="w-full px-2.5 py-2 bg-secondary dark:bg-zinc-900/50 rounded-lg text-[10px] font-bold text-content-main outline-none transition-all"
                                                    />
                                                </div>
                                            </>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 pt-1">
                                        <div>
                                            <p className="text-[9px] font-black text-content-muted uppercase tracking-[0.16em]">Matérias extraídas</p>
                                            <p className="text-[10px] text-content-muted">
                                                {aiResult.some(s => s.weight?.questions || s.weight?.points || s.weight?.percentage)
                                                    ? 'Pesos encontrados aparecem em cada matéria.'
                                                    : 'Nenhum peso claro foi encontrado no edital. As matérias serão importadas sem peso.'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const shouldExpand = aiResult.some(s => !s.expanded);
                                                setAiResult(aiResult.map(s => ({ ...s, expanded: shouldExpand })));
                                            }}
                                            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-black uppercase tracking-wider rounded-lg transition-all border border-primary/20 shrink-0"
                                        >
                                            {aiResult.some(s => !s.expanded) ? 'Expandir tudo' : 'Recolher tudo'}
                                        </button>
                                    </div>

                                    {!aiResult.some(s => s.weight?.questions || s.weight?.points || s.weight?.percentage) && (
                                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
                                            A IA não encontrou peso por matéria de forma confiável. Isso não bloqueia a importação; os campos de peso ficarão vazios.
                                        </div>
                                    )}

                                    <div className="space-y-2 pr-2 no-scrollbar">
                                        {aiResult.map((subj, sIdx) => (
                                            <div key={subj.id} className="p-3 rounded-xl bg-secondary/40 dark:bg-zinc-800/40 border border-border dark:border-white/5 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={subj.selected}
                                                            onChange={() => {
                                                                const newResult = [...aiResult];
                                                                newResult[sIdx].selected = !newResult[sIdx].selected;
                                                                setAiResult(newResult);
                                                            }}
                                                            className="w-4 h-4 rounded accent-primary shrink-0"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={subj.title}
                                                            onChange={(e) => {
                                                                const newResult = [...aiResult];
                                                                newResult[sIdx].title = e.target.value.toUpperCase();
                                                                setAiResult(newResult);
                                                            }}
                                                            className="bg-transparent border-none font-bold text-xs text-content-main outline-none focus:text-primary transition-colors w-full uppercase"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span
                                                            title={subj.weight?.rawText || 'Peso não identificado claramente no edital'}
                                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                                (subj.weight?.questions || subj.weight?.points || subj.weight?.percentage)
                                                                    ? 'bg-primary/10 text-primary border-primary/20'
                                                                    : 'bg-secondary dark:bg-zinc-800 text-content-muted border-border dark:border-white/5'
                                                            }`}
                                                        >
                                                            {(subj.weight?.questions || subj.weight?.points || subj.weight?.percentage)
                                                                ? `Peso: ${[
                                                                    subj.weight?.questions ? `${subj.weight.questions} questões` : null,
                                                                    subj.weight?.points ? `${subj.weight.points} pts` : null,
                                                                    subj.weight?.percentage ? `${subj.weight.percentage}%` : null
                                                                ].filter(Boolean).join(' · ')}`
                                                                : 'Peso não identificado'}
                                                        </span>
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
                                                    <div className="flex flex-col gap-1 pl-6 mt-2">
                                                        {subj.topics.map((topic, tIdx) => (
                                                            <div key={tIdx} className="flex items-start gap-2 py-1">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={topic.selected}
                                                                    onChange={() => {
                                                                        const newResult = [...aiResult];
                                                                        newResult[sIdx].topics[tIdx].selected = !newResult[sIdx].topics[tIdx].selected;
                                                                        setAiResult(newResult);
                                                                    }}
                                                                    className="w-3.5 h-3.5 rounded accent-primary/60 shrink-0 mt-1"
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
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-border dark:border-white/5">
                                        <div className="rounded-lg bg-secondary/40 dark:bg-zinc-900/40 border border-border dark:border-white/5 px-3 py-2">
                                            <p className="text-[8px] font-black text-content-muted uppercase tracking-[0.14em]">Matérias selecionadas</p>
                                            <p className="text-sm font-bold text-content-main">{aiResult.filter(s => s.selected).length} de {aiResult.length}</p>
                                        </div>
                                        <div className="rounded-lg bg-secondary/40 dark:bg-zinc-900/40 border border-border dark:border-white/5 px-3 py-2">
                                            <p className="text-[8px] font-black text-content-muted uppercase tracking-[0.14em]">Tópicos selecionados</p>
                                            <p className="text-sm font-bold text-content-main">
                                                {aiResult.reduce((acc, s) => acc + s.topics.filter(t => t.selected).length, 0)} de {aiResult.reduce((acc, s) => acc + s.topics.length, 0)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-secondary/40 dark:bg-zinc-900/40 border border-border dark:border-white/5 px-3 py-2">
                                            <p className="text-[8px] font-black text-content-muted uppercase tracking-[0.14em]">Matérias com peso</p>
                                            <p className="text-sm font-bold text-content-main">
                                                {aiResult.filter(s => s.weight?.questions || s.weight?.points || s.weight?.percentage).length > 0
                                                    ? `${aiResult.filter(s => s.weight?.questions || s.weight?.points || s.weight?.percentage).length} de ${aiResult.length}`
                                                    : 'Nenhum peso encontrado'}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Botão removido daqui para o rodapé fixo */}
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 w-full pt-0 pb-12">
                            {pendingExtraction && (
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
                                                Extração anterior pendente
                                            </p>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium truncate">
                                                {pendingExtraction.editalName} · Atualizado {new Date(pendingExtraction.updatedAt).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button 
                                            onClick={handleResumePendingExtraction}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl transition-all"
                                        >
                                            <Eye size={12} />
                                            Continuar
                                        </button>
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
                                                    CRIAR EDITAL
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
                <div className="px-6 py-4 border-t border-border dark:border-white/5 bg-card dark:bg-zinc-900 rounded-b-[32px] flex justify-center shrink-0">
                    <button
                        onClick={handleSaveAiResult}
                        disabled={isSavingAi}
                        className="w-full max-w-sm py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-3 justify-center uppercase tracking-[0.1em]"
                    >
                        {isSavingAi ? (
                            <><Loader2 className="animate-spin" size={18} /> SALVANDO EDITAL...</>
                        ) : (
                            <>
                                <CheckCircle2 size={18} />
                                {isComplementMode ? 'ADICIONAR AO EDITAL' : 'IMPORTAR SELECIONADOS'}
                            </>
                        )}
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseModal}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-[1120px] max-h-[90vh] bg-white dark:bg-[#18181A] border border-zinc-200 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
                {modalInnerContent}
            </motion.div>
        </div>
    );
};
