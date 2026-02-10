import React, { useState } from 'react';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { errorService } from '@/lib/errors/errorService';
import { Loader2, TrendingUp, BrainCircuit, Split, AlertOctagon, ArrowLeft } from 'lucide-react';
import { calcularNotaTendencia } from '@/services/gutCalculator';
import { AutomationSimulator } from '@/components/AutomationSimulator';
import { AllTopicsTable } from '@/components/AllTopicsTable';
import { useNavigate } from 'react-router-dom';

const TrendAnalysis = () => {
    const navigate = useNavigate();
    const [materia, setMateria] = useState('');
    const [topico, setTopico] = useState('');
    const [carreira, setCarreira] = useState('');
    const [banca, setBanca] = useState('');

    const [loading, setLoading] = useState(false);
    const [refreshTable, setRefreshTable] = useState(0);
    const [resultado, setResultado] = useState<{
        volume_maximo: number
        nota_gut: number
        log_detalhado: string[]
        carreira: string
        bancas_analisadas: string[]
        topicoOriginal: string
        sub_topicos_ia: string[]
        termo_maior_risco: string
        filtro_tempo: string
        api_stats: {
            usadas_sessao: number
            restantes: number
            cota_maxima: number
        }
    } | null>(null);

    const handleCalcular = async () => {
        if (!materia || !topico) {
            toastGate.notifyError('Preencha Matéria e Tópico', 'TREND-INPUT-MISS', { severity: 'low' });
            return;
        }

        setLoading(true);
        setResultado(null);

        try {
            const res = await calcularNotaTendencia(
                materia,
                topico,
                banca,
                carreira
            );

            setResultado(res);

            if (res.volume_maximo === 0) {
                toast.warning('Nenhum resultado encontrado. Verifique a cota ou os termos.');
            } else {
                toast.success(`Análise concluída: Nota GUT ${res.nota_gut}`);
            }

        } catch (error) {
            console.error(error);
            errorService.report(error, { module: 'trend', action: 'calculate', userMessage: "Erro ao calcular tendência" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-slate-900">
            <div className="mb-8">
                <button
                    onClick={() => navigate('/estatisticas')}
                    className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1 mb-2 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar para Estatísticas
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-indigo-600" />
                            Calculadora de Tendência (GUT)
                        </h1>
                        <p className="text-slate-500 mt-1.5 text-sm">Analise a relevância de tópicos com Inteligência Artificial e dados de mercado.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-800">
                            Parâmetros de Análise
                        </h2>
                        <div className="flex gap-2">
                            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                                <Split className="w-3 h-3" /> Multi-Search Strategy
                            </span>
                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-medium">
                                Max Risk Logic
                            </span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Matéria
                                </label>
                                <input
                                    type="text"
                                    value={materia}
                                    onChange={(e) => setMateria(e.target.value)}
                                    placeholder="Ex: Informática"
                                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div className="row-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Tópico Complexo (Do Edital)
                                </label>
                                <textarea
                                    value={topico}
                                    onChange={(e) => setTopico(e.target.value)}
                                    placeholder="Cole o tópico bruto, ex: 'Hardware: mouse, teclado, monitor e impressora'..."
                                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-[120px] transition-all resize-none"
                                />
                                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                                    <BrainCircuit className="w-3.5 h-3.5" />
                                    A IA irá dividir este tópico em várias buscas (Split & Search).
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Filtro de Carreira
                                    </label>
                                    <input
                                        type="text"
                                        value={carreira}
                                        onChange={(e) => setCarreira(e.target.value)}
                                        placeholder="Ex: Policial (Opcional)"
                                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Banca(s)
                                    </label>
                                    <input
                                        type="text"
                                        value={banca}
                                        onChange={(e) => setBanca(e.target.value)}
                                        placeholder="Ex: FGV, CEBRASPE"
                                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleCalcular}
                                disabled={loading}
                                className={`w-full py-3.5 rounded-lg text-white font-medium flex items-center justify-center gap-2.5 transition-all
                      ${loading
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-[0.99] transform'}`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        IA Dividindo Tópicos + Buscando (pode demorar)...
                                    </>
                                ) : (
                                    <>
                                        <Split className="w-5 h-5" />
                                        Calcular Tendência v12 (Multi-Search)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {resultado && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Seção de Inteligência v12 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 mb-6">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                                    Tópico Original
                                </span>
                                <span className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm italic h-full">
                                    "{resultado.topicoOriginal}"
                                </span>
                            </div>

                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                                    <BrainCircuit className="w-3 h-3" /> IA - Divisão de Tópicos
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {resultado.sub_topicos_ia.map((term, i) => (
                                        <span key={i} className={`text-xs px-2.5 py-1.5 rounded-md border shadow-sm ${term === resultado.termo_maior_risco ? 'bg-red-50 text-red-700 border-red-200 font-bold ring-2 ring-red-100' : 'bg-white text-slate-700 border-purple-100'}`}>
                                            {term}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                            Análise de Risco (Max Volume)
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-normal border border-slate-200">
                                Filtro: {resultado.filtro_tempo}
                            </span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-6">
                            <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex flex-col items-center justify-center">
                                <div className="text-red-500 text-xs font-bold uppercase mb-2 flex items-center justify-center gap-1.5">
                                    <AlertOctagon className="w-4 h-4" /> Maior Risco Detectado
                                </div>
                                <div className="text-lg font-bold text-red-900 line-clamp-2 leading-tight min-h-[3rem] flex items-center justify-center text-center">
                                    {resultado.termo_maior_risco}
                                </div>
                                <div className="text-3xl font-black text-red-800 mt-2 tracking-tight">
                                    {resultado.volume_maximo.toLocaleString()}
                                </div>
                                <div className="text-xs text-red-400 font-medium mt-1">questões encontradas</div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-xl flex flex-col justify-center border border-slate-100">
                                <div className="text-slate-500 text-sm mb-1 font-medium">Nota GUT Final</div>
                                <div className={`text-6xl font-black tracking-tighter ${resultado.nota_gut >= 5 ? 'text-red-600' :
                                    resultado.nota_gut >= 4 ? 'text-orange-500' :
                                        resultado.nota_gut >= 3 ? 'text-yellow-500' :
                                            'text-green-500'
                                    }`}>
                                    {resultado.nota_gut}
                                </div>
                                <div className="text-xs text-slate-400 mt-2 font-medium">Baseado no maior risco</div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-xl flex flex-col justify-center items-center text-sm border border-slate-100">
                                {/* API Stats */}
                                <div className="w-full">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custo desta Sessão</span>
                                    <div className="text-xl font-mono font-bold text-indigo-600 my-1">
                                        {resultado.api_stats.usadas_sessao} reqs
                                    </div>

                                    <div className="w-full h-px bg-slate-200 my-3"></div>

                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cota Restante</span>
                                    <div className={`text-lg font-mono font-bold ${resultado.api_stats.restantes < 20 ? 'text-red-500' : 'text-green-600'}`}>
                                        {resultado.api_stats.restantes}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 max-h-[200px] overflow-y-auto custom-scrollbar">
                            <div className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider sticky top-0 bg-slate-50 pb-2 border-b border-slate-100">
                                Log de Sondas (Split & Search)
                            </div>
                            <div className="space-y-1.5 text-xs font-mono text-slate-700">
                                {resultado.log_detalhado.map((log, i) => (
                                    <div key={i} className={`flex gap-3 p-1.5 rounded ${log.includes(resultado.volume_maximo.toString()) ? 'font-bold text-red-700 bg-red-100/50' : ''}`}>
                                        <span className="text-slate-400 w-6 text-right select-none">#{i + 1}</span>
                                        <span>{log}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 🤖 PAINEL DE AUTOMAÇÃO (V16.5) */}
                <div className="mt-8 pt-8 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="text-2xl">🤖</span>
                        <h2 className="text-xl font-bold text-slate-800">
                            Painel de Automação (Simulador)
                        </h2>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <AutomationSimulator
                            onProcessComplete={(result) => {
                                console.log('✅ Processamento completo:', result)
                                setRefreshTable(prev => prev + 1)
                            }}
                        />
                    </div>

                    {/* 📊 TABELA DE TODOS OS TÓPICOS */}
                    <div className="mt-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Base de Tópicos Importados</h3>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <AllTopicsTable refreshTrigger={refreshTable} />
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default TrendAnalysis;
