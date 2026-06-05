import { toastGate } from '@/lib/errors/toastGate';
import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { Loader2, Search, TrendingUp, AlertTriangle, ChevronDown, CheckCircle2, Sparkles, BrainCircuit, Split, AlertOctagon } from 'lucide-react'
import { calcularNotaImportancia } from '@/services/gutCalculator'
import { AutomationSimulator } from './AutomationSimulator'
import { AllTopicsTable, type TopicIncidenceFilter } from './AllTopicsTable'
import { IncidenceOperationalSummary } from '@/components/incidence/IncidenceOperationalSummary'

export function CalculadoraImportancia() {
    // const [apiKey, setApiKey] = useState('') // Removido V30
    // const [cx, setCx] = useState('') // Removido V30
    const [materia, setMateria] = useState('')
    const [topico, setTopico] = useState('')
    const [carreira, setCarreira] = useState('')
    const [banca, setBanca] = useState('')

    const [loading, setLoading] = useState(false)
    const [refreshTable, setRefreshTable] = useState(0) // ✅ Estado para forçar update da tabela
    const [topicFilter, setTopicFilter] = useState<TopicIncidenceFilter>('all')
    const [externalProcessResult, setExternalProcessResult] = useState<any | null>(null)
    const [resultado, setResultado] = useState<{
        volume_maximo: number
        nota_importancia: number
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
    } | null>(null)

    const handleCalcular = async () => {
        // Check automático interno via .env agora
        if (!materia || !topico) {
            toastGate.notifyError('Preencha Matéria e Tópico', 'COMPONENTS-CALCULADORATENDENCIA-01', { severity: 'medium' })
            return
        }

        setLoading(true)
        setResultado(null)

        try {
            const res = await calcularNotaImportancia(
                materia,
                topico,
                banca,
                carreira
            )

            setResultado(res)

            if (res.volume_maximo === 0) {
                toast.warning('Nenhum resultado encontrado. Verifique a cota ou os termos.')
            } else {
                toast.success(`Análise concluída: Nota de Importância ${res.nota_importancia}`)
            }

        } catch (error) {
            console.error(error)
            toastGate.notifyError('Erro ao calcular importância. Verifique o console.', 'COMPONENTS-CALCULADORATENDENCIA-02', { severity: 'medium' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-indigo-600" />
                        Calculadora de Importância (v12)
                    </h2>
                    <div className="flex gap-2">
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                            <Split className="w-3 h-3" /> Multi-Search Strategy
                        </span>
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                            Max Risk Logic
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Inputs de API Key removidos na V30 (.env only) */}

                    <div className="border-t border-slate-200 my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Matéria
                            </label>
                            <input
                                type="text"
                                value={materia}
                                onChange={(e) => setMateria(e.target.value)}
                                placeholder="Ex: Informática"
                                className="w-full p-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Tópico Complexo (Do Edital)
                            </label>
                            <textarea
                                value={topico}
                                onChange={(e) => setTopico(e.target.value)}
                                placeholder="Cole o tópico bruto, ex: 'Hardware: mouse, teclado, monitor e impressora'..."
                                className="w-full p-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 h-[80px]"
                            />
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <BrainCircuit className="w-3 h-3" />
                                A IA irá dividir este tópico em várias buscas (Split & Search).
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Filtro de Carreira
                            </label>
                            <input
                                type="text"
                                value={carreira}
                                onChange={(e) => setCarreira(e.target.value)}
                                placeholder="Ex: Policial (Opcional)"
                                className="w-full p-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Banca(s)
                            </label>
                            <input
                                type="text"
                                value={banca}
                                onChange={(e) => setBanca(e.target.value)}
                                placeholder="Ex: FGV, CEBRASPE"
                                className="w-full p-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleCalcular}
                        disabled={loading}
                        className={`w-full py-3 rounded-md text-white font-medium flex items-center justify-center gap-2 transition-all
              ${loading
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-md transform hover:-translate-y-0.5'}`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                IA Dividindo Tópicos + Buscando (pode demorar)...
                            </>
                        ) : (
                            <>
                                <Split className="w-5 h-5" />
                                Calcular Importância v12 (Multi-Search)
                            </>
                        )}
                    </button>
                    <p className="text-xs text-center text-slate-400">
                        * A estratégia v12 pode consumir mais cota de API pois realiza múltiplas buscas por tópico.
                    </p>
                </div>
            </div>

            {resultado && (
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                    {/* Seção de Inteligência v12 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                                Tópico Original
                            </span>
                            <span className="text-sm text-slate-600 bg-white p-3 rounded border border-indigo-100 shadow-sm italic h-full">
                                "{resultado.topicoOriginal}"
                            </span>
                        </div>

                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                                <BrainCircuit className="w-3 h-3" /> IA - Divisão de Tópicos
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {resultado.sub_topicos_ia.map((term, i) => (
                                    <span key={i} className={`text-xs px-2 py-1 rounded border shadow-sm ${term === resultado.termo_maior_risco ? 'bg-red-50 text-red-700 border-red-200 font-bold ring-2 ring-red-100' : 'bg-white text-slate-700 border-purple-100'}`}>
                                        {term}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-2 text-xs text-purple-400">
                                * Buscamos cada um destes separadamente.
                            </div>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2 flex justify-between items-center">
                        Análise de Risco (Max Volume)
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                            Tempo: {resultado.filtro_tempo}
                        </span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-6">
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                            <div className="text-red-500 text-xs font-bold uppercase mb-1 flex items-center justify-center gap-1">
                                <AlertOctagon className="w-3 h-3" /> Maior Risco Detectado
                            </div>
                            <div className="text-lg font-bold text-red-900 line-clamp-2 leading-tight min-h-[3rem] flex items-center justify-center">
                                {resultado.termo_maior_risco}
                            </div>
                            <div className="text-2xl font-black text-red-800 mt-2">
                                {resultado.volume_maximo.toLocaleString()}
                            </div>
                            <div className="text-xs text-red-400">sinal bruto encontrado</div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg flex flex-col justify-center">
                            <div className="text-slate-500 text-sm mb-1">Nota de Importância Final</div>
                            <div className={`text-5xl font-black ${resultado.nota_importancia >= 5 ? 'text-red-600' :
                                resultado.nota_importancia >= 4 ? 'text-orange-500' :
                                    resultado.nota_importancia >= 3 ? 'text-yellow-500' :
                                        'text-green-500'
                                }`}>
                                {resultado.nota_importancia}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Baseado no maior risco</div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg flex flex-col justify-center items-center text-sm">
                            {/* API Stats */}
                            <div className="w-full">
                                <span className="text-xs font-bold text-slate-400 uppercase">Custo desta Sessão (API)</span>
                                <div className="text-xl font-mono font-bold text-indigo-600 my-1">
                                    {resultado.api_stats.usadas_sessao} reqs
                                </div>
                                <div className="text-xs text-slate-500 mb-2">
                                    Múltiplas buscas realizadas
                                </div>

                                <div className="w-full h-px bg-slate-200 my-2"></div>

                                <span className="text-xs font-bold text-slate-400 uppercase">Restante Hoje</span>
                                <div className={`text-lg font-mono font-bold ${resultado.api_stats.restantes < 20 ? 'text-red-500' : 'text-green-600'}`}>
                                    {resultado.api_stats.restantes}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 max-h-[200px] overflow-y-auto">
                        <div className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider sticky top-0 bg-slate-50 pb-2">
                            Log de Sondas (Split & Search)
                        </div>
                        <div className="space-y-1 text-sm font-mono text-slate-700">
                            {resultado.log_detalhado.map((log, i) => (
                                <div key={i} className={`flex gap-2 ${log.includes(resultado.volume_maximo.toString()) ? 'font-bold text-red-700 bg-red-50' : ''}`}>
                                    <span className="text-slate-400 w-6 text-right">#{i + 1}</span>
                                    <span>{log}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <IncidenceOperationalSummary refreshTrigger={refreshTable} />

            {/* Painel operacional de incidência */}
            <div className="mt-8 pt-8 border-t-2 border-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-xl font-bold text-slate-800">
                        Processamento de incidência
                    </h2>
                </div>
                <AutomationSimulator
                    externalResult={externalProcessResult}
                    onProcessComplete={(result) => {
                        console.log('✅ Processamento completo:', result)
                        setRefreshTable(prev => prev + 1) // ✅ Força reload da tabela
                    }}
                />

                {/* 📊 TABELA DE TODOS OS TÓPICOS */}
                <div className="mt-8">
                    <AllTopicsTable
                        refreshTrigger={refreshTable}
                        filter={topicFilter}
                        onFilterChange={setTopicFilter}
                        onTopicProcessed={(result) => {
                            setExternalProcessResult(result)
                            setRefreshTable(prev => prev + 1)
                        }}
                    />
                </div>
            </div>
        </div>

    )
}
