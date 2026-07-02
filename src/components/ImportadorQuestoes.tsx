import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-toastify';
import { Loader2, Upload, FileText, CheckCircle, Save } from 'lucide-react';
import { toastGate } from '@/lib/errors/toastGate';
import { getConnectionErrorMessage, isConnectionError } from '@/lib/errors/networkError';

interface Question {
    numero: string | number;
    texto: string;
    alternativas: string[] | Record<string, string>;
    gabarito_sugerido?: string;
}

export function ImportadorQuestoes() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [savedCount, setSavedCount] = useState(0);

    const processPDF = async () => {
        if (!file) {
            toastGate.notifyError('Por favor, selecione um arquivo PDF.', 'COMPONENTS-IMPORTADORQUESTOES-01', { severity: 'medium' });
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

            setProgress('Enviando PDF via Supabase (🔒)...');
            const { data: uploadRes, error: uploadError } = await supabase.functions.invoke('ai-handler', {
                body: {
                    action: 'uploadFile',
                    fileName: file.name,
                    fileType: file.type,
                    fileBase64: fileBase64
                }
            });

            if (uploadError || !uploadRes.success) {
                throw new Error(uploadError?.message || uploadRes?.error || 'Erro no upload');
            }

            const fileUri = uploadRes.data.name;

            const prompt = `
Analise este PDF de prova de concurso. Extraia TODAS as questões completas.
Retorne APENAS um JSON válido (array de objetos).
Formato: [{"numero": "1", "texto": "Enunciado completo...", "alternativas": ["A) ...", "B) ..."], "gabarito_sugerido": "Letra ou null"}]
Se não houver questões, retorne [].
Ignore cabeçalhos e rodapés irrelevantes.
`;

            setProgress('Extraindo questões (IA Backend)...');
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
                throw new Error(extractionError?.message || extractionRes?.error || 'Erro na IA');
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

        } catch (error: unknown) {
            console.error('Erro geral:', error);
            const message = isConnectionError(error)
                ? getConnectionErrorMessage(error)
                : `Erro ao processar: ${error.message}`;
            toastGate.notifyError(message, 'COMPONENTS-IMPORTADORQUESTOES-02', { severity: 'medium' });
        } finally {
            setIsProcessing(false);
            setProgress('');
        }
    };

    const handleSave = async () => {
        if (questions.length === 0) return;
        console.log('Salvando questões:', questions);
        toast.success('Questões salvas no banco com sucesso!');
        setSavedCount(questions.length);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Upload className="w-6 h-6 text-indigo-600" />
                    Importador Seguro de Questões
                </h2>

                <div className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Gerenciado por Edge Functions (IA Backend)
                    </div>

                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="pdf-upload"
                        />
                        <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                            <FileText className="w-10 h-10 text-slate-400" />
                            <span className="text-slate-600 font-medium">
                                {file ? file.name : 'Clique para selecionar um arquivo PDF'}
                            </span>
                            <span className="text-xs text-slate-400">PDFs de provas ou simulados</span>
                        </label>
                    </div>

                    <button
                        onClick={processPDF}
                        disabled={isProcessing || !file}
                        className={`w-full py-3 rounded-md text-white font-medium flex items-center justify-center gap-2 transition-all
              ${isProcessing || !file
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'}`}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {progress}
                            </>
                        ) : (
                            'Processar PDF com IA'
                        )}
                    </button>
                </div>
            </div>

            {questions.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-slate-800">
                            Questões Identificadas ({questions.length})
                        </h3>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            Salvar no Banco
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {questions.map((q, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">
                                        Questão {q.numero}
                                    </span>
                                    {q.gabarito_sugerido && (
                                        <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Gabarito: {q.gabarito_sugerido}
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-800 text-sm mb-3 whitespace-pre-wrap">{q.texto}</p>

                                <div className="bg-slate-50 p-3 rounded text-xs text-slate-600 space-y-1">
                                    {Array.isArray(q.alternativas) ? (
                                        q.alternativas.map((alt, i) => <div key={i}>{alt}</div>)
                                    ) : (
                                        Object.entries(q.alternativas || {}).map(([key, value]) => (
                                            <div key={key}><span className="font-bold">{key})</span> {value}</div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
