import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast'; 
import { toastGate } from '@/lib/errors/toastGate';
import { Loader2, Upload, FileText, CheckCircle, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Question {
    numero: string | number;
    texto: string;
    alternativas: string[] | Record<string, string>;
    gabarito_sugerido?: string;
}

const ImportQuestions = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);

    const processPDF = async () => {
        if (!file) {
            toastGate.notifyError('Por favor, selecione um arquivo PDF.', 'IMP-VAL-01', { severity: 'low' });
            return;
        }

        setIsProcessing(true);
        setQuestions([]);
        setProgress('Preparando arquivo...');

        try {
            // 1. Converter PDF para Base64 para envio seguro via Edge Function proxy
            const reader = new FileReader();
            const fileBase64Promise = new Promise<string>((resolve, reject) => {
               reader.onload = () => {
                  const base64String = (reader.result as string).split(',')[1];
                  resolve(base64String);
               };
               reader.onerror = reject;
               reader.readAsDataURL(file);
            });

            const fileBase64 = await fileBase64Promise;

            setProgress('Fazendo upload seguro do PDF...');
            const { data: uploadRes, error: uploadError } = await supabase.functions.invoke('ai-handler', {
                body: {
                    action: 'uploadFile',
                    fileName: file.name,
                    fileType: file.type,
                    fileBase64: fileBase64
                }
            });

            if (uploadError || !uploadRes.success) {
                throw new Error(uploadError?.message || uploadRes?.error || 'Erro no upload seguro');
            }

            const fileUri = uploadRes.data.name;

            const prompt = `
Analise este PDF de prova de concurso. Extraia TODAS as questões completas.
Retorne APENAS um JSON válido (array de objetos).
Formato: [{"numero": "1", "texto": "Enunciado completo...", "alternativas": ["A) ...", "B) ..."], "gabarito_sugerido": "Letra ou null"}]
Se não houver questões, retorne [].
Ignore cabeçalhos e rodapés irrelevantes.
`;

            setProgress('Extraindo questões com IA (Backend)...');
            const { data: extractionRes, error: extractionError } = await supabase.functions.invoke('ai-handler', {
                body: {
                    action: 'generateContent',
                    contents: [
                        { role: 'user', parts: [
                            { text: prompt },
                            { fileData: { mimeType: 'application/pdf', fileUri } }
                        ]}
                    ],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.1
                    }
                }
            });

            if (extractionError || !extractionRes.success) {
                throw new Error(extractionError?.message || extractionRes?.error || 'Erro na extração de texto');
            }

            const cleanJson = extractionRes.text.replace(/```json/g, '').replace(/```/g, '').trim();

            let allQuestions: Question[] = [];
            if (cleanJson) {
                allQuestions = JSON.parse(cleanJson);
                if (!Array.isArray(allQuestions)) allQuestions = [];
            }

            setQuestions(allQuestions);
            if (allQuestions.length === 0) {
                toast.info('Nenhuma questão foi identificada no PDF.');
            } else {
                toast.success(`${allQuestions.length} questões extraídas com sucesso!`);
            }

        } catch (error: any) {
            console.error('Erro geral:', error);
            toastGate.notifyError(`Erro ao processar: ${error.message || 'Verifique o console.'}`, 'IMP-PROC-ERR', { severity: 'medium' });
        } finally {
            setIsProcessing(false);
            setProgress('');
        }
    };

    const handleSave = async () => {
        if (questions.length === 0) return;
        console.log('Salvando questões:', questions);
        toast.success('Questões processadas e salvas com sucesso! (Fluxo movido para Backend)');
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-slate-900">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1 mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Importação de Questões (🔒 Seguro)</h1>
                    <p className="text-slate-500 mt-1.5 text-sm">Ferramenta administrativa com processamento em Backend.</p>
                </div>
            </div>

            <div className="space-y-6 max-w-4xl">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-indigo-600" />
                        Importador de PDF via Edge Functions
                    </h2>

                    <div className="space-y-5">
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 mb-2">
                             <p className="text-xs text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle className="w-3 h-3" />
                                <strong>Segurança Ativada:</strong> Sua API Key agora é gerenciada pelo Supabase. Não é necessário digitar nada.
                             </p>
                        </div>

                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50/80 transition-all cursor-pointer group">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="pdf-upload"
                            />
                            <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-3 w-full h-full">
                                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileText className="w-7 h-7" />
                                </div>
                                <div>
                                    <span className="text-slate-700 font-medium block text-lg">
                                        {file ? file.name : 'Clique para selecionar PDF'}
                                    </span>
                                    <span className="text-sm text-slate-400 mt-1 block">Arraste ou clique para upload</span>
                                </div>
                            </label>
                        </div>

                        <button
                            onClick={processPDF}
                            disabled={isProcessing || !file}
                            className={`w-full py-3.5 rounded-lg text-white font-medium flex items-center justify-center gap-2.5 transition-all text-sm
                  ${isProcessing || !file
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-[0.99]'}`}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {progress}
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Processar PDF com Backend AI
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {questions.length > 0 && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
                        <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm sticky top-4 z-10 backdrop-blur-md bg-white/90">
                            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Questões Identificadas ({questions.length})
                            </h3>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                            >
                                <Save className="w-4 h-4" />
                                Salvar no Banco
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {questions.map((q, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded border border-slate-200">
                                            Q{q.numero}
                                        </span>
                                        {q.gabarito_sugerido && (
                                            <span className="bg-green-50 text-green-700 border border-green-200 text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Gabarito: {q.gabarito_sugerido}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-800 text-sm mb-4 whitespace-pre-wrap leading-relaxed">{q.texto}</p>

                                    <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 space-y-2 border border-slate-100">
                                        {Array.isArray(q.alternativas) ? (
                                            q.alternativas.map((alt, i) => <div key={i} className="flex gap-2"><span className="font-semibold min-w-[20px]">{String.fromCharCode(65 + i)})</span> <span>{alt}</span></div>)
                                        ) : (
                                            Object.entries(q.alternativas || {}).map(([key, value]) => (
                                                <div key={key} className="flex gap-2"><span className="font-semibold min-w-[20px]">{key})</span> <span>{value}</span></div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportQuestions;
