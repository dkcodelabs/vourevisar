import { useState } from 'react'
import { AutomationSimulator } from './AutomationSimulator'
import { AllTopicsTable, type TopicIncidenceFilter } from './AllTopicsTable'
import { IncidenceOperationalSummary } from '@/components/incidence/IncidenceOperationalSummary'

export function CalculadoraImportancia() {
    const [refreshTable, setRefreshTable] = useState(0)
    const [topicFilter, setTopicFilter] = useState<TopicIncidenceFilter>('all')
    const [externalProcessResult, setExternalProcessResult] = useState<any | null>(null)

    return (
        <div className="space-y-6">
            <IncidenceOperationalSummary refreshTrigger={refreshTable} />

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
                        setRefreshTable(prev => prev + 1)
                    }}
                />

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
