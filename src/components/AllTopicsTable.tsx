import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'react-toastify'
import { getSupabaseClient } from '@/services/gutCalculator'
import { CheckCircle2, XCircle, Clock, Database } from 'lucide-react'

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
}

export function AllTopicsTable({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
    const [topics, setTopics] = useState<TopicRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10) // Padrão 10
    const [stats, setStats] = useState({ users: 0, subjects: 0, topics: 0 })

    useEffect(() => {
        loadTopics()
    }, [currentPage, itemsPerPage, refreshTrigger])

    const loadTopics = async () => {
        const supabase = getSupabaseClient()
        if (!supabase) {
            setError('Supabase não configurado')
            setLoading(false)
            return
        }

        setLoading(true)

        try {
            // V32: SELECT DIRETO COM NOVOS NOMES DE COLUNA
            const { data, error: selectError, count } = await supabase
                .from('topics')
                .select(`
                    id,
                    name,
                    subject_id,
                    subjects (id, name),
                    last_trend_check_at,
                    is_skipped,
                    skip_reason,
                    created_at,
                    total_volume,
                    last_search_context,
                    last_used_query,
                    last_audit_log,
                    status
                `, { count: 'exact' })
                .order('last_trend_check_at', { ascending: true })
                .order('created_at', { ascending: false })
                .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)

            console.log('🔍 DEBUG AllTopicsTable V36:')
            console.log('Range:', startRange - 1, endRange - 1)
            console.log('Count:', count)
            console.log('Data Length:', data?.length)
            console.log('Select Error:', selectError)

            if (data?.length === 0 && count && count > 0) {
                console.warn('⚠️ ALERTA: Count > 0 mas Data vazio! Verifique RLS ou Range.')
            }

            if (selectError) throw selectError

            // BUSCAR ESTATÍSTICAS EXTRAS (Opcional, mantido para header)
            const [usersResp, subjectsResp] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }),
                supabase.from('subjects').select('id', { count: 'exact', head: true })
            ])

            setStats({
                users: usersResp.count || 0,
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
                status: row.status // Novo campo
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
                            Todos os Tópicos do Sistema
                        </CardTitle>
                        <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-xs">
                                👥 {stats.users} Usuários
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                📚 {stats.subjects} Matérias
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                📝 {stats.topics} Tópicos
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                                    <th className="px-4 py-3 text-left font-medium w-[20%]">Status & Volume</th>
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
                                                    {topic.total_volume > 0 ? (
                                                        <Badge variant="secondary" className="font-mono font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                                            {topic.total_volume.toLocaleString()}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground">Vol. 0</Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {topic.status === 'processed' || topic.status === 'success' ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                            Processado
                                                        </span>
                                                    ) : topic.is_skipped || topic.status === 'skipped' ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                                            Pulado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                            {topic.status || 'Pendente'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Check: {formatDate(topic.last_trend_check_at).split(' ')[0]}
                                                </span>
                                            </div>
                                        </td>

                                        {/* COLUNA 4: Ações / Audit */}
                                        <td className="px-4 py-4 align-middle text-center">
                                            {topic.last_audit_log ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                    title="Ver Logs de Auditoria (Console)"
                                                    onClick={() => {
                                                        console.log("📄 DATA AUDIT LOG:", topic.last_audit_log)
                                                        toast.info("Audit Log enviado para o Console (F12)")
                                                    }}
                                                >
                                                    <Database className="w-4 h-4 opacity-70" />
                                                </Button>
                                            ) : (
                                                <span className="text-slate-200 text-xs">-</span>
                                            )}
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
