import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'react-toastify'
import { getSupabaseClient } from '@/services/gutCalculator'
import { Bot, Clock, Database, Filter, Loader2, Play, Sparkles, XCircle } from 'lucide-react'
import { toastGate } from '@/lib/errors/toastGate'

export type TopicIncidenceFilter = 'all' | 'pending' | 'with-volume' | 'without-volume' | 'catalog' | 'ai' | 'skipped' | 'error' | 'zero-volume'

interface TopicRow {
    id: string
    name: string
    subject_name: string
    last_trend_check_at: string | null
    is_skipped: boolean
    skip_reason: string | null
    created_at: string
    user_email?: string
    total_volume: number
    last_search_context: string | null
    last_used_query?: string | null
    last_audit_log?: any | null
    status?: string | null
    incidence_source?: 'ai' | 'catalog' | 'manual' | null
    incidence_context?: {
        normalized_score?: number
        score_label?: string
        score_basis_count?: number
        score_confidence?: string
        rank_percentile?: number | null
    } | null
    incidence_applied_at?: string | null
}

const isAnalyzed = (topic: TopicRow) =>
    Boolean(topic.last_trend_check_at) || ['processed', 'success', 'no_volume', 'skipped', 'catalog_applied', 'error'].includes(String(topic.status || ''))

const getVolumeBadge = (topic: TopicRow) => {
    if (!isAnalyzed(topic)) {
        return (
            <Badge variant="outline" className="border-slate-200 text-slate-500">
                Não analisado
            </Badge>
        )
    }

    if (topic.total_volume > 0) {
        return (
            <Badge variant="secondary" className="font-mono font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                Sinal {topic.total_volume.toLocaleString('pt-BR')}
            </Badge>
        )
    }

    return (
        <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
            Sinal 0
        </Badge>
    )
}

const filterOptions: Array<{ value: TopicIncidenceFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Aguardando' },
    { value: 'with-volume', label: 'Com sinal' },
    { value: 'without-volume', label: 'Sem sinal' },
    { value: 'catalog', label: 'Catálogo' },
    { value: 'ai', label: 'IA' },
    { value: 'skipped', label: 'Pulados' },
    { value: 'error', label: 'Erro' },
    { value: 'zero-volume', label: 'Volume zero' },
]

const logCopyableJson = (label: string, value: unknown) => {
    console.log(label, value)
    console.log(`${label} JSON:\n${JSON.stringify(value, null, 2)}`)
}

const getSourceBadge = (topic: TopicRow) => {
    if (topic.incidence_source === 'catalog') {
        return (
            <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
                <Sparkles className="mr-1 h-3 w-3" />
                Catálogo
            </Badge>
        )
    }

    if (topic.incidence_source === 'ai' || topic.status === 'processed' || topic.status === 'success') {
        return (
            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                <Bot className="mr-1 h-3 w-3" />
                IA
            </Badge>
        )
    }

    return (
        <Badge variant="outline" className="text-muted-foreground">
            Sem origem
        </Badge>
    )
}

export function AllTopicsTable({
    refreshTrigger = 0,
    filter = 'all',
    onFilterChange,
    onTopicProcessed,
}: {
    refreshTrigger?: number
    filter?: TopicIncidenceFilter
    onFilterChange?: (filter: TopicIncidenceFilter) => void
    onTopicProcessed?: (result: any) => void
}) {
    const [topics, setTopics] = useState<TopicRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10) // Padrão 10
    const [stats, setStats] = useState({ users: 0, subjects: 0, topics: 0 })
    const [processingTopicId, setProcessingTopicId] = useState<string | null>(null)

    useEffect(() => {
        loadTopics()
    }, [currentPage, itemsPerPage, refreshTrigger, filter])

    const processTopicNow = async (topic: TopicRow) => {
        const supabase = getSupabaseClient()
        if (!supabase) {
            toastGate.notifyError('Supabase não configurado', 'ALL-TOPICS-PROCESS-01', { severity: 'medium' })
            return
        }

        setProcessingTopicId(topic.id)

        try {
            const { data, error: invokeError } = await supabase.functions.invoke('process-topic-incidence', {
                body: {
                    topicId: topic.id,
                    limit: 1,
                },
            })

            if (invokeError) throw invokeError

            const result = data?.results?.[0]
            logCopyableJson('✅ Processamento individual completo', data)
            onTopicProcessed?.(data)

            if (!result) {
                toast.info(data?.message || 'Nenhum resultado retornado para este tópico.')
            } else if (result.status === 'error') {
                toastGate.notifyError(`Erro ao processar: ${result.reason || 'falha desconhecida'}`, 'ALL-TOPICS-PROCESS-02', { severity: 'medium' })
            } else if (result.status === 'zero') {
                toast.warn(`Processado, mas sem sinal: ${topic.name}`)
            } else {
                toast.success(`Tópico processado: sinal ${Number(result.volume || 0).toLocaleString('pt-BR')}`)
            }

            await loadTopics()
        } catch (err) {
            console.error('Erro ao processar tópico específico:', err)
            toastGate.notifyError(err instanceof Error ? err.message : 'Erro ao processar tópico', 'ALL-TOPICS-PROCESS-03', { severity: 'medium' })
        } finally {
            setProcessingTopicId(null)
        }
    }

    const loadTopics = async () => {
        const supabase = getSupabaseClient()
        if (!supabase) {
            setError('Supabase não configurado')
            setLoading(false)
            return
        }

        setLoading(true)

        try {
            const { data: userData, error: userError } = await supabase.auth.getUser()
            if (userError) throw userError
            const userId = userData.user?.id
            if (!userId) throw new Error('Usuário não autenticado.')

            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            let query = (supabase as any)
                .from('topics')
                .select(`
                    id,
                    name,
                    subject_id,
                    subjects!inner (id, name, user_id),
                    last_trend_check_at,
                    is_skipped,
                    skip_reason,
                    created_at,
                    total_volume,
                    last_search_context,
                    last_used_query,
                    last_audit_log,
                    status,
                    incidence_source,
                    incidence_context,
                    incidence_applied_at
                `, { count: 'exact' })
                .eq('subjects.user_id', userId)

            if (filter === 'pending') {
                query = query
                    .neq('is_active', false)
                    .eq('is_skipped', false)
                    .or('total_volume.is.null,total_volume.eq.0')
                    .or(`last_trend_check_at.is.null,last_trend_check_at.lt.${thirtyDaysAgo},status.eq.error`)
            }

            if (filter === 'with-volume') {
                query = query.neq('is_active', false).gt('total_volume', 0)
            }

            if (filter === 'without-volume') {
                query = query.neq('is_active', false).or('total_volume.is.null,total_volume.eq.0')
            }

            if (filter === 'catalog') {
                query = query.neq('is_active', false).eq('incidence_source', 'catalog')
            }

            if (filter === 'ai') {
                query = query.neq('is_active', false).eq('incidence_source', 'ai')
            }

            if (filter === 'skipped') {
                query = query.neq('is_active', false).eq('is_skipped', true)
            }

            if (filter === 'error') {
                query = query.neq('is_active', false).eq('status', 'error')
            }

            if (filter === 'zero-volume') {
                query = query.neq('is_active', false).eq('status', 'no_volume')
            }

            const { data, error: selectError, count } = await query
                .order('last_trend_check_at', { ascending: true, nullsFirst: true })
                .order('created_at', { ascending: false })
                .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)

            if (data?.length === 0 && count && count > 0) {
                console.warn('⚠️ ALERTA: Count > 0 mas Data vazio! Verifique RLS ou Range.')
            }

            if (selectError) throw selectError

            // BUSCAR ESTATÍSTICAS EXTRAS (Opcional, mantido para header)
            const [subjectsResp] = await Promise.all([
                supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('user_id', userId)
            ])

            setStats({
                users: 1,
                subjects: subjectsResp.count || 0,
                topics: count || 0
            })

            const formattedData: TopicRow[] = (data || []).map((row: any) => ({
                id: row.id,
                name: row.name,
                subject_name: row.subjects?.name || 'Sem Matéria',
                last_trend_check_at: row.last_trend_check_at,
                is_skipped: row.is_skipped,
                skip_reason: row.skip_reason,
                created_at: row.created_at,
                // user_email removido do select direto para simplificar (precisaria de join complexo)

                total_volume: row.total_volume || 0,
                last_search_context: row.last_search_context,
                last_used_query: row.last_used_query,
                last_audit_log: row.last_audit_log,
                status: row.status,
                incidence_source: row.incidence_source,
                incidence_context: row.incidence_context || null,
                incidence_applied_at: row.incidence_applied_at,
            }))

            setTopics(formattedData)
        } catch (err) {
            console.error('Erro ao carregar tópicos (V32):', err)
            setError(err instanceof Error ? err.message : 'Erro desconhecido')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-'
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric', // Adicionado ano
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString))
    }

    const totalPages = Math.ceil(stats.topics / itemsPerPage)
    const startRange = (currentPage - 1) * itemsPerPage + 1
    const endRange = Math.min(startRange + itemsPerPage - 1, stats.topics)

    if (loading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                        <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
                        Carregando tópicos...
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center text-red-600">
                        <XCircle className="w-8 h-8 mx-auto mb-2" />
                        Erro: {error}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5" />
                            Tópicos da sua base
                        </CardTitle>
                        <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-xs">
                                Escopo: seu usuário
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                📚 {stats.subjects} Matérias
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                📝 {stats.topics} Tópicos
                            </Badge>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <select
                                value={filter}
                                onChange={(e) => {
                                    onFilterChange?.(e.target.value as TopicIncidenceFilter)
                                    setCurrentPage(1)
                                }}
                                className="border rounded px-2 py-1 text-sm bg-background"
                            >
                                {filterOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <label className="text-sm text-muted-foreground">Por página:</label>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value))
                                setCurrentPage(1)
                            }}
                            className="border rounded px-2 py-1 text-sm bg-background"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium w-[40%]">Tópico & Matéria</th>
                                    <th className="px-4 py-3 text-left font-medium w-[30%]">Detalhes da Busca</th>
                                    <th className="px-4 py-3 text-left font-medium w-[20%]">Status & Sinal</th>
                                    <th className="px-4 py-3 text-center font-medium w-[10%]">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {topics.map((topic) => (
                                    <tr key={topic.id} className="hover:bg-muted/50 transition-colors">
                                        {/* COLUNA 1: Tópico e Matéria (Expandida) */}
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium text-sm text-foreground leading-snug">
                                                    {topic.name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground bg-muted/50 truncate max-w-[200px]">
                                                        📚 {topic.subject_name}
                                                    </Badge>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Criado em {formatDate(topic.created_at).split(' ')[0]}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* COLUNA 2: Detalhes da Busca (Query + Contexto) */}
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex flex-col gap-2">
                                                {/* Query */}
                                                <div className="bg-muted/30 p-1.5 rounded border border-muted/50">
                                                    <p className="text-[11px] font-mono text-muted-foreground break-words leading-tight">
                                                        {topic.last_used_query || "Nenhuma query registrada"}
                                                    </p>
                                                </div>

                                                {/* Contexto & Motivo */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {getSourceBadge(topic)}
                                                    {topic.last_search_context && (
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${topic.last_search_context.includes("Global")
                                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                                            }`}>
                                                            🎯 {topic.last_search_context.replace("🌍 ", "")}
                                                        </span>
                                                    )}
                                                    {topic.skip_reason && (
                                                        <span className="text-[10px] text-muted-foreground italic" title={topic.skip_reason}>
                                                            "{topic.skip_reason}"
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* COLUNA 3: Status e Volume */}
                                        <td className="px-4 py-4 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    {getVolumeBadge(topic)}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {topic.status === 'processed' || topic.status === 'success' ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                            Processado
                                                        </span>
                                                    ) : topic.status === 'no_volume' ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                                            Sem sinal
                                                        </span>
                                                    ) : topic.is_skipped || topic.status === 'skipped' ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                                            Pulado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                            {isAnalyzed(topic) ? topic.status || 'Pendente' : 'Aguardando análise'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {topic.last_trend_check_at
                                                        ? `Check: ${formatDate(topic.last_trend_check_at).split(' ')[0]}`
                                                        : 'Check: ainda não analisado'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* COLUNA 4: Ações / Audit */}
                                        <td className="px-4 py-4 align-middle text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 rounded-full hover:bg-sky-50 hover:text-sky-600 transition-colors"
                                                    title="Processar este tópico agora"
                                                    onClick={() => processTopicNow(topic)}
                                                    disabled={processingTopicId === topic.id}
                                                >
                                                    {processingTopicId === topic.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Play className="w-4 h-4 opacity-80" />
                                                    )}
                                                </Button>
                                                {topic.last_audit_log ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                    title="Ver Logs de Auditoria (Console)"
                                                    onClick={() => {
                                                        logCopyableJson("📄 DATA AUDIT LOG", topic.last_audit_log)
                                                        toast.info("Audit Log completo enviado para o Console (F12)")
                                                    }}
                                                >
                                                    <Database className="w-4 h-4 opacity-70" />
                                                </Button>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PAGINAÇÃO */}
                {/* Mostra paginação se houver mais de uma página OU se tiver itens mas quiser navegar */}
                {(totalPages > 1 || stats.topics > 0) && (
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                            Mostrando {startRange} - {endRange} de {stats.topics}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                            >
                                Anterior
                            </button>
                            <span className="px-3 py-1 text-sm bg-muted/20 rounded">
                                Página {currentPage} de {Math.max(1, totalPages)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}

                {topics.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg mt-4">
                        Nenhum tópico cadastrado no sistema
                    </div>
                )}
            </CardContent>
        </Card >
    )
}
