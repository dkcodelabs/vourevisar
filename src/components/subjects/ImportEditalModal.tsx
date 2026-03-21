import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Sparkles, Loader2, Edit3, ChevronUp, ChevronDown, Trash2, Save, Plus, X, MessageSquare, CalendarDays, Database, Send, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
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
    onImport: (subjects: Subject[], editalName?: string, isImported?: boolean, sourceId?: string, extraInfo?: { organ: string; position: string; year: string }) => Promise<void> | void;
    subjects: Subject[];
    userEditais?: UserEdital[];
    initialTab?: 'ready' | 'ia' | 'manual';
    manualModeChildren?: React.ReactNode;
}

export const ImportEditalModal = ({ isOpen, onClose, onImport, subjects, userEditais = [], initialTab = 'ready', manualModeChildren }: ImportEditalModalProps) => {
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
                if (data.year) setIaYear(data.year);
                setIaStage('review');
                setActiveTab('ia');
            }
        } catch (err: any) {
            console.error('[loadPending] catch error:', err?.code, err?.message);
        } finally {
            setLoadingPending(false);
        }
    };

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

            const result = rawSubjects.map((s: any, idx: number): AiSubject => ({
                id: `ia-${idx}-${Date.now()}`,
                title: s.t || s.title || "Sem Título",
                expanded: idx === 0,
                topics: (s.p || s.topics || []).map((t: any): AiTopic => ({
                    name: typeof t === 'string' ? t : (t.n || t.name || ""),
                    selected: true
                })).filter((t: AiTopic) => {
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
                topics: s.topics.filter(t => t.selected && t.name.trim().length >= 2).map(t => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: t.name.length > 500 ? t.name.substring(0, 497) + '...' : t.name,
                    completed: false,
                    reviewCount: 0, // Ensure reviewCount is set
                    review_count: 0 // Ensure review_count is set
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
            
            await onImport(newSubjects, finalName, true);
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

            const extraInfo = { organ: manualOrigin, position: manualPosition, year: manualYear };
            // Ao criar manual, enviamos sem matérias inicialmente, 
            // pois o fluxo agora abre o modal de gestão de matérias em seguida.
            await onImport([], finalName, false, undefined, extraInfo); 
            
            onClose();
            setManualOrigin('');
            setManualPosition('');
            setManualYear('');
        } catch (error) {
            console.error('Erro ao salvar edital manual:', error);
        } finally {
            setImportingManual(false);
        }
    };

    const handleImportReadyEdital = async (edital: ReadyEdital) => {
        setIsLoadingReady(true);
        try {
            // If no subjects, just log it silently or ignore as requested by user
            if (!edital.subjects || !Array.isArray(edital.subjects) || edital.subjects.length === 0) {
                console.log("[ImportEditalModal] Edital sem matérias, mas importação permitida conforme regra de negócio.");
            }

            const subjectsList = Array.isArray(edital.subjects) ? edital.subjects : [];

            const importSubjects: Subject[] = subjectsList.map((s: { name: string; topics?: { name: string }[] }, i: number) => {
                return {
                    id: `imp-${edital.id}-${i}-${Date.now()}`,
                    name: s.name,
                    status: 'Nova',
                    topics: (s.topics || []).map((t: { name: string }, ti: number) => ({
                        id: `imp-top-${edital.id}-${i}-${ti}-${Date.now()}`,
                        name: typeof t === 'string' ? t : t.name,
                        completed: false,
                        reviewCount: 0,
                        review_count: 0,
                    }))
                };
            });
            const extraInfo = { organ: edital.organ || '', position: edital.position || '', year: edital.year || '' };
            await onImport(importSubjects, `${edital.organ} - ${edital.position}`, true, edital.id, extraInfo);
            onClose();
        } catch (error) {
            console.error('Erro ao importar edital pronto:', error);
            // Re-throw or handle error to show in UI
            toastGate.notifyError(error instanceof Error ? error.message : 'Erro ao importar edital selecionado', 'IMP-01');
        } finally {
            setIsLoadingReady(false);
        }
    };

    if (!isOpen) return null;

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
                className="relative w-full max-w-5xl h-[85vh] bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                            {activeTab === 'ready' ? 'Editais Prontos' : activeTab === 'ia' ? 'Importar com IA' : 'Adicionar Manual'}
                        </h2>
                        <p className="text-sm text-content-muted font-medium mt-1">
                            {activeTab === 'ready' 
                                ? 'Escolha um edital pronto do nosso catálogo oficial.' 
                                : activeTab === 'ia' 
                                    ? 'Use nossa inteligência artificial para extrair conteúdos de textos.' 
                                    : 'Cadastre manualmente as matérias e tópicos do seu edital.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-content-muted hover:text-zinc-900 dark:hover:text-zinc-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto no-scrollbar flex-1">
                    <div className="flex gap-2 bg-secondary dark:bg-zinc-900/50 p-1.5 rounded-2xl mb-8 w-fit mx-auto border border-border dark:border-white/5">
                        <button
                            onClick={() => setActiveTab('ready')}
                            className={`px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all tracking-wide flex items-center gap-2 ${activeTab === 'ready' ? 'bg-primary text-white shadow-sm' : 'text-content-muted hover:text-primary hover:bg-primary/10'}`}
                        >
                            <FileText size={14} />
                            Editais Prontos
                        </button>
                        <button
                            onClick={() => setActiveTab('ia')}
                            className={`px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all tracking-wide flex items-center gap-2 ${activeTab === 'ia' ? 'bg-primary text-white shadow-sm' : 'text-content-muted hover:text-primary hover:bg-primary/10'}`}
                        >
                            <Sparkles size={14} />
                            Importar com IA
                        </button>
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all tracking-wide flex items-center gap-2 ${activeTab === 'manual' ? 'bg-primary text-white shadow-sm' : 'text-content-muted hover:text-primary hover:bg-primary/10'}`}
                        >
                            <Plus size={14} />
                            Adicionar Manual
                        </button>
                    </div>

                    {activeTab === 'ready' ? (
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-content-muted" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar concurso (ex: PCES, PMES, INSS...)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-14 bg-secondary dark:bg-zinc-950 border border-border dark:border-white/5 rounded-[20px] pl-14 pr-6 text-sm font-medium focus:outline-none focus:border-primary/40 transition-all text-content-main placeholder:text-content-muted/50"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2 overflow-x-auto no-scrollbar pb-2">
                                    {['Todos', 'Carreiras Policiais', 'Tribunais', 'Bancárias', 'Administrativo', 'Educação'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all tracking-wider border uppercase ${
                                                selectedCategory === cat 
                                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                                                : 'bg-secondary dark:bg-zinc-800/20 border-border dark:border-white/5 text-content-muted hover:border-primary/30 hover:text-foreground'
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
                                        <motion.div 
                                            key={edital.id} 
                                            whileHover={isAlreadyImported ? {} : { scale: 1.01 }}
                                            className={`p-4 rounded-2xl group border transition-all relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
                                                isAlreadyImported 
                                                ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10' 
                                                : 'border-border dark:border-white/5 bg-secondary/30 dark:bg-zinc-800/20 hover:bg-secondary/50 dark:hover:bg-zinc-800/50 hover:border-primary/30'
                                            }`}
                                        >
                                            {/* Glow effect on hover */}
                                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl z-0" />
                                            
                                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 z-10 hidden sm:flex">
                                                <FileText size={20} className="text-primary" />
                                            </div>

                                            <div className="flex-1 min-w-0 z-10 w-full border-b border-white/5 sm:border-b-0 pb-3 sm:pb-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-content-main text-sm sm:text-base tracking-tight uppercase group-hover:text-primary transition-colors truncate">
                                                        {edital.organ}
                                                    </h4>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${
                                                        edital.status === 'PÓS-EDITAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        edital.status === 'PREVISTO' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    }`}>
                                                        {edital.status === 'published' ? 'PUBLICADO' : edital.status} {edital.year}
                                                    </span>
                                                    {isAlreadyImported && (
                                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md border bg-emerald-500 text-white border-emerald-500 flex items-center gap-1 shadow-sm">
                                                            <CheckCircle2 size={10} /> JÁ IMPORTADO
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-content-muted font-medium mt-0.5 truncate">{edital.position}</p>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto z-10">
                                                 <div className="flex items-center gap-3">
                                                     {edital.subjects && edital.subjects.length > 0 ? (
                                                         <div className="flex items-center gap-4">
                                                             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary dark:bg-zinc-900/50 rounded-lg border border-border dark:border-white/5 group-hover:border-primary/20 transition-all">
                                                                 <Database size={12} className="text-primary/60" />
                                                                 <span className="text-[10px] font-black text-content-muted dark:text-zinc-400 group-hover:text-foreground dark:group-hover:text-zinc-200 transition-colors uppercase">
                                                                     {edital.subjects.length} MATÉRIAS
                                                                 </span>
                                                             </div>
                                                             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary dark:bg-zinc-900/50 rounded-lg border border-border dark:border-white/5 group-hover:border-primary/20 transition-all">
                                                                 <Info size={12} className="text-primary/60" />
                                                                 <span className="text-[10px] font-black text-content-muted dark:text-zinc-400 group-hover:text-foreground dark:group-hover:text-zinc-200 transition-colors uppercase">
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
                                                        ? 'bg-emerald-500/20 text-emerald-500 cursor-default opacity-100' 
                                                        : 'bg-primary/10 text-primary opacity-80 sm:opacity-0 sm:group-hover:opacity-100 scale-100 sm:scale-75 sm:group-hover:scale-100 hover:bg-primary hover:text-white disabled:opacity-50'
                                                    }`}
                                                >
                                                    {isLoadingReady ? <Loader2 className="animate-spin" size={16} /> : isAlreadyImported ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                                                </button>
                                            </div>
                                        </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <div className="w-20 h-20 bg-secondary dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Search className="text-content-muted" size={32} />
                                    </div>
                                    <p className="text-lg font-black text-content-main mb-2 tracking-tight">SEM RESULTADOS</p>
                                    {searchQuery.trim() ? (
                                        <p className="text-sm text-content-muted font-medium mb-6">Não encontramos concursos para <span className="text-foreground font-bold">&ldquo;{searchQuery}&rdquo;</span></p>
                                    ) : (
                                        <p className="text-sm text-content-muted font-medium mb-6">Ainda não há editais no catálogo. Seja o primeiro a sugerir!</p>
                                    )}
                                    <button
                                        onClick={handleOpenSuggest}
                                        className="inline-flex items-center gap-2 text-[11px] font-bold text-primary/80 hover:text-primary transition-colors uppercase tracking-widest bg-primary/10 hover:bg-primary/20 px-6 py-3 rounded-full"
                                    >
                                        <MessageSquare size={14} />
                                        Sugerir Edital
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'ia' ? (
                        <div className="space-y-8">
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
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 w-full flex flex-col items-center">
                                    <div className="text-center space-y-1 mb-2">
                                        <h3 className="text-xl font-black text-content-main tracking-tight uppercase">Estruturar com Inteligência Artificial</h3>
                                        <p className="text-[11px] text-content-muted font-medium">Preencha os dados básicos e anexe o documento PDF.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-[800px] px-2 mb-2">
                                        <div className="space-y-1.5 group">
                                            <label className="text-[9px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Instituição</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={iaOrigin}
                                                    onChange={(e) => setIaOrigin(e.target.value)}
                                                    placeholder="Ex: PC-ES"
                                                    className="w-full bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 focus:border-primary/40 rounded-xl px-3 py-2 text-xs font-bold text-content-main outline-none transition-all shadow-inner uppercase"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 group">
                                            <label className="text-[9px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Cargo</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={iaPosition}
                                                    onChange={(e) => setIaPosition(e.target.value)}
                                                    placeholder="Ex: Investigador"
                                                    className="w-full bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 focus:border-primary/40 rounded-xl px-3 py-2 text-xs font-bold text-content-main outline-none transition-all shadow-inner uppercase"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 group">
                                            <label className="text-[9px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Ano</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={iaYear}
                                                    onChange={(e) => setIaYear(e.target.value)}
                                                    placeholder="Ex: 2024"
                                                    className="w-full bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 focus:border-primary/40 rounded-xl px-3 py-2 text-xs font-bold text-content-main outline-none transition-all shadow-inner uppercase"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full max-w-[800px] space-y-4">
                                        <div className="flex items-center justify-between px-2">
                                            <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em]">Documento ou Texto</label>
                                            
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
                                        </div>

                                        {pdfFile ? (
                                            <div className="w-full h-44 bg-secondary/50 dark:bg-zinc-950/30 border border-dashed border-primary/30 rounded-2xl flex flex-col items-center justify-center text-center transition-all px-4">
                                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                                    <FileText size={20} className="text-primary animate-pulse" />
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
                                                placeholder="Cole aqui o texto do conteúdo programático do edital..."
                                                className="w-full h-44 bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 focus:border-primary/40 rounded-2xl p-4 text-xs font-medium text-content-main outline-none transition-all resize-none no-scrollbar shadow-inner"
                                            />
                                        )}
                                    </div>

                                    <div className="pt-2 flex justify-center w-full max-w-[800px]">
                                        <button
                                            onClick={handleIaImport}
                                            disabled={!inputText.trim() && !pdfFile || !iaOrigin.trim() || !iaPosition.trim() || !iaYear.trim()}
                                            className={`w-full py-4 font-black rounded-[20px] shadow-lg transition-all flex items-center gap-2 justify-center text-[11px] uppercase tracking-widest ${
                                                (!inputText.trim() && !pdfFile || !iaOrigin.trim() || !iaPosition.trim() || !iaYear.trim()) 
                                                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-80' 
                                                : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20 hover:scale-[1.01] active:scale-95'
                                            }`}
                                        >
                                            <Sparkles size={16} />
                                            Estruturar com IA
                                        </button>
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
                                        <button
                                            onClick={() => {
                                                const allExpanded = aiResult.every(s => s.expanded);
                                                setAiResult(aiResult.map(s => ({ ...s, expanded: !allExpanded })));
                                            }}
                                            className="px-3 py-1 bg-secondary hover:bg-secondary/80 text-[10px] font-bold rounded-lg transition-all"
                                        >
                                            {aiResult.every(s => s.expanded) ? 'Recolher' : 'Expandir'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-border dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black text-content-muted uppercase tracking-[0.15em]">Org</span>
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
                                                onChange={(e) => setIaYear(e.target.value)}
                                                className="flex-1 px-2 py-1.5 bg-secondary dark:bg-zinc-900/50 rounded-lg text-[10px] font-bold text-content-main uppercase outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-2 no-scrollbar">
                                        {aiResult.map((subj, sIdx) => (
                                            <div key={subj.id} className="p-3 rounded-xl bg-secondary/30 dark:bg-zinc-800/10 border border-border dark:border-white/5">
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
                                                                newResult[sIdx].title = e.target.value;
                                                                setAiResult(newResult);
                                                            }}
                                                            className="bg-transparent border-none font-bold text-[11px] text-content-main outline-none focus:text-primary transition-colors w-full"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold bg-secondary dark:bg-zinc-800 text-muted-foreground px-1.5 py-0.5 rounded border border-border dark:border-white/5">
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
                                                            <div key={tIdx} className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={topic.selected}
                                                                    onChange={() => {
                                                                        const newResult = [...aiResult];
                                                                        newResult[sIdx].topics[tIdx].selected = !newResult[sIdx].topics[tIdx].selected;
                                                                        setAiResult(newResult);
                                                                    }}
                                                                    className="w-3 h-3 rounded accent-primary/60 shrink-0"
                                                                />
                                                                <textarea
                                                                    value={topic.name}
                                                                    onChange={(e) => {
                                                                        const newResult = [...aiResult];
                                                                        newResult[sIdx].topics[tIdx].name = e.target.value;
                                                                        setAiResult(newResult);
                                                                        e.target.style.height = 'auto';
                                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                                    }}
                                                                    className="bg-transparent border-none text-[10px] text-content-main outline-none w-full resize-none leading-tight min-h-[16px]"
                                                                    rows={1}
                                                                    onFocus={(e) => {
                                                                        e.target.style.height = 'auto';
                                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-3 border-t border-white/5 flex justify-center">
                                        <button
                                            onClick={handleSaveAiResult}
                                            disabled={isSavingAi}
                                            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider"
                                        >
                                            {isSavingAi ? (
                                                <><Loader2 className="animate-spin" size={14} /> Salvando...</>
                                            ) : (
                                                'Importar Selecionados'
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8 w-full pt-4 pb-12">
                            <div className="text-center space-y-2 mb-4">
                                <h3 className="text-2xl font-black text-content-main tracking-tight uppercase">Novo Edital Personalizado</h3>
                                <p className="text-sm text-content-muted font-medium">Defina a origem e o cargo para começar a estruturar seu edital.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Origin Field */}
                                <div className="space-y-3 group">
                                    <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1 group-hover:text-primary/60 transition-colors">Origem / Instituição</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40">
                                            <Database size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            value={manualOrigin}
                                            onChange={(e) => setManualOrigin(e.target.value)}
                                            placeholder="Ex: PC-ES, INSS, Receita Federal..."
                                            className="w-full bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 focus:border-primary/40 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-content-main outline-none transition-all shadow-inner uppercase"
                                        />
                                    </div>
                                </div>

                                {/* Position Field */}
                                <div className="space-y-3 group">
                                    <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1 group-hover:text-primary/60 transition-colors">Cargo / Função</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40">
                                            <Sparkles size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            value={manualPosition}
                                            onChange={(e) => setManualPosition(e.target.value)}
                                            placeholder="Ex: Agente, Analista Judiciário, Técnico..."
                                            className="w-full bg-secondary dark:bg-zinc-950/50 border border-border dark:border-white/5 focus:border-primary/40 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-content-main outline-none transition-all shadow-inner uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col items-center gap-4">
                                <button
                                    onClick={handleSaveManual}
                                    disabled={!manualOrigin.trim() || !manualPosition.trim() || importingManual}
                                    className="w-full sm:w-auto px-16 py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-[24px] shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-3 justify-center text-xs uppercase tracking-widest"
                                >
                                    {importingManual ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Criando Edital...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            Criar Edital e Adicionar Matérias
                                        </>
                                    )}
                                </button>
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                                    <Info size={12} className="text-emerald-500/70" />
                                    <p className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-widest">
                                        Após clicar, você poderá adicionar as matérias e tópicos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

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
        </div>
    );
};

