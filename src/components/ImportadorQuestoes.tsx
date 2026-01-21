import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { toast } from 'react-toastify';
import { Loader2, Upload, FileText, CheckCircle, Save, AlertCircle, Trash2 } from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Question {
    numero: string | number;
    texto: string;
    alternativas: string[] | Record<string, string>;
    gabarito_sugerido?: string;
}

export function ImportadorQuestoes() {
    const [apiKey, setApiKey] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [savedCount, setSavedCount] = useState(0);

    const processPDF = async () => {
        if (!file || !apiKey) {
            toast.error('Por favor, forneça a API Key e selecione um arquivo PDF.');
            return;
        }

        setIsProcessing(true);
        setQuestions([]);
        setProgress('Iniciando leitura do PDF...');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const allQuestions: Question[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                setProgress(`Processando página ${i} de ${pdf.numPages}...`);

                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    await page.render({ canvasContext: context, viewport } as any).promise;
                    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

                    const prompt = `
            Analise esta imagem de prova de concurso. Extraia as questões completas.
            Retorne APENAS um JSON válido (array de objetos).
            Formato: [{"numero": "1", "texto": "Enunciado completo...", "alternativas": ["A) ...", "B) ..."], "gabarito_sugerido": "Lettra ou null"}]
            Se não houver questões, retorne [].
            Ignore cabeçalhos e rodapés irrelevantes.
            `;

                    try {
                        const result = await model.generateContent([
                            prompt,
                            { inlineData: { data: base64Image, mimeType: 'image/jpeg' } }
                        ]);

                        const text = result.response.text();
                        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

                        if (cleanedText) {
                            const pageQuestions = JSON.parse(cleanedText);
                            if (Array.isArray(pageQuestions)) {
                                allQuestions.push(...pageQuestions);
                            }
                        }
                    } catch (err) {
                        console.error(`Erro na página ${i}:`, err);
                        toast.warning(`Erro ao processar página ${i}. Continuando...`);
                    }
                }
            }

            setQuestions(allQuestions);
            if (allQuestions.length === 0) {
                toast.info('Nenhuma questão foi identificada no PDF.');
            } else {
                toast.success(`${allQuestions.length} questões extraídas com sucesso!`);
            }

        } catch (error) {
            console.error('Erro geral:', error);
            toast.error('Erro ao processar o arquivo. Verifique o console.');
        } finally {
            setIsProcessing(false);
            setProgress('');
        }
    };

    const handleSave = async () => {
        // SImulação de salvamento
        if (questions.length === 0) return;

        // Aqui conectaria com o Supabase futuramente
        console.log('Salvando questões:', questions);
        toast.success('Questões processadas e logs gerados! (Simulação de salvamento)');
        setSavedCount(questions.length);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Upload className="w-6 h-6 text-indigo-600" />
                    Importador de Questões via IA
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Cole sua API Key do Google Gemini aqui"
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            A chave é usada apenas localmente no seu navegador.
                        </p>
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
                        disabled={isProcessing || !file || !apiKey}
                        className={`w-full py-3 rounded-md text-white font-medium flex items-center justify-center gap-2 transition-all
              ${isProcessing || !file || !apiKey
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
                            Salvar no Banco (Simulado)
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
