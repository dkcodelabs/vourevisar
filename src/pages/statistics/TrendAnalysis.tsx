import { useState } from 'react';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import { AutomationSimulator } from '@/components/AutomationSimulator';
import { AllTopicsTable, type TopicIncidenceFilter } from '@/components/AllTopicsTable';
import { IncidenceOperationalSummary } from '@/components/incidence/IncidenceOperationalSummary';
import { useNavigate } from 'react-router-dom';

const TrendAnalysis = () => {
    const navigate = useNavigate();
    const [refreshTable, setRefreshTable] = useState(0);
    const [topicFilter, setTopicFilter] = useState<TopicIncidenceFilter>('all');
    const [externalProcessResult, setExternalProcessResult] = useState<any | null>(null);

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-foreground">
            <div className="mb-8">
                <button
                    onClick={() => navigate('/estatisticas')}
                    className="text-content-muted hover:text-foreground text-sm flex items-center gap-1 mb-2 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar para Estatísticas
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-primary" />
                            Calculadora de Sinal de Cobrança
                        </h1>
                        <p className="text-content-muted mt-1.5 text-sm">Analise sinais brutos de cobrança com Inteligência Artificial e dados de busca.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <IncidenceOperationalSummary refreshTrigger={refreshTable} />

                {/* Painel operacional de incidência */}
                <div className="mt-8 pt-8 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-6">
                        <h2 className="text-xl font-bold text-slate-800">
                            Processamento de incidência
                        </h2>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <AutomationSimulator
                            externalResult={externalProcessResult}
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
            </div>
        </div>

    );
};

export default TrendAnalysis;
