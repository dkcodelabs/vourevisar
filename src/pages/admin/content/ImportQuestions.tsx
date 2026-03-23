import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { toast } from '@/lib/toast'; // Using local toast wrapper
import { toastGate } from '@/lib/errors/toastGate';
import { Loader2, Upload, FileText, CheckCircle, Save, AlertCircle, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Question {
    numero: string | number;
    texto: string;
    alternativas: string[] | Record<string, string>;
    gabarito_sugerido?: string;
}

const ImportQuestions = () => {
    const navigate = useNavigate();
    const [apiKey, setApiKey] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);

    // Internal simulator state
    // const [savedCount, setSavedCount] = useState(0);

    const processPDF = async () => {
        if (!file || !apiKey) {
            toastGate.notifyError('Por favor, forneça a API Key e selecione um arquivo PDF.', 'IMP-VAL-01', { severity: 'low' });
            return;
        }

        setIsProcessing(true);
        setQuestions([]);
        setProgress('Enviando PDF para Gemini...');

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            setProgress('Fazendo upload do PDF (File API)...');
            const arrayBuffer = await file.arrayBuffer();
            const fileBytes = new Uint8Array(arrayBuffer);

            const uploadRes = await fetch(
                `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/pdf',
                        'X-Goog-Upload-File-Name': file.name,
                        'X-Goog-Upload-Protocol': 'raw',
                    },
                    body: fileBytes,
                }
            );

            if (!uploadRes.ok) {
                const err = await uploadRes.text();
                throw new Error(`Falha no upload do PDF: ${uploadRes.status} - ${err}`);
            }

            const uploadData = await uploadRes.json();
            const fileUri = uploadData.name;

            const prompt = `
Analise este PDF de prova de concurso. Extraia TODAS as questões completas.
Retorne APENAS um JSON válido (array de objetos).
Formato: [{"numero": "1", "texto": "Enunciado completo...", "alternativas": ["A) ...", "B) ..."], "gabarito_sugerido": "Letra ou null"}]
Se não houver questões, retorne [].
Ignore cabeçalhos e rodapés irrelevantes.
`;

            setProgress('Extraindo questões com IA...');
            const result = await model.generateContent([
                prompt,
                { fileData: { mimeType: 'application/pdf', fileUri } }
            ]);

            const text = result.response.text();
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            let allQuestions: Question[] = [];
            if (cleanedText) {
                allQuestions = JSON.parse(cleanedText);
                if (!Array.isArray(allQuestions)) allQuestions = [];
            }

            setQuestions(allQuestions);
            if (allQuestions.length === 0) {
                toast.info('Nenhuma questão foi identificada no PDF.');
            } else {
                toast.success(`${allQuestions.length} questões extraídas com sucesso!`);
            }

        } catch (error) {
            console.error('Erro geral:', error);
            toastGate.notifyError('Erro ao processar o arquivo. Verifique o console.', 'IMP-PROC-ERR', { severity: 'medium' });
        } finally {
            setIsProcessing(false);
            setProgress('');
        }
    };

    const handleSave = async () => {
        // Simulação de salvamento
        if (questions.length === 0) return;

        // Aqui conectaria com o Supabase futuramente
        console.log('Salvando questões:', questions);
        toast.success('Questões processadas e logs gerados! (Simulação de salvamento)');
        // setSavedCount(questions.length);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-slate-900">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1 mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Importação de Questões</h1>
                    <p className="text-slate-500 mt-1.5 text-sm">Ferramenta administrativa para importação em massa via IA.</p>
                </div>
            </div>

            <div className="space-y-6 max-w-4xl">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-indigo-600" />
                        Importador de PDF (Gemini AI)
                    </h2>

                    <div className="space-y-5">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Gemini API Key (Sessão Atual)
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Cole sua API Key do Google Gemini aqui"
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white"
                            />
                            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                                <AlertCircle className="w-3 h-3" />
                                A chave é usada apenas localmente e não é salva no servidor.
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
                            disabled={isProcessing || !file || !apiKey}
                            className={`w-full py-3.5 rounded-lg text-white font-medium flex items-center justify-center gap-2.5 transition-all text-sm
                  ${isProcessing || !file || !apiKey
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
                                    Processar PDF com IA
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
