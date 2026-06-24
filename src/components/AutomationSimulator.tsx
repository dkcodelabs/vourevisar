import { toastGate } from '@/lib/errors/toastGate';
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-toastify'
import { Progress } from '@/components/ui/progress'
import { Bot, Clock, Database, Eye, Sparkles } from 'lucide-react'
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
    edital_name?: string
    exam_board?: string
    organ?: string
    position?: string
    year?: string
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

type QueueStatusFilter = 'pending' | 'no_result' | 'error'

interface QueueEditalOption {
    id: string
    name: string
    exam_board: string | null
}

interface QueueSubjectOption {
    id: string
    name: string
    edital_id: string | null
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
    const [isPreviewing, setIsPreviewing] = useState(false)
    const [lastResult, setLastResult] = useState<ProcessedTopic | null>(null)
    const [queuePreview, setQueuePreview] = useState<ProcessedTopicItem[]>([])
    const [queueEditals, setQueueEditals] = useState<QueueEditalOption[]>([])
    const [queueSubjects, setQueueSubjects] = useState<QueueSubjectOption[]>([])
    const [selectedQueueEditalId, setSelectedQueueEditalId] = useState('')
    const [selectedQueueSubjectId, setSelectedQueueSubjectId] = useState('')
    const [queueStatus, setQueueStatus] = useState<QueueStatusFilter>('pending')
    const [quota, setQuota] = useState({ used: 0, limit: 100, remaining: 100 })

    const queueScopeBody = () => ({
        limit: 2,
        ...(selectedQueueEditalId ? { editalId: selectedQueueEditalId } : {}),
        ...(selectedQueueSubjectId ? { subjectId: selectedQueueSubjectId } : {}),
        queueStatus,
    })

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
                const incidenceContext = (data.incidence_context || {}) as any
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
                    source_method: incidenceContext?.source_method,
                    items: [{
                        topic_id: data.id,
                        topic_name: data.name,
                        subject_name: (data.subjects as any)?.name || 'Geral',
                        status: data.status === 'catalog_applied' ? 'catalog' : data.status === 'processed' ? 'ai' : String(data.status || 'unknown'),
                        volume: Number(data.total_volume || 0),
                        api_calls: Number((data.last_audit_log as any)?.total_api_calls || 0),
                        reason: data.skip_reason || undefined,
                        source_method: incidenceContext?.source_method,
                        normalized_score: typeof incidenceContext?.normalized_score === 'number' ? incidenceContext.normalized_score : undefined,
                        score_label: incidenceContext?.score_label ? String(incidenceContext.score_label) : undefined,
                        rank_percentile: typeof incidenceContext?.rank_percentile === 'number' ? incidenceContext.rank_percentile : null,
                        score_confidence: incidenceContext?.score_confidence ? String(incidenceContext.score_confidence) : undefined,
                        score_basis_count: typeof incidenceContext?.score_basis_count === 'number' ? incidenceContext.score_basis_count : undefined,
                    }]
                }
                setLastResult(logFromDB)
            }
        }
        loadLast()
    }, [])

    useEffect(() => {
        const loadQueueFilters = async () => {
            const { data: authData } = await supabase.auth.getUser()
            const userId = authData.user?.id
            if (!userId) return

            const [editalsResult, subjectsResult] = await Promise.all([
                supabase
                    .from('user_editais')
                    .select('id,name,exam_board,created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('subjects')
                    .select('id,name,edital_id')
                    .eq('user_id', userId)
                    .order('name', { ascending: true }),
            ])

            if (editalsResult.error) {
                console.warn('[Incidência] Falha ao carregar editais para fila:', editalsResult.error)
            } else {
                setQueueEditals((editalsResult.data || []).map((edital: any) => ({
                    id: String(edital.id),
                    name: String(edital.name || 'Edital sem nome'),
                    exam_board: edital.exam_board ? String(edital.exam_board) : null,
                })))
            }

            if (subjectsResult.error) {
                console.warn('[Incidência] Falha ao carregar matérias para fila:', subjectsResult.error)
            } else {
                setQueueSubjects((subjectsResult.data || []).map((subject: any) => ({
                    id: String(subject.id),
                    name: String(subject.name || 'Matéria sem nome'),
                    edital_id: subject.edital_id ? String(subject.edital_id) : null,
                })))
            }
        }

        void loadQueueFilters()
    }, [])

    useEffect(() => {
        setQueuePreview([])
    }, [selectedQueueEditalId, selectedQueueSubjectId, queueStatus])

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
                edital_name: item.edital_name ? String(item.edital_name) : undefined,
                exam_board: item.exam_board ? String(item.exam_board) : undefined,
                organ: item.organ ? String(item.organ) : undefined,
                position: item.position ? String(item.position) : undefined,
                year: item.year ? String(item.year) : undefined,
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
                || (persistenceWarning ? `Salvo ${persistedCount}/${processedTopicIds.length} tópico(s).` : undefined)
                || (firstDeferredReason ? String(firstDeferredReason) : undefined)
                || `${mode === 'single' ? 'Tópico' : 'Lote'} concluído agora com ${result.processed || 0} item(ns).`,
            effective_context: result.catalog > 0
                ? 'Reaproveitado do catálogo'
                : allDeferred
                    ? 'Busca adiada por limite diário'
                : usedDirectSearch
                    ? 'Busca direta sem Gemini'
                    : 'Análise automática',
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
                body: queueScopeBody()
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

    const handlePreviewQueue = async () => {
        setIsPreviewing(true)
        try {
            const { data: result, error } = await supabase.functions.invoke('process-topic-incidence', {
                body: { ...queueScopeBody(), previewQueue: true }
            })

            if (error) throw error

            if (result?.error) {
                toastGate.notifyError(result.error, 'COMPONENTS-AUTOMATIONSIMULATOR-QUEUE-PREVIEW-01', { severity: 'medium' })
                return
            }

            const previewItems = buildProcessedItems(result)
            setQueuePreview(previewItems)
            logCopyableJson('Prévia da fila de incidência', result)

            if (previewItems.length === 0) {
                toast.info(result?.message || 'Nenhum tópico pendente na fila atual.')
            } else {
                toast.success(`Prévia carregada: ${previewItems.length} tópico(s) na próxima fila.`)
            }
        } catch (error) {
            console.error('❌ Erro ao pré-visualizar fila:', error)
            const msg = error instanceof Error ? error.message : String(error)
            toastGate.notifyError(msg, 'COMPONENTS-AUTOMATIONSIMULATOR-QUEUE-PREVIEW-02', { severity: 'medium' })
        } finally {
            setIsPreviewing(false)
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
        if (status === 'ai') return 'Processado'
        if (status === 'catalog') return 'Reaproveitado'
        if (status === 'zero' || status === 'no_volume') return 'Sem resultado útil'
        if (status === 'skipped') return 'Pulado'
        if (status === 'deferred') return 'Adiado'
        if (status === 'error') return 'Erro'
        return status || 'Processado'
    }

    const isDeferredResult = (result: ProcessedTopic) => result.source_method === 'deferred'

    const getCoverageLabel = (item?: Pick<ProcessedTopicItem, 'status' | 'volume' | 'normalized_score' | 'score_label'> | null) => {
        if (!item) return 'Não analisado'
        if (item.status === 'deferred') return 'Não analisado hoje'
        if (item.status === 'error') return 'Erro'
        if (item.status === 'skipped') return 'Pulado'
        if (item.status === 'zero' || item.status === 'no_volume' || Number(item.volume || 0) <= 0) return 'Sem resultado útil'
        if (item.score_label) return item.score_label
        if (typeof item.normalized_score === 'number') {
            if (item.normalized_score >= 4) return 'Cobrança alta'
            if (item.normalized_score >= 3) return 'Cobrança média'
            return 'Cobrança baixa'
        }
        return 'Cobrança registrada'
    }

    const getCoverageClass = (label: string) => {
        if (label.includes('alta')) return 'border-red-200 bg-red-50 text-red-700'
        if (label.includes('média')) return 'border-orange-200 bg-orange-50 text-orange-700'
        if (label.includes('baixa')) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
        if (label.includes('registrada')) return 'border-blue-200 bg-blue-50 text-blue-700'
        if (label.includes('útil')) return 'border-orange-200 bg-orange-50 text-orange-700'
        if (label.includes('analisado')) return 'border-slate-200 bg-slate-50 text-slate-700'
        if (label === 'Erro') return 'border-red-200 bg-red-50 text-red-700'
        return 'border-slate-200 bg-slate-50 text-slate-700'
    }

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
        if (status === 'zero' || status === 'no_volume') return 'border-orange-200 bg-orange-50 text-orange-700'
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

    const isRoutineReason = (reason?: string) => {
        if (!reason) return true
        return [
            'Processado com sucesso',
            'Lote concluído agora',
            'Tópico concluído agora',
            'Volume 0 na busca atual',
        ].some((text) => reason.includes(text))
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
            label: 'Busca com IA',
            icon: Bot,
            className: 'bg-violet-50 text-violet-700 border-violet-200',
        }
    }

    const resultItems = lastResult?.items || []
    const resultCounts = {
        total: resultItems.length || lastResult?.processed_count || 0,
        processed: resultItems.filter((item) => ['ai', 'catalog'].includes(item.status)).length,
        noResult: resultItems.filter((item) => item.status === 'zero' || item.status === 'no_volume').length,
        deferred: resultItems.filter((item) => item.status === 'deferred').length,
        errors: resultItems.filter((item) => item.status === 'error').length,
        skipped: resultItems.filter((item) => item.status === 'skipped').length,
    }
    const filteredQueueSubjects = selectedQueueEditalId
        ? queueSubjects.filter(subject => subject.edital_id === selectedQueueEditalId)
        : []

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
                <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_180px]">
                    <label className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            Edital
                        </span>
                        <select
                            value={selectedQueueEditalId}
                            onChange={(event) => {
                                setSelectedQueueEditalId(event.target.value)
                                setSelectedQueueSubjectId('')
                            }}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="">Todos os editais</option>
                            {queueEditals.map((edital) => (
                                <option key={edital.id} value={edital.id}>
                                    {edital.name}{edital.exam_board ? ` · ${edital.exam_board}` : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            Matéria
                        </span>
                        <select
                            value={selectedQueueSubjectId}
                            onChange={(event) => setSelectedQueueSubjectId(event.target.value)}
                            disabled={!selectedQueueEditalId}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                        >
                            <option value="">
                                {selectedQueueEditalId ? 'Todas as matérias do edital' : 'Escolha um edital primeiro'}
                            </option>
                            {filteredQueueSubjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>
                                    {subject.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            Status
                        </span>
                        <select
                            value={queueStatus}
                            onChange={(event) => setQueueStatus(event.target.value as QueueStatusFilter)}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="pending">Fila padrão</option>
                            <option value="no_result">Sem resultado útil</option>
                            <option value="error">Com erro</option>
                        </select>
                    </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <Button
                        onClick={handlePreviewQueue}
                        disabled={isProcessing || isPreviewing}
                        variant="outline"
                        className="w-full"
                        size="lg"
                    >
                        {isPreviewing ? (
                            <>
                                <span className="animate-spin mr-2">⚙️</span>
                                Carregando fila...
                            </>
                        ) : (
                            <>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver próximos da fila
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={handleProcessNext}
                        disabled={isProcessing || isPreviewing}
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
                </div>

                {queuePreview.length > 0 && (
                    <div className="rounded-lg border bg-sky-50/40 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                                    Próximos da fila
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    Prévia sem IA, sem busca externa e sem gravação.
                                </p>
                            </div>
                            <Badge variant="outline" className="border-sky-200 bg-white text-sky-700">
                                {queuePreview.length} item(ns)
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            {queuePreview.map((item) => (
                                <div key={item.topic_id} className="rounded-md border bg-background px-3 py-2">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                                                {item.exam_board || item.edital_name || 'Sem banca informada'}
                                            </p>
                                            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                {item.subject_name}
                                            </p>
                                            <p className="text-xs font-medium leading-snug text-foreground">
                                                {item.topic_name}
                                            </p>
                                            {item.edital_name && (
                                                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                                                    {item.edital_name}
                                                </p>
                                            )}
                                        </div>
                                        <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 px-1.5 py-0 text-[10px] font-medium text-slate-500">
                                            Não processado
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                    <div className="mt-4 overflow-hidden rounded-lg border">
                        <div className="bg-muted/40 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                        Resumo do lote
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        {(() => {
                                            const sourceBadge = getBatchSourceBadge(lastResult)
                                            const SourceIcon = sourceBadge.icon

                                            return (
                                                <span className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-1 text-[11px] font-medium ${sourceBadge.className}`}>
                                                    <SourceIcon className="mr-1 h-3 w-3" />
                                                    {sourceBadge.label}
                                                </span>
                                            )
                                        })()}
                                        <span className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-1 text-[11px] font-medium ${lastResult.status === 'error'
                                            ? 'border-red-200 bg-red-50 text-red-700'
                                            : isDeferredResult(lastResult)
                                                ? 'border-slate-200 bg-slate-50 text-slate-700'
                                                : 'border-green-200 bg-green-50 text-green-700'
                                            }`}>
                                            {lastResult.status === 'error' ? 'Com erro' : isDeferredResult(lastResult) ? 'Adiado' : 'Processado'}
                                        </span>
                                        {typeof lastResult.persistence_checked_count === 'number' && lastResult.persistence_checked_count > 0 && (
                                            <span className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-1 text-[11px] font-medium ${
                                                lastResult.persisted_count === lastResult.persistence_checked_count
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                Salvo {lastResult.persisted_count || 0}/{lastResult.persistence_checked_count}
                                            </span>
                                        )}
                                    </div>
                                    {lastResult.reasoning && !isRoutineReason(formatOperationalReason(lastResult.reasoning)) && (
                                        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                                            {formatOperationalReason(lastResult.reasoning)}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[420px]">
                                    <div className="rounded-md border bg-background px-3 py-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Itens</p>
                                        <p className="mt-1 text-lg font-semibold text-foreground">{resultCounts.total}</p>
                                    </div>
                                    <div className="rounded-md border bg-background px-3 py-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Processados</p>
                                        <p className="mt-1 text-lg font-semibold text-green-700">{resultCounts.processed}</p>
                                    </div>
                                    <div className="rounded-md border bg-background px-3 py-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sem resultado</p>
                                        <p className="mt-1 text-lg font-semibold text-orange-700">{resultCounts.noResult}</p>
                                    </div>
                                    <div className="rounded-md border bg-background px-3 py-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Erros</p>
                                        <p className="mt-1 text-lg font-semibold text-red-700">{resultCounts.errors}</p>
                                    </div>
                                    <div className="rounded-md border bg-background px-3 py-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Adiados</p>
                                        <p className="mt-1 text-lg font-semibold text-slate-700">{resultCounts.deferred}</p>
                                    </div>
                                    <div className="rounded-md border bg-background px-3 py-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Buscas</p>
                                        <p className="mt-1 text-lg font-semibold text-foreground">{lastResult.api_cost || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {lastResult.items && lastResult.items.length > 0 && (
                            <div className="border-t bg-muted/10">
                                <div className="flex items-center justify-between gap-2 px-4 py-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                        Tópicos do lote
                                    </p>
                                    <span className="text-[10px] text-muted-foreground">
                                        {lastResult.items.length} item(ns)
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[820px] table-fixed border-t text-sm">
                                        <thead className="bg-muted/70">
                                            <tr>
                                                <th className="w-[46%] px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Matéria e tópico</th>
                                                <th className="w-[18%] px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Resultado</th>
                                                <th className="w-[22%] px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Cobrança</th>
                                                <th className="w-[14%] px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Auditoria</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y bg-background">
                                            {lastResult.items.map((item) => (
                                                <tr key={item.topic_id}>
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="min-w-0 space-y-1">
                                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                                {item.subject_name}
                                                            </p>
                                                            <p className="text-[11px] font-medium leading-snug text-foreground break-words" title={item.topic_name}>
                                                                {item.topic_name}
                                                            </p>
                                                            {(item.error || item.reason || item.reasoning) && !isRoutineReason(formatOperationalReason(item.error || item.reason || item.reasoning)) && (
                                                                <p className="text-[11px] leading-relaxed text-muted-foreground" title={item.error || item.reason || item.reasoning}>
                                                                    {formatOperationalReason(item.error || item.reason || item.reasoning)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        <Badge variant="outline" className={getItemStatusClass(item.status, item.source_method, item.reasoning)}>
                                                            {getItemSourceLabel(item)}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 align-top">
                                                        {item.status === 'deferred' ? (
                                                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                                                                Não analisado hoje
                                                            </Badge>
                                                        ) : (
                                                            <div className="flex flex-col items-start gap-1">
                                                                <Badge variant="outline" className={getCoverageClass(getCoverageLabel(item))}>
                                                                    {getCoverageLabel(item)}
                                                                </Badge>
                                                                {item.volume > 0 && (
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        Busca encontrou {item.volume.toLocaleString('pt-BR')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 align-top text-center">
                                                        <span className="inline-flex whitespace-nowrap rounded border px-2 py-1 text-[10px] text-muted-foreground">
                                                            {item.api_calls || 0} buscas
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
