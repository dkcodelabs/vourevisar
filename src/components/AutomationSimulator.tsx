import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-toastify'
import { processNextPendingTopic } from '@/services/gutCalculator'

interface ProcessedTopic {
    id: string
    timestamp: Date
    topico_original: string
    materia: string
    total_volume: number
    maior_sub_topico: string
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
    const [logs, setLogs] = useState<ProcessedTopic[]>([])

    // 🔄 V35: Carregar histórico recente diretamente da tabela TOPICS
    useEffect(() => {
        const loadHistory = async () => {
            const supabase = (await import('@/services/gutCalculator')).getSupabaseClient()
            if (!supabase) return

            const { data, error } = await supabase
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
                    status
                `)
                .not('last_trend_check_at', 'is', null) // Apenas processados
                .order('last_trend_check_at', { ascending: false })
                .limit(5)

            if (data) {
                const logsFromDB: ProcessedTopic[] = data.map((t: any) => ({
                    id: t.id,
                    timestamp: new Date(t.last_trend_check_at),
                    topico_original: t.name,
                    materia: 'Automático', // Simplificação para view rápida
                    total_volume: t.total_volume || 0,
                    maior_sub_topico: t.skip_reason || '-',
                    status: t.status === 'processed' ? 'success' :
                        t.status === 'skipped' ? 'warning' :
                            t.status === 'error' ? 'error' :
                                (t.total_volume > 0 ? 'success' : 'warning'),
                    reasoning: t.skip_reason,
                    effective_context: t.last_search_context,
                    last_used_query: t.last_used_query,
                    api_cost: t.last_audit_log?.total_api_calls || 0
                }))
                setLogs(logsFromDB)
            }
        }
        loadHistory()
    }, [])

    const handleProcessNext = async () => {
        // Credenciais checkadas no service via .env
        setIsProcessing(true)
        try {
            // 🔗 CONEXÃO REAL COM O BANCO (v16.5)
            const result = await processNextPendingTopic()

            if ('error' in result) {
                toast.error(result.error)

                // Log de erro
                const errorLog: ProcessedTopic = {
                    id: crypto.randomUUID(),
                    timestamp: new Date(),
                    topico_original: 'N/A',
                    materia: 'N/A',
                    total_volume: 0,
                    maior_sub_topico: '-',
                    status: 'error',
                    reasoning: result.error
                }
                setLogs(prev => [errorLog, ...prev.slice(0, 4)])
                return
            }

            // Log de sucesso
            // Log de sucesso
            const logEntry: ProcessedTopic = {
                id: crypto.randomUUID(),
                timestamp: new Date(),
                topico_original: result.topico_original || result.topicoOriginal, // Nome padronizado do backend
                materia: result.materia || 'Geral',
                total_volume: result.total_volume, // ✅ AGORA VEM CORRETO DO BACKEND
                maior_sub_topico: result.maior_sub_topico || '-',
                status: (result.status === 'processed' ? 'success' : result.status) || 'success',
                reasoning: result.reasoning,
                effective_context: result.effective_context,
                last_used_query: result.last_used_query,
                api_cost: result.api_cost || 0
            }

            setLogs(prev => [logEntry, ...prev.slice(0, 4)])
            toast.success(`✅ Processado: ${logEntry.topico_original} (${logEntry.total_volume.toLocaleString()} resultados)`)

            if (onProcessComplete) {
                onProcessComplete(result)
            }
        } catch (error) {
            console.error('❌ Erro ao processar tópico:', error)

            const errorMessage = error instanceof Error ? error.message : String(error)
            toast.error(`❌ ${errorMessage}`)

            // Log de erro SEMPRE (mesmo quando IA rejeita)
            const errorLog: ProcessedTopic = {
                id: crypto.randomUUID(),
                timestamp: new Date(),
                topico_original: errorMessage.includes('\'b\'') ? 'b' : 'Erro',
                materia: '-',
                total_volume: 0,
                maior_sub_topico: 'Rejeitado',
                status: 'error',
                reasoning: errorMessage
            }

            console.log('🔍 Adicionando log de erro:', errorLog)
            console.log('🔍 Estado atual de logs:', logs)

            setLogs(prevLogs => {
                const newLogs = [errorLog, ...prevLogs.slice(0, 4)]
                console.log('🔍 Novo estado de logs:', newLogs)
                return newLogs
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date)
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, color: string }> = {
            success: { variant: 'default', label: '✅ Sucesso', color: 'bg-green-500' },
            processed: { variant: 'default', label: '✅ Sucesso', color: 'bg-green-500' }, // Mapping direto
            rejected: { variant: 'secondary', label: '⚠️ Rejeitado', color: 'bg-yellow-500' },
            error: { variant: 'destructive', label: '❌ Erro', color: 'bg-red-500' },
            warning: { variant: 'outline', label: '⚠️ Volume 0', color: 'bg-orange-500' },
            skipped: { variant: 'outline', label: '⚠️ Volume 0', color: 'bg-orange-500' } // Mapping direto
        }

        const config = variants[status] || variants['success'] // Fallback seguro
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">🤖</span>
                    <span>Automação de Tendência</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Processa automaticamente tópicos pendentes da base de dados
                </p>
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

                {logs.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="font-semibold text-sm">📋 Últimos Processamentos:</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">Data/Hora</th>
                                            <th className="px-3 py-2 text-left font-medium">Tópico</th>
                                            <th className="px-3 py-2 text-right font-medium">Vol.</th>
                                            <th className="px-3 py-2 text-center font-medium">Custo</th>
                                            <th className="px-3 py-2 text-left font-medium">Query Usada</th>
                                            <th className="px-3 py-2 text-left font-medium">Contexto</th>
                                            <th className="px-3 py-2 text-left font-medium">Motivo</th>
                                            <th className="px-3 py-2 text-center font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {logs.map((log) => (
                                            <tr
                                                key={log.id}
                                                className="hover:bg-muted/50 transition-colors"
                                                title={log.reasoning}
                                            >
                                                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                                    {formatDate(log.timestamp)}
                                                </td>
                                                <td className="px-3 py-2 max-w-[200px] truncate" title={log.topico_original}>
                                                    {log.topico_original}
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono font-semibold">
                                                    {log.total_volume.toLocaleString()}
                                                </td>
                                                <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                                                    <Badge variant="outline" className={`font-mono text-[10px] ${log.api_cost && log.api_cost > 20 ? 'text-red-600 border-red-200' : ''}`}>
                                                        {log.api_cost || 0} reqs
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-2 max-w-[150px] truncate text-xs font-mono text-muted-foreground" title={log.last_used_query || "Query não disponível"}>
                                                    {log.last_used_query || '-'}
                                                </td>
                                                <td className="px-3 py-2 max-w-[150px] truncate" title={log.effective_context}>
                                                    {log.effective_context?.includes('Global') ? (
                                                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                                                            🌍 Global
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">{log.effective_context || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 truncate max-w-[200px] text-xs" title={log.reasoning}>
                                                    {log.reasoning || log.maior_sub_topico}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {getStatusBadge(log.status)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {logs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                        <p>Nenhum tópico processado ainda</p>
                        <p className="text-xs mt-1">Clique no botão acima para processar o primeiro</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
