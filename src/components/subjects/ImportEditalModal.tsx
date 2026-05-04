import React, { useState, useEffect } from 'react';
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
    topics: AiTopic[];
}

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
    const [iaStage, setIaStage] = useState<'input' | 'processing' | 'review'>('input');
    const [iaEditalName, setIaEditalName] = useState('');
    const [aiResult, setAiResult] = useState<AiSubject[]>([]);
    const [isSavingAi, setIsSavingAi] = useState(false);
    const [processingMsg, setProcessingMsg] = useState('Analisando edital com IA...');
    const [pendingExtraction, setPendingExtraction] = useState<{ id: string; editalName: string; updatedAt: string; source: 'db' | 'fresh' } | null>(null);
    const [loadingPending, setLoadingPending] = useState(false);

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
    const [isLoadingReady, setIsLoadingReady] = useState(false); // New state for ready tab import

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

    const loadPendingExtraction = async () => {
        if (!user) return;
        setLoadingPending(true);
        try {
            const { data, error } = await (supabase as any)
                .from('pending_ai_extractions')
                .select('id, edital_name, updated_at, ai_result, origin, position, year')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (data && !error) {
                setPendingExtraction({
                    id: data.id,
                    editalName: data.edital_name,
                    updatedAt: data.updated_at,
                    source: 'db'
                });
                setAiResult(data.ai_result);
                setIaEditalName(data.edital_name);
                if (data.origin) setIaOrigin(data.origin);
                if (data.position) setIaPosition(data.position);
                setIaYear(data.year);
                setIaStage('review');
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

    const savePendingExtraction = async (editalName: string, results: AiSubject[]) => {
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
                ai_result: results
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
        setIaEditalName('');
        setIaStage('input');
        setIaOrigin('');
        setIaPosition('');
        setInputText('');
        setPdfFile(null);
        setExamDate('');
    };

    const resetPendingState = () => {
        setPendingExtraction(null);
        setAiResult([]);
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

    const handleIaImport = async () => {
        setIaStage('processing');
        setProcessingMsg('Analisando edital com IA...');
        setAiResult([]);

        try {
            const payload: any = {
                origin: iaOrigin,
                position: iaPosition,
                year: iaYear
            };

            if (pdfFile) {
                setProcessingMsg('Enviando arquivo PDF para análise...');
                const fileName = `${user?.id || 'anon'}-${Date.now()}.pdf`;
                const { error: uploadError } = await supabase.storage
                    .from('temporary_editais')
                    .upload(fileName, pdfFile);

                if (uploadError) {
                    console.error('Erro no upload:', uploadError);
                    throw new Error('Falha ao enviar o arquivo para o storage temporário.');
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('temporary_editais')
                    .getPublicUrl(fileName);
                
                payload.pdfUrl = publicUrl;
            } else if (inputText) {
                payload.inputText = inputText;
            } else {
                throw new Error('Forneça um arquivo PDF ou o texto do edital.');
            }

            setProcessingMsg('Extraindo matérias e tópicos com Gemini...');
            
            let data: any;
            try {
                const result = await supabase.functions.invoke('extract-edital', { body: payload });
                data = result.data;
                if (result.error) {
                    const errBody = result.error.message || JSON.stringify(result.error);
                    throw new Error(errBody);
                }
            } catch (err: any) {
                const msg = err?.message || 'Erro desconhecido';
                throw new Error(msg);
            }

            const responseData = data?.text || data?.response || (typeof data === 'string' ? data : '');
            console.log('[extract] raw response (FULL):', responseData);
            const mappedResults = extractJsonFromText(responseData);
            console.log('[extract] mappedResults:', mappedResults.length, mappedResults);

            if (mappedResults.length === 0) {
                if (responseData.includes('"erro"')) {
                    throw new Error("A IA não encontrou matérias no texto. Verifique se o texto contém o conteúdo programático do edital.");
                }
                throw new Error("A IA não conseguiu extrair matérias do conteúdo. Tente um texto mais limpo ou cole apenas a parte de 'CONTEÚDO PROGRAMÁTICO'.");
            }

            const defaultName = `${iaOrigin.trim()} - ${iaPosition.trim()} - ${iaYear.trim()}`;
            setIaEditalName(defaultName);
            setAiResult(mappedResults);

            const pendingId = `pending-${Date.now()}`;
            setPendingExtraction({ id: pendingId, editalName: defaultName, updatedAt: new Date().toISOString(), source: 'fresh' });

            await savePendingExtraction(defaultName, mappedResults);

            setIaStage('review');

        } catch (error: any) {
            console.error('Erro na IA:', error);
            const msg = error.message || 'Erro desconhecido';
            toastGate.notifyError(msg, 'IA-01');
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
            
            const extraInfo = { organ: iaOrigin, position: iaPosition, year: iaYear, exam_date: examDate };
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
        setIsLoadingReady(true);
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
                setIsLoadingReady(false);
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
            setIsLoadingReady(false);
        }
    };

    if (!isOpen && !inlineMode) return null;

    const modalInnerContent = (
        <>
            {inlineMode ? (
                <div className="px-2 pt-6 pb-4 flex items-center shrink-0">
                    <button onClick={onClose} className="flex items-center gap-2 text-content-muted hover:text-foreground transition-colors font-semibold text-sm">
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
                                onClick={onClose}
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
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-content-muted hover:text-zinc-900 dark:hover:text-zinc-100">
                            <X size={16} />
                        </button>
                    )}
                </div>
            )}

            <div className={`overflow-y-auto no-scrollbar flex-1 ${inlineMode ? 'pb-12 pt-0' : 'pt-2 px-6 pb-6'}`}>

                    {activeTab === 'ready' ? (
                        <div className="space-y-6">
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
                                            onClick={() => setActiveTab('ia')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl transition-all"
                                        >
                                            <Eye size={12} />
                                            Visualizar Extração
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
                                        
                                        return (
                                        <div 
                                            key={edital.id} 
                                            className={`px-4 py-2.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
                                                isAlreadyImported 
                                                ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10' 
                                                : 'border-border dark:border-white/5 bg-secondary/30 dark:bg-zinc-800/20 hover:bg-secondary/50 dark:hover:bg-zinc-800/50 hover:border-primary/30'
                                            }`}
                                        >
                                            
                                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 z-10">
                                                <FileText size={16} className="text-primary" />
                                            </div>

                                            <div className="flex-1 min-w-0 z-10 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <h4 className="font-bold text-content-main text-[13px] tracking-tight uppercase transition-colors truncate">
                                                    {edital.organ}
                                                </h4>
                                                
                                                <div className="flex items-center gap-2 text-[11px] text-content-muted font-medium">
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
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto z-10">
                                                 <div className="flex items-center gap-3">
                                                     {edital.subjects && edital.subjects.length > 0 ? (
                                                         <div className="flex items-center gap-4">
                                                             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary dark:bg-zinc-900/50 rounded-lg border border-border dark:border-white/5 transition-all">
                                                                 <Database size={12} className="text-primary/60" />
                                                                 <span className="text-[9px] font-black text-content-muted dark:text-zinc-400 uppercase">
                                                                     {edital.subjects.length} MATÉRIAS
                                                                 </span>
                                                             </div>
                                                             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary dark:bg-zinc-900/50 rounded-lg border border-border dark:border-white/5 transition-all">
                                                                 <Info size={12} className="text-primary/60" />
                                                                 <span className="text-[9px] font-black text-content-muted dark:text-zinc-400 uppercase">
                                                                      {edital.subjects.reduce((acc: number, s: { name: string; topics?: { name: string }[] }) => acc + (s.topics?.length || 0), 0)} TÓPICOS
                                                                 </span>
                                                             </div>
                                                         </div>
                                                     ) : (
                                                         <span className="text-[10px] font-bold text-amber-500/60 flex items-center gap-1 uppercase tracking-wider bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/10">
                                                             <AlertTriangle size={10} /> Sem conteúdos
                                                         </span>
                                                     )}
                                                 </div>

                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isAlreadyImported) return;
                                                        handleImportReadyEdital(edital);
                                                    }}
                                                    disabled={isLoadingReady || isAlreadyImported}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                                                        isAlreadyImported 
                                                        ? 'bg-emerald-500/20 text-emerald-500 cursor-default' 
                                                        : 'bg-primary/10 text-primary hover:bg-primary hover:text-white disabled:opacity-50'
                                                    }`}
                                                >
                                                    {isLoadingReady ? <Loader2 className="animate-spin" size={16} /> : isAlreadyImported ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                                                </button>
                                            </div>
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
                            {pendingExtraction && pendingExtraction.source === 'db' && iaStage !== 'processing' && (
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
                                    <button
                                        onClick={discardPendingExtractionData}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl transition-all flex-shrink-0"
                                    >
                                        <Trash2 size={12} />
                                        Descartar
                                    </button>
                                </motion.div>
                            )}
                            {loadingPending ? (
                                <div className="flex items-center justify-center py-8 gap-2">
                                    <Loader2 size={16} className="animate-spin text-content-muted" />
                                    <span className="text-[10px] text-content-muted font-medium">Carregando extração pendente...</span>
                                </div>
                            ) : iaStage === 'input' && !pendingExtraction ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                                    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
                                            {/* Coluna Esquerda: Informação */}
                                            <div className="md:col-span-5 bg-secondary/50 dark:bg-white-[0.02] rounded-3xl p-8 flex flex-col justify-center items-start border border-border/50 dark:border-white/5 relative overflow-hidden">
                                                <h3 className="text-3xl font-black text-foreground mb-4 leading-tight tracking-tight">Importar<br/>com IA</h3>
                                                <p className="text-sm text-content-muted font-medium mb-12">
                                                    Copie e cole o texto do seu edital ou envie o arquivo PDF, e a nossa IA fará todo o trabalho de estruturação da sua matriz de estudos.
                                                </p>
                                                <div className="w-full flex justify-center text-primary/20 dark:text-white/10 mt-auto">
                                                    <div className="relative transform -rotate-6">
                                                        <Sparkles size={140} strokeWidth={1} />
                                                        <Settings className="absolute -bottom-4 -right-4 text-primary/80" size={64} strokeWidth={1.5} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Coluna Direita: Formulário */}
                                            <div className="md:col-span-7 flex flex-col justify-start bg-card dark:bg-zinc-900/40 rounded-3xl p-8 border border-border/50 dark:border-white/5">
                                                <div className="-mt-2 mb-8 flex items-center gap-2">
                                                    <div className="w-1.5 h-5 bg-primary rounded-full"></div>
                                                    <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Dados do Edital</h4>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 w-full">
                                                    {/* Primeira Coluna: Instituição e Cargo */}
                                                    <div className="sm:col-span-8 space-y-6">
                                                        <div className="space-y-2 group">
                                                            <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Instituição</label>
                                                            <input
                                                                type="text"
                                                                value={iaOrigin}
                                                                onChange={(e) => setIaOrigin(e.target.value)}
                                                                placeholder="EX: PC-ES"
                                                                className="w-full h-12 bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 text-xs font-bold text-content-main outline-none transition-all uppercase placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
                                                            />
                                                        </div>

                                                        <div className="space-y-2 group">
                                                            <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Cargo</label>
                                                            <input
                                                                type="text"
                                                                value={iaPosition}
                                                                onChange={(e) => setIaPosition(e.target.value)}
                                                                placeholder="EX: INVESTIGADOR"
                                                                className="w-full h-12 bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 text-xs font-bold text-content-main outline-none transition-all uppercase placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Segunda Coluna: Ano e Data da Prova */}
                                                    <div className="sm:col-span-4 space-y-6">
                                                        <div className="space-y-2 group">
                                                            <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Ano</label>
                                                            <input
                                                                type="text"
                                                                value={iaYear}
                                                                onChange={(e) => setIaYear(e.target.value.replace(/\D/g, ''))}
                                                                inputMode="numeric"
                                                                maxLength={4}
                                                                placeholder="EX: 2024"
                                                                className="w-full h-12 bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 text-xs font-bold text-content-main outline-none transition-all uppercase placeholder:font-medium placeholder:text-content-muted/30 focus:bg-black/10 dark:focus:bg-white/10"
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
                                            </div>
                                        </div>

                                        <div className="w-full bg-card dark:bg-zinc-900/40 rounded-3xl p-8 border border-border/50 dark:border-white/5 flex flex-col space-y-6">
                                            <div className="w-full space-y-4">
                                                <div className="flex items-center justify-between px-2">
                                                    <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em]">
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
                                                            <button type="button" className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1.5 uppercase tracking-wider">
                                                                <FileText size={12} />
                                                                {pdfFile ? 'Trocar PDF' : 'Anexar PDF (até 5MB)'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {pdfFile && !isComplementMode ? (
                                                    <div className="w-full h-44 bg-secondary/50 dark:bg-white-[0.02] border border-dashed border-primary/30 rounded-2xl flex flex-col items-center justify-center text-center transition-all px-4">
                                                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                                            <FileText size={20} className="text-primary" />
                                                        </div>
                                                        <h4 className="text-sm font-black text-content-main mb-1">Arquivo PDF Anexado</h4>
                                                        <p className="text-xs text-content-muted font-medium mb-4 truncate max-w-full px-4">{pdfFile.name}</p>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setPdfFile(null)} 
                                                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold rounded-xl transition-colors uppercase tracking-wider flex items-center gap-1.5"
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
                                                        className="w-full h-64 bg-secondary/50 dark:bg-white-[0.02] border-none rounded-2xl p-6 text-sm leading-relaxed font-medium text-content-main outline-none transition-all resize-none focus:bg-secondary/80 dark:focus:bg-white/[0.04] placeholder:text-content-muted/50"
                                                    />
                                                )}
                                            </div>

                                            <div className="pt-2 flex justify-end w-full">
                                                <button
                                                    onClick={handleIaImport}
                                                    disabled={
                                                        isComplementMode 
                                                            ? (!inputText.trim() || !selectedEditalToComplement || !iaComplementSubjectName.trim())
                                                            : (!inputText.trim() && !pdfFile || !iaOrigin.trim() || !iaPosition.trim() || !iaYear.trim())
                                                    }
                                                    className={`px-8 h-12 font-black rounded-2xl transition-all flex items-center gap-2 justify-center text-[11px] uppercase tracking-widest ${
                                                        (isComplementMode 
                                                            ? (!inputText.trim() || !selectedEditalToComplement || !iaComplementSubjectName.trim())
                                                            : (!inputText.trim() && !pdfFile || !iaOrigin.trim() || !iaPosition.trim() || !iaYear.trim())
                                                        ) 
                                                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-80' 
                                                        : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 active:scale-95'
                                                    }`}
                                                >
                                                    <Sparkles size={16} />
                                                    {isComplementMode ? 'Estruturar e Adicionar ao Edital' : 'Estruturar com IA'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : null}

                            {iaStage === 'processing' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 flex flex-col items-center justify-center text-center">
                                    <Loader2 className="text-primary animate-spin relative mb-4" size={32} />
                                    <h3 className="text-sm font-black text-content-main tracking-tight">{processingMsg}</h3>
                                </motion.div>
                            )}

                            {iaStage === 'review' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-wider">
                                                {aiResult.length} Matérias
                                            </span>
                                            <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                                                {aiResult.reduce((acc, s) => acc + s.topics.length, 0)} Tópicos
                                            </span>
                                        </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setAiResult(aiResult.map(s => ({ ...s, expanded: true })))}
                                                    className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-black uppercase tracking-wider rounded-lg transition-all border border-primary/20"
                                                >
                                                    Expandir Tudo
                                                </button>
                                                <button
                                                    onClick={() => setAiResult(aiResult.map(s => ({ ...s, expanded: false })))}
                                                    className="px-3 py-1 bg-secondary hover:bg-secondary/80 text-content-muted text-[9px] font-black uppercase tracking-wider rounded-lg transition-all border border-border"
                                                >
                                                    Recolher Tudo
                                                </button>
                                            </div>
                                        </div>

                                    <div className="grid gap-2 pb-3 border-b border-border dark:border-white/5 grid-cols-1 sm:grid-cols-3">
                                        <>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Concurso</span>
                                                    <input
                                                        type="text"
                                                        value={iaOrigin}
                                                        onChange={(e) => setIaOrigin(e.target.value)}
                                                        className="flex-1 px-2 py-1.5 bg-secondary dark:bg-zinc-900/50 rounded-lg text-[10px] font-bold text-content-main uppercase outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Cargo</span>
                                                    <input
                                                        type="text"
                                                        value={iaPosition}
                                                        onChange={(e) => setIaPosition(e.target.value)}
                                                        className="flex-1 px-2 py-1.5 bg-secondary dark:bg-zinc-900/50 rounded-lg text-[10px] font-bold text-content-main uppercase outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Ano</span>
                                                    <input
                                                        type="text"
                                                        value={iaYear}
                                                        onChange={(e) => setIaYear(e.target.value.replace(/\D/g, ''))}
                                                        className="flex-1 px-2 py-1.5 bg-secondary dark:bg-zinc-900/50 rounded-lg text-[10px] font-bold text-content-main outline-none transition-all"
                                                        placeholder="AAAA"
                                                        maxLength={4}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Data da Prova</span>
                                                    <input
                                                        type="date"
                                                        value={examDate}
                                                        onChange={(e) => setExamDate(e.target.value)}
                                                        className="flex-1 px-2 py-1.5 bg-secondary dark:bg-zinc-900/50 rounded-lg text-[10px] font-bold text-content-main outline-none transition-all"
                                                    />
                                                </div>
                                            </>
                                    </div>

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
                                                        <span className="text-[10px] font-bold bg-secondary dark:bg-zinc-800 text-muted-foreground px-1.5 py-0.5 rounded border border-border dark:border-white/5">
                                                            {subj.topics.length} T
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
                                            onClick={() => setActiveTab('ia')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl transition-all"
                                        >
                                            <Eye size={12} />
                                            Visualizar Extração
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
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-7xl h-[85vh] bg-white dark:bg-[#18181A] border border-zinc-200 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {modalInnerContent}
            </motion.div>
        </div>
    );
};

