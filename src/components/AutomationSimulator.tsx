import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-toastify'
import { processNextPendingTopic, getQuotaStats } from '@/services/gutCalculator'
import { Progress } from '@/components/ui/progress'
import { Database } from 'lucide-react'

// Mantendo interface parecida com AllTopicsTable para consistência
interface ProcessedTopic {
    id: string
    timestamp: Date
    topico_original: string
    materia: string
    total_volume: number
    maior_sub_topico: string // Usado como motivo/skip_reason
    status: 'success' | 'rejected' | 'error' | 'warning' // warning = volume 0
    reasoning?: string
    effective_context?: string
    last_used_query?: string
    api_cost?: number
}

interface AutomationSimulatorProps {
    onProcessComplete?: (result: any) => void
}

export function AutomationSimulator({
    onProcessComplete
}: AutomationSimulatorProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [lastResult, setLastResult] = useState<ProcessedTopic | null>(null)
    const [quota, setQuota] = useState({ used: 0, limit: 100, remaining: 100 })

    const updateQuota = () => {
        const stats = getQuotaStats()
        setQuota(stats)
    }

    // 🔄 V36: Carregar APENAS O ÚLTIMO processado
    useEffect(() => {
        const loadLast = async () => {
            updateQuota()

            const supabase = (await import('@/services/gutCalculator')).getSupabaseClient()
            if (!supabase) return

            const { data } = await supabase
                .from('topics')
                .select(`
                    id, 
                    name, 
                    last_trend_check_at, 
                    total_volume, 
                    skip_reason, 
                    last_audit_log,
                    last_used_query,
                    last_search_context,
                    status,
                    subjects(name)
                `)
                .not('last_trend_check_at', 'is', null)
                .order('last_trend_check_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (data) {
                const logFromDB: ProcessedTopic = {
                    id: data.id,
                    timestamp: new Date(data.last_trend_check_at),
                    topico_original: data.name,
                    materia: data.subjects?.name || 'Geral',
                    total_volume: data.total_volume || 0,
                    maior_sub_topico: data.skip_reason || '-',
                    status: data.status === 'processed' ? 'success' :
                        data.status === 'skipped' ? 'warning' :
                            data.status === 'error' ? 'error' :
                                (data.total_volume > 0 ? 'success' : 'warning'),
                    reasoning: data.skip_reason,
                    effective_context: data.last_search_context,
                    last_used_query: data.last_used_query,
                    api_cost: data.last_audit_log?.total_api_calls || 0
                }
                setLastResult(logFromDB)
            }
        }
        loadLast()
    }, [])

    const handleProcessNext = async () => {
        setIsProcessing(true)
        try {
            const result = await processNextPendingTopic()
            updateQuota()

            if ('error' in result) {
                toast.error(result.error)
                // Se der erro/rejeição, mas tiver dados do tópico, usa eles
                if (result.rejected || result.topicoOriginal) {
                    const rejectedLog: ProcessedTopic = {
                        id: result.id || crypto.randomUUID(),
                        timestamp: new Date(),
                        topico_original: result.topicoOriginal || result.topico_original || 'Erro',
                        materia: result.materia || '-',
                        total_volume: 0,
                        maior_sub_topico: result.reasoning || result.error, // Mostra o motivo
                        status: 'rejected',
                        reasoning: result.reasoning || result.error,
                        api_cost: result.api_cost || 0,
                        effective_context: 'Rejeitado por IA'
                    }
                    setLastResult(rejectedLog)

                    // V ITAL: Notificar o pai para atualizar a tabela de baixo pois o tópico foi alterado no DB
                    if (onProcessComplete) {
                        onProcessComplete(result)
                    }
                } else {
                    // Erro genérico sem dados (ex: falha de API antes de identificar tópico)
                    setLastResult({
                        id: crypto.randomUUID(),
                        timestamp: new Date(),
                        topico_original: 'Erro de Processamento',
                        materia: '-',
                        total_volume: 0,
                        maior_sub_topico: result.error,
                        status: 'error',
                        reasoning: result.error
                    })
                }
                return
            }

            const logEntry: ProcessedTopic = {
                id: crypto.randomUUID(),
                timestamp: new Date(),
                topico_original: result.topico_original || result.topicoOriginal,
                materia: result.materia || 'Geral',
                total_volume: result.total_volume,
                maior_sub_topico: result.maior_sub_topico || '-',
                status: (result.status === 'processed' ? 'success' : result.status) || 'success',
                reasoning: result.reasoning,
                effective_context: result.effective_context,
                last_used_query: result.last_used_query,
                api_cost: result.api_cost || 0
            }

            setLastResult(logEntry)
            toast.success(`✅ Processado: ${logEntry.topico_original}`)

            if (onProcessComplete) {
                onProcessComplete(result)
            }
        } catch (error) {
            console.error('❌ Erro ao processar:', error)
            updateQuota()
            const msg = error instanceof Error ? error.message : String(error)
            toast.error(msg)
            setLastResult({
                id: crypto.randomUUID(),
                timestamp: new Date(),
                topico_original: 'Erro Crítico',
                materia: '-',
                total_volume: 0,
                maior_sub_topico: msg,
                status: 'error',
                reasoning: msg
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        }).format(date)
    }

    const quotaPercentage = Math.min(100, (quota.used / quota.limit) * 100)
    const quotaColorClass = quotaPercentage > 90 ? 'text-red-600' : quotaPercentage > 75 ? 'text-orange-500' : 'text-green-600'
    const barColor = quotaPercentage > 90 ? '#dc2626' : quotaPercentage > 75 ? '#f97316' : '#16a34a'

    return (
        <Card className="mt-6">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            <span>Automação de Tendência</span>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Processa automaticamente tópicos pendentes da base de dados
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 min-w-[140px]">
                        <div className="flex items-center gap-2 text-xs font-medium">
                            <span>Cota Diária Google:</span>
                            <span className={quotaColorClass}>{quota.used}/{quota.limit}</span>
                        </div>
                        <Progress value={quotaPercentage} className="h-2 w-full" progressColor={barColor} />
                        <span className="text-[10px] text-muted-foreground">
                            {quota.remaining} requisições restantes (Free)
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button
                    onClick={handleProcessNext}
                    disabled={isProcessing}
                    className="w-full"
                    size="lg"
                >
                    {isProcessing ? (
                        <>
                            <span className="animate-spin mr-2">⚙️</span>
                            Processando...
                        </>
                    ) : (
                        <>
                            <span className="mr-2">🔄</span>
                            Processar Próximo Tópico Pendente
                        </>
                    )}
                </Button>

                {lastResult && (
                    <div className="mt-4 border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium w-[40%]">Tópico & Matéria</th>
                                    <th className="px-4 py-3 text-left font-medium w-[30%]">Detalhes da Busca</th>
                                    <th className="px-4 py-3 text-left font-medium w-[20%]">Status & Volume</th>
                                    <th className="px-4 py-3 text-center font-medium w-[10%]">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                <tr>
                                    {/* COLUNA 1: Tópico e Matéria */}
                                    <td className="px-4 py-4 align-top">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium text-sm text-foreground leading-snug">
                                                {lastResult.topico_original}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground bg-muted/50 truncate max-w-[200px]">
                                                    📚 {lastResult.materia}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Processado em {formatDate(lastResult.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* COLUNA 2: Detalhes */}
                                    <td className="px-4 py-4 align-top">
                                        <div className="flex flex-col gap-2">
                                            <div className="bg-muted/30 p-1.5 rounded border border-muted/50">
                                                <p className="text-[11px] font-mono text-muted-foreground break-words leading-tight">
                                                    {lastResult.last_used_query || "Nenhuma query registrada"}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {lastResult.effective_context && (
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${lastResult.effective_context.includes("Global")
                                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                                        }`}>
                                                        🎯 {lastResult.effective_context.replace("🌍 ", "")}
                                                    </span>
                                                )}
                                                {lastResult.reasoning && (
                                                    <span className="text-[10px] text-muted-foreground italic" title={lastResult.reasoning}>
                                                        "{lastResult.reasoning}"
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* COLUNA 3: Status e Volume */}
                                    <td className="px-4 py-4 align-top">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                {lastResult.total_volume > 0 ? (
                                                    <Badge variant="secondary" className="font-mono font-bold bg-blue-50 text-blue-700 border-blue-200">
                                                        {lastResult.total_volume.toLocaleString()}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground">Vol. 0</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {lastResult.status === 'success' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                        Processado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                                        {lastResult.status === 'error' ? 'Erro' : 'Pulado'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* COLUNA 4: Audit */}
                                    <td className="px-4 py-4 align-middle text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <Badge variant="outline" className={`font-mono text-[10px] ${lastResult.api_cost && lastResult.api_cost > 20 ? 'text-red-600 border-red-200' : ''}`}>
                                                {lastResult.api_cost || 0} reqs
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 rounded-full hover:bg-muted"
                                                onClick={() => console.log('Audit:', lastResult)}
                                                title="Ver Detalhes (Console)"
                                            >
                                                <Database className="w-3 h-3 opacity-50" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
