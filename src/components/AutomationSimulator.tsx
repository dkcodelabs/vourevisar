import { toastGate } from '@/lib/errors/toastGate';
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-toastify'
import { Progress } from '@/components/ui/progress'
import { Bot, Clock, Database, Sparkles } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface ProcessedTopicItem {
    topic_id: string
    topic_name: string
    subject_name: string
    status: string
    volume: number
    api_calls?: number
    error?: string
    reason?: string
    reasoning?: string
    source_method?: string
    normalized_score?: number
    score_label?: string
    rank_percentile?: number | null
    score_confidence?: string
    score_basis_count?: number
}

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
    from_catalog?: boolean
    incidence_source?: string | null
    source_method?: string
    processed_count?: number
    persisted_count?: number
    persistence_checked_count?: number
    persistence_error?: string
    worker_version?: string | null
    items?: ProcessedTopicItem[]
    raw_result?: any
}

interface AutomationSimulatorProps {
    onProcessComplete?: (result: any) => void
    externalResult?: any | null
}

const logCopyableJson = (label: string, value: unknown) => {
    console.log(label, value)
    console.log(`${label} JSON:\n${JSON.stringify(value, null, 2)}`)
}

export function AutomationSimulator({
    onProcessComplete,
    externalResult,
}: AutomationSimulatorProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [lastResult, setLastResult] = useState<ProcessedTopic | null>(null)
    const [quota, setQuota] = useState({ used: 0, limit: 100, remaining: 100 })

    const applyQuotaFromResult = (result: any) => {
        const googleQuota = result?.google_quota
        if (!googleQuota) return false

        const limit = Number(googleQuota.limit || 100)
        const used = Number(googleQuota.used_after_run ?? googleQuota.used_before_run ?? 0)

        setQuota({
            used,
            limit,
            remaining: Math.max(0, limit - used),
        })

        return true
    }

    const updateQuota = async () => {
        const limit = 100
        const { data: authData } = await supabase.auth.getUser()
        const userId = authData.user?.id

        if (!userId) {
            setQuota({ used: 0, limit, remaining: limit })
            return
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { data, error } = await supabase
            .from('topics')
            .select('last_audit_log,incidence_source,incidence_applied_at,subjects!inner(user_id)')
            .eq('subjects.user_id', userId)
            .eq('incidence_source', 'ai')
            .gte('incidence_applied_at', today.toISOString())

        if (error) {
            console.warn('[Incidência] Falha ao calcular cota Google pelo audit log:', error)
            return
        }

        const used = (data || []).reduce((total: number, row: any) => {
            return total + Number(row.last_audit_log?.total_api_calls || 0)
        }, 0)

        setQuota({
            used,
            limit,
            remaining: Math.max(0, limit - used),
        })
    }

    // 🔄 V36: Carregar APENAS O ÚLTIMO processado
    useEffect(() => {
        const loadLast = async () => {
            await updateQuota()

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
                    incidence_source,
                    incidence_context,
                    incidence_applied_at,
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
                    materia: (data.subjects as any)?.name || 'Geral',
                    total_volume: data.total_volume || 0,
                    maior_sub_topico: data.skip_reason || '-',
                    status: data.status === 'processed' ? 'success' :
                        data.status === 'skipped' ? 'warning' :
                            data.status === 'error' ? 'error' :
                                (data.total_volume > 0 ? 'success' : 'warning'),
                    reasoning: data.skip_reason,
                    effective_context: data.last_search_context,
                    last_used_query: data.last_used_query,
                    api_cost: (data.last_audit_log as any)?.total_api_calls || 0,
                    from_catalog: data.incidence_source === 'catalog',
                    incidence_source: data.incidence_source,
                    source_method: (data.incidence_context as any)?.source_method
                }
                setLastResult(logFromDB)
            }
        }
        loadLast()
    }, [])

    const buildProcessedItems = (result: any): ProcessedTopicItem[] => (
        Array.isArray(result?.results)
            ? result.results.map((item: any) => ({
                topic_id: String(item.topic_id || crypto.randomUUID()),
                topic_name: String(item.topic_name || 'Tópico sem nome'),
                subject_name: String(item.subject_name || 'Geral'),
                status: String(item.status || 'unknown'),
                volume: Number(item.volume || 0),
                api_calls: Number(item.api_calls || 0),
                error: item.error ? String(item.error) : undefined,
                reason: item.reason ? String(item.reason) : undefined,
                reasoning: item.reasoning ? String(item.reasoning) : undefined,
                source_method: item.source_method ? String(item.source_method) : undefined,
                normalized_score: typeof item.normalized_score === 'number' ? item.normalized_score : undefined,
                score_label: item.score_label ? String(item.score_label) : undefined,
                rank_percentile: typeof item.rank_percentile === 'number' ? item.rank_percentile : null,
                score_confidence: item.score_confidence ? String(item.score_confidence) : undefined,
                score_basis_count: typeof item.score_basis_count === 'number' ? item.score_basis_count : undefined,
            }))
            : []
    )

    const hydrateProcessResult = async (result: any, mode: 'batch' | 'single') => {
        const first = Array.isArray(result?.results) ? result.results[0] : null
        const processedItems = buildProcessedItems(result)
        const usedDirectSearch = processedItems.some(item =>
            item.source_method === 'fallback_without_gemini'
            || item.reasoning?.startsWith('Fallback sem Gemini')
        )
        const firstError = Array.isArray(result?.results)
            ? result.results.find((item: any) => item.status === 'error')?.error
            : null
        const firstDeferredReason = Array.isArray(result?.results)
            ? result.results.find((item: any) => item.status === 'deferred')?.reason
            : null
        const persistableResults = Array.isArray(result?.results)
            ? result.results.filter((item: any) => item.status !== 'deferred')
            : []
        const processedTopicIds = persistableResults.map((item: any) => item.topic_id).filter(Boolean)
        const deferredCount = Array.isArray(result?.results)
            ? result.results.filter((item: any) => item.status === 'deferred').length
            : 0
        const allDeferred = deferredCount > 0 && deferredCount === Number(result?.processed || 0)
        let persistedCount = 0
        let persistenceError: string | undefined

        if (processedTopicIds.length > 0) {
            const { data: persistedRows, error: persistedError } = await supabase
                .from('topics')
                .select('id,status,last_trend_check_at,total_volume')
                .in('id', processedTopicIds)

            if (persistedError) {
                persistenceError = persistedError.message
            } else {
                persistedCount = (persistedRows || []).filter((row: any) => {
                    const status = String(row.status || '')
                    return Boolean(row.last_trend_check_at)
                        && ['processed', 'no_volume', 'skipped', 'catalog_applied', 'error'].includes(status)
                }).length
            }
        }

        const remoteVersion = result?.worker_version || null
        const persistenceWarning = processedTopicIds.length > 0 && persistedCount < processedTopicIds.length
        const versionWarning = !remoteVersion

        return {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            topico_original: mode === 'single' && first?.topic_name
                ? String(first.topic_name)
                : deferredCount > 0 && deferredCount === Number(result.processed || 0)
                    ? `${deferredCount} tópico(s) adiado(s)`
                : `${result.processed || 0} tópico(s) processado(s)`,
            materia: mode === 'single'
                ? String(first?.subject_name || 'Geral')
                : first?.topic_name
                    ? `${first.subject_name || 'Geral'} · ${first.topic_name}`
                    : 'Worker de incidência',
            total_volume: Number(first?.volume || 0),
            maior_sub_topico: `${result.catalog || 0} catálogo · ${result.ai || 0} IA · ${result.zero || 0} volume zero · ${result.skipped || 0} pulado(s) · ${deferredCount} adiado(s) · ${result.errors || 0} erro(s)`,
            status: result.errors > 0 ? 'error' : persistenceWarning || versionWarning || result.zero > 0 || deferredCount > 0 ? 'warning' : 'success',
            reasoning: firstError
                || persistenceError
                || (versionWarning ? 'A função remota ainda não retornou versão. Redeploy pode estar pendente.' : undefined)
                || (persistenceWarning ? `Banco confirmou ${persistedCount}/${processedTopicIds.length} tópico(s).` : undefined)
                || (firstDeferredReason ? String(firstDeferredReason) : undefined)
                || `${mode === 'single' ? 'Tópico' : 'Lote'} concluído agora com ${result.processed || 0} item(ns).`,
            effective_context: result.catalog > 0
                ? 'Catálogo + busca quando necessário'
                : allDeferred
                    ? 'Busca adiada por limite diário'
                : usedDirectSearch
                    ? 'Busca direta sem Gemini'
                    : 'IA quando necessário',
            last_used_query: firstError
                ? `Erro: ${firstError}`
                : first?.status
                    ? `Primeiro resultado: ${first.status}`
                    : 'Nenhum tópico pendente',
            api_cost: Array.isArray(result.results)
                ? result.results.reduce((sum: number, item: any) => sum + Number(item.api_calls || 0), 0)
                : 0,
            from_catalog: result.catalog > 0,
            incidence_source: result.catalog > 0 ? 'catalog' : allDeferred ? null : 'ai',
            source_method: result.catalog > 0 ? 'catalog' : allDeferred ? 'deferred' : usedDirectSearch ? 'fallback_without_gemini' : 'gemini_terms',
            processed_count: result.processed || 0,
            persisted_count: persistedCount,
            persistence_checked_count: processedTopicIds.length,
            persistence_error: persistenceError,
            worker_version: remoteVersion,
            items: processedItems,
            raw_result: result,
        } satisfies ProcessedTopic
    }

    useEffect(() => {
        if (!externalResult) return

        void (async () => {
            const logEntry = await hydrateProcessResult(externalResult, 'single')
            setLastResult(logEntry)
            if (!applyQuotaFromResult(externalResult)) await updateQuota()
        })()
    }, [externalResult])

    const handleProcessNext = async () => {
        setIsProcessing(true)
        try {
            const { data: result, error } = await supabase.functions.invoke('process-topic-incidence', {
                body: { limit: 2 }
            })

            if (error) throw error
            if (!applyQuotaFromResult(result)) await updateQuota()

            if (result?.error) {
                toastGate.notifyError(result.error, 'COMPONENTS-AUTOMATIONSIMULATOR-01', { severity: 'medium' })
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
                return
            }

            const logEntry = await hydrateProcessResult(result, 'batch')

            setLastResult(logEntry)
            if (!applyQuotaFromResult(result)) await updateQuota()
            if (logEntry.status === 'warning') {
                toast.warn(logEntry.reasoning || `Processamento retornou com aviso.`)
            } else {
                toast.success(`Processamento concluído: ${logEntry.topico_original}`)
            }

            if (onProcessComplete) {
                onProcessComplete(result)
            }
        } catch (error) {
            console.error('❌ Erro ao processar:', error)
            await updateQuota()
            const msg = error instanceof Error ? error.message : String(error)
            toastGate.notifyError(msg, 'COMPONENTS-AUTOMATIONSIMULATOR-02', { severity: 'medium' })
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

    const getItemStatusLabel = (status: string) => {
        if (status === 'ai') return 'IA'
        if (status === 'catalog') return 'Catálogo'
        if (status === 'zero') return 'Sinal 0'
        if (status === 'skipped') return 'Pulado'
        if (status === 'deferred') return 'Adiado'
        if (status === 'error') return 'Erro'
        return status || 'Processado'
    }

    const isDeferredResult = (result: ProcessedTopic) => result.source_method === 'deferred'

    const getItemSourceLabel = (item: ProcessedTopicItem) => {
        if (item.status === 'catalog') return 'Catálogo'
        if (item.source_method === 'fallback_without_gemini' || item.reasoning?.startsWith('Fallback sem Gemini')) {
            return 'Busca direta'
        }
        if (item.status === 'ai') return 'IA'
        return getItemStatusLabel(item.status)
    }

    const getItemStatusClass = (status: string, sourceMethod?: string, reasoning?: string) => {
        if (sourceMethod === 'fallback_without_gemini' || reasoning?.startsWith('Fallback sem Gemini')) {
            return 'border-sky-200 bg-sky-50 text-sky-700'
        }
        if (status === 'ai') return 'border-violet-200 bg-violet-50 text-violet-700'
        if (status === 'catalog') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
        if (status === 'zero') return 'border-orange-200 bg-orange-50 text-orange-700'
        if (status === 'skipped') return 'border-yellow-200 bg-yellow-50 text-yellow-700'
        if (status === 'deferred') return 'border-slate-200 bg-slate-50 text-slate-700'
        if (status === 'error') return 'border-red-200 bg-red-50 text-red-700'
        return 'border-slate-200 bg-slate-50 text-slate-700'
    }

    const formatOperationalReason = (reason?: string) => {
        if (!reason) return ''
        if (reason.startsWith('Fallback sem Gemini')) {
            return 'Gemini indisponível; busca direta usada.'
        }
        return reason
    }

    const getBatchSourceBadge = (result: ProcessedTopic) => {
        if (result.from_catalog || result.source_method === 'catalog') {
            return {
                label: 'Catálogo',
                icon: Sparkles,
                className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
            }
        }

        if (
            result.source_method === 'fallback_without_gemini'
            || result.items?.some(item => item.source_method === 'fallback_without_gemini' || item.reasoning?.startsWith('Fallback sem Gemini'))
        ) {
            return {
                label: 'Busca direta',
                icon: Database,
                className: 'bg-sky-50 text-sky-700 border-sky-200',
            }
        }

        return {
            label: 'IA',
            icon: Bot,
            className: 'bg-violet-50 text-violet-700 border-violet-200',
        }
    }

    return (
        <Card className="mt-6">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            <span>Processamento de Importância</span>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Processa um lote pequeno de tópicos pendentes usando catálogo antes de chamar IA
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 min-w-[140px]">
                        <div className="flex items-center gap-2 text-xs font-medium">
                            <span>Limite diário de buscas:</span>
                            <span className={quotaColorClass}>{quota.used}/{quota.limit}</span>
                        </div>
                        <Progress value={quotaPercentage} className="h-2 w-full" progressColor={barColor} />
                        <span className="text-[10px] text-muted-foreground">
                            {quota.remaining} restantes hoje, pela função
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
                            Processar lote seguro
                        </>
                    )}
                </Button>

                {lastResult && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            {lastResult.processed_count === 1 ? 'Último tópico manual' : 'Último lote manual'}: {formatDate(lastResult.timestamp)}
                        </span>
                        <span>
                            Próximo automático: ainda não configurado
                        </span>
                    </div>
                )}

                {lastResult && (
                    <div className="mt-4 border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium w-[40%]">Tópico & Matéria</th>
                                    <th className="px-4 py-3 text-left font-medium w-[30%]">Detalhes da Busca</th>
                                    <th className="px-4 py-3 text-left font-medium w-[20%]">Status & Sinal</th>
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
                                                    {lastResult.from_catalog ? 'Resultado reaproveitado do catálogo' : lastResult.last_used_query || "Nenhuma query registrada"}
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
                                                {(() => {
                                                    const sourceBadge = getBatchSourceBadge(lastResult)
                                                    const SourceIcon = sourceBadge.icon

                                                    return (
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${sourceBadge.className}`}>
                                                            <SourceIcon className="mr-1 h-3 w-3" />
                                                            {sourceBadge.label}
                                                        </span>
                                                    )
                                                })()}
                                                {lastResult.reasoning && (
                                                    <span className="text-[10px] text-muted-foreground italic" title={lastResult.reasoning}>
                                                        "{formatOperationalReason(lastResult.reasoning)}"
                                                    </span>
                                                )}
                                                {typeof lastResult.persistence_checked_count === 'number' && lastResult.persistence_checked_count > 0 && (
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                                        lastResult.persisted_count === lastResult.persistence_checked_count
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                        Banco confirmou {lastResult.persisted_count || 0}/{lastResult.persistence_checked_count}
                                                    </span>
                                                )}
                                                {lastResult.worker_version && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Worker {lastResult.worker_version}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* COLUNA 3: Status e Sinal */}
                                    <td className="px-4 py-4 align-top">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                {lastResult.status === 'error' ? (
                                                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                                                        Erro
                                                    </Badge>
                                                ) : lastResult.total_volume > 0 ? (
                                                    <Badge variant="secondary" className="font-mono font-bold bg-blue-50 text-blue-700 border-blue-200">
                                                        Sinal {lastResult.total_volume.toLocaleString()}
                                                    </Badge>
                                                ) : isDeferredResult(lastResult) ? (
                                                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                                                        Não analisado hoje
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground">Sinal 0</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {lastResult.status === 'success' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                        Processado
                                                    </span>
                                                ) : lastResult.status === 'error' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                        Erro
                                                    </span>
                                                ) : isDeferredResult(lastResult) ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                        Adiado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-700">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                                        Sem sinal
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
                                                onClick={() => logCopyableJson('Audit', lastResult)}
                                                title="Ver Detalhes (Console)"
                                            >
                                                <Database className="w-3 h-3 opacity-50" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {lastResult.items && lastResult.items.length > 0 && (
                            <div className="border-t bg-muted/10 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                        Tópicos processados neste lote
                                    </p>
                                    <span className="text-[10px] text-muted-foreground">
                                        {lastResult.items.length} item(ns)
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {lastResult.items.map((item) => (
                                        <div key={item.topic_id} className="rounded-lg border bg-background px-3 py-2">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-foreground" title={item.topic_name}>
                                                        {item.topic_name}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {item.subject_name}
                                                    </p>
                                                    {(item.error || item.reason || item.reasoning) && (
                                                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground" title={item.error || item.reason || item.reasoning}>
                                                            {formatOperationalReason(item.error || item.reason || item.reasoning)}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                    <Badge variant="outline" className={getItemStatusClass(item.status, item.source_method, item.reasoning)}>
                                                        {getItemSourceLabel(item)}
                                                    </Badge>
                                                    {item.status === 'deferred' ? (
                                                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                                                            Não analisado hoje
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant={item.volume > 0 ? 'secondary' : 'outline'} className="font-mono">
                                                            Sinal {item.volume.toLocaleString('pt-BR')}
                                                        </Badge>
                                                    )}
                                                    {typeof item.api_calls === 'number' && item.api_calls > 0 && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {item.api_calls} reqs
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
