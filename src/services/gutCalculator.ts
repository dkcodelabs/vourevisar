import md5 from 'crypto-js/md5'

/**
 * Serviço para calcular a Importância em Prova baseada no volume de questões encontrados no Google.
 * Implementa Smart Importância v16: Validação IA + Cache Global + Histórico para BI.
 */

// ============================================
// INTERFACES v16
// ============================================

interface AIAnalysisResult {
    isValid: boolean        // false se for lixo/teste
    reasoning: string       // Ex: "Aprovado: Separei 'Hardware e Redes'"
    tags: string[]          // Termos normalizados para busca
}

interface TermBreakdown {
    term: string
    volume: number
    source: 'CACHE' | 'API'
    data_source: string     // v16.5: "Google Custom Search" | "Cache (Interno)"
}

interface GutResultV16 {
    success: boolean
    reasoning: string                    // Reasoning da IA
    topicosSeparados: string[]           // Tags normalizadas
    termoMaiorRisco: string              // Termo com maior volume
    volumeMaximo: number                 // Volume do termo campeão
    notaImportancia: 1 | 2 | 3 | 4 | 5
    breakdown: TermBreakdown[]           // Detalhamento de cada termo
    api_stats: {
        cache_hits: number               // Quantos termos vieram do cache
        api_calls: number                // Quantos termos buscaram Google
        usadas_sessao: number            // Total de chamadas Google nesta sessão
        restantes: number
        cota_maxima: number
    }
    error?: string                       // Mensagem de erro (se success === false)
}

// v16.5: Interface estendida com agregação de volume
interface GutResultV16_5 extends GutResultV16 {
    total_topic_volume: number           // Soma de todos os sub-volumes
    aggregation_count: number            // Quantos sub-termos foram somados
    data_sources: {
        cache_count: number              // Quantos termos vieram do cache
        api_count: number                // Quantos termos buscaram Google
        primary_source: string           // "Cache" | "Google Custom Search"
    }
}

// Interface para logs de automação
interface ProcessedTopic {
    id: string
    timestamp: Date
    topico_original: string
    materia: string
    total_volume: number
    maior_sub_topico: string
    status: 'success' | 'rejected' | 'error'
    reasoning?: string
}

// Interface para tópico vindo do Supabase (v17 - colunas novas)
interface TopicFromDB {
    id: string
    name: string
    subject_id: string
    last_trend_check_at: string | null
    is_skipped: boolean
    skip_reason: string | null
    total_volume: number | null
    subjects?: {
        name: string
        user_id: string
    }
    last_search_context: string | null
}

// Interface do resultado do cálculo de tendência
// Interface do resultado do cálculo de tendência
interface TrendResult {
    materia: string
    topicoOriginal: string
    sub_topicos_ia: string[]
    termo_maior_risco: string
    carreira: string
    filtro_tempo: string
    volume_maximo: number
    nota_importancia: 1 | 2 | 3 | 4 | 5
    bancas_analisadas: string[]
    log_detalhado: string[]
    effective_context: string // V21: Qual contexto funcionou (IA ou Global)
    api_stats: {
        usadas_sessao: number
        restantes: number
        cota_maxima: number
    }
    audit_log: {
        total_api_calls: number
        attempts: Array<{
            query: string
            volume: number
            strategy: string
        }>
        winner_query: string
    }
}

const COTA_DIARIA_MAXIMA = 100
const STORAGE_KEY_COTA = 'gut_api_quota'
const CACHE_TTL_DAYS = 30

import { supabase } from '@/integrations/supabase/client'
import {
    applyTopicIncidenceCatalogMatch,
    findTopicIncidenceCatalogMatch,
    saveTopicIncidenceCatalogResult,
} from '@/services/topicIncidenceCatalogService'

// --- SUPABASE CLIENT (SINGLETON ADAPTER) ---
// Mantido para compatibilidade, mas agora retorna a instância única
export const getSupabaseClient = () => {
    return supabase
}

// --- CONTROLE DE COTA (LOCAL STORAGE) ---
function getCotaUsage(): { date: string; count: number } {
    if (typeof window === 'undefined') return { date: '', count: 0 }

    try {
        const stored = localStorage.getItem(STORAGE_KEY_COTA)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (e) {
        console.error('Erro ao ler cota local:', e)
    }
    return { date: '', count: 0 }
}

function incrementarCota(): number {
    if (typeof window === 'undefined') return 0

    const hoje = new Date().toISOString().split('T')[0]
    let { date, count } = getCotaUsage()

    if (date !== hoje) {
        date = hoje
        count = 0
    }

    count++
    localStorage.setItem(STORAGE_KEY_COTA, JSON.stringify({ date, count }))
    return count
}

export function getQuotaStats() {
    return {
        used: getCotaUsage().count,
        limit: COTA_DIARIA_MAXIMA,
        remaining: Math.max(0, COTA_DIARIA_MAXIMA - getCotaUsage().count)
    }
}

function checkCotaExceeded(): boolean {
    const hoje = new Date().toISOString().split('T')[0]
    const { date, count } = getCotaUsage()
    return date === hoje && count >= COTA_DIARIA_MAXIMA
}

function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

// --- HELPER: CLEAN SUBJECT NAME (V19.5) ---
function cleanSubjectName(materia: string): string {
    // 1. Converter para maiúsculas e remover acentos
    let limpo = removeAccents(materia.toUpperCase())

    // 2. Remover palavras de ruído
    const stopWords = ["NOCOES", "DE", "DA", "DO", "E", "PARA", "BASICA", "ESPECIFICA", "GERAL", "AVANCADA", "FUNDAMENTAL"]
    const regex = new RegExp(`\\b(${stopWords.join("|")})\\b`, "g")
    limpo = limpo.replace(regex, " ")

    // 3. Remover pontuação
    limpo = limpo.replace(/[.,;:-]/g, " ")

    // 4. Limpar espaços extras
    limpo = limpo.replace(/\s+/g, " ").trim()

    // 5. Fallback final: se vazio, pega a primeira palavra da matéria original
    if (!limpo) {
        return materia.split(" ")[0] || "GERAL"
    }

    return limpo
}

// --- HELPER GLOBAL: FALLBACK DE MODELOS GEMINI ---
async function runGeminiWithFallback(prompt: string): Promise<string> {
    const supabase = getSupabaseClient()

    console.log(`🤖 Solicitando IA via Edge Function (ai-handler)...`)

    const { data, error } = await supabase.functions.invoke('ai-handler', {
        body: {
            action: 'generateContent',
            prompt: prompt,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1
            }
        }
    })

    if (error) {
        console.error(`⚠️ Falha na Edge Function ai-handler:`, error)
        throw error
    }

    if (!data || !data.success) {
        throw new Error(data?.error || 'Erro desconhecido ao chamar IA no backend')
    }

    return data.text
}

// --- CÉREBRO NOVO: DIVISOR DE TÓPICOS (v12 + Smart Fallback + V20 Context) ---
async function gerarTermosBuscaIA(materia: string, topicoSujo: string): Promise<{ tags: string[], search_context: string }> {

    // --- FALLBACK MANUAL (REGEX) ---
    // Se a IA falhar totalmente (Cota/404), usamos lógica simples para não travar
    function fallbackSplitter(texto: string): { tags: string[], search_context: string } {
        console.log("⚠️ Ativando Fallback Manual (Regex)...")
        // 1. Remove termos inúteis
        const limpo = texto.replace(/\b(noções de|compreensão de|básico de|introdução a)\b/gi, "")

        // 2. Quebra por delimitadores comuns: , ; e +
        const partes = limpo.split(/,|;| e | \+ /i)

        // 3. Limpa e normaliza
        const tags = partes
            .map(p => p.trim())
            .filter(p => p.length > 2)
            .map(p => {
                if (!p.endsWith('s') && !p.endsWith('ão') && p.length > 4) return p
                return p
            })

        // Fallback do contexto: pega a primeira palavra da matéria ou "Concurso"
        const search_context = materia.split(' ')[0] || "Concurso"

        return { tags, search_context }
    }

    try {

        const prompt = `
Atue como Especialista Sênior em Concursos Públicos e SEO.
Analise:
Matéria Original: "${materia}"
Tópico: "${topicoSujo}"

TAREFAS:
1. Gere 3 a 5 TAGS de busca OTIMIZADAS PARA RETORNO DE QUESTÕES.
   - REGRA DE OURO: NÃO use palavras soltas genéricas como "Lei", "Direito", "Atos", "Poderes". Isso gera lixo.
   - PREFERÊNCIA ABSOLUTA por TERMOS COMPOSTOS TÉCNICOS.
     - Ruim: "Comunicação", "Processo"
     - Bom: "Processo de Comunicação", "Teoria da Comunicação", "Barreiras da Comunicação"
     - Ruim: "8112"
     - Bom: "Lei 8112", "Regime Jurídico Único"

2. Defina o SEARCH_CONTEXT (Contexto de Busca):
   - Deve ser o termo COMERCIAL usado em sites de questões (QConcursos, Tec, Gran).
   - Otimize para ABRANGÊNCIA:
     - Use "Português" em vez de "Língua Portuguesa" (mais resultados).
     - Use "Raciocínio Lógico" em vez de "Raciocínio Lógico Matemático".
     - Use "Informática" em vez de "Noções de Informática".
   - O contexto é crucial para filtrar a busca sem sufocá-la.

SAÍDA JSON:
{
  "isValid": boolean,
  "reasoning": string,
  "tags": string[],
  "search_context": string
}
`

        // Executa com a lógica de fallback
        let text = await runGeminiWithFallback(prompt)

        console.log("--- DEBUG RAW IA RESPONSE ---")
        console.log(text)
        console.log("-----------------------------")

        // Limpeza de segurança (caso a IA mande markdown)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim()

        try {
            const result = JSON.parse(text)

            // Suporte legado (caso IA alucine e mande array)
            if (Array.isArray(result)) {
                return {
                    tags: result.map((item: unknown) => String(item).trim()),
                    search_context: materia.split(' ')[0]
                }
            }

            if (result.isValid === false) {
                console.warn("⚠️ IA considerou tópico inválido para tags:", result.reasoning)
                return fallbackSplitter(topicoSujo)
            }

            // Garante estrutura V20
            const tags = Array.isArray(result.tags) ? result.tags.map((t: unknown) => String(t).trim()) : [topicoSujo]
            const search_context = result.search_context || materia.split(' ')[0]

            return { tags, search_context }

        } catch (jsonError) {
            console.error("ERRO JSON PARSE:", jsonError)
            throw new Error("IA retornou formato inválido (não JSON).")
        }

    } catch (e) {
        console.error("Erro Fatal na IA (Todos os modelos falharam):", e)
        throw e
    }
}

// --- BUSCA (GOOGLE CUSTOM SEARCH API) ---
async function buscarGoogle(
    query: string,
    anosPreferencia: number = 3
): Promise<{ volume: number, usadas: number, searchInformation?: unknown }> {
    // --- DEBUG CRÍTICO ---
    // --- DEBUG CRÍTICO ---
    // console.log("🕵️‍♂️ DEBUG API GOOGLE (Cleaned)");
    // ---------------------
    // ---------------------

    let usadasReq = 0
    const supabase = getSupabaseClient()

    if (checkCotaExceeded()) {
        return { volume: 0, usadas: 0 }
    }

    try {
        usadasReq += incrementarCota()
        const { data, error } = await supabase.functions.invoke('ai-handler', {
            body: {
                action: 'customSearch',
                query: query,
                anosPreferencia: anosPreferencia
            }
        })

        if (error || !data || !data.success) {
            console.error("❌ ERRO CRÍTICO API GOOGLE (via Edge Function):", error || data?.error)
            
            // Tentativa 2: Histórico (Fallback - sem dateRestrict)
            if (checkCotaExceeded()) return { volume: 0, usadas: usadasReq }

            usadasReq += incrementarCota()
            const fallbackResult = await supabase.functions.invoke('ai-handler', {
                body: {
                    action: 'customSearch',
                    query: query
                }
            })

            if (fallbackResult.error || !fallbackResult.data || !fallbackResult.data.success) {
                console.error("❌ ERRO CRÍTICO API GOOGLE (Histórico via Edge):", fallbackResult.error || fallbackResult.data?.error)
                return { volume: 0, usadas: usadasReq }
            }

            const total2 = parseInt(fallbackResult.data.data.searchInformation?.totalResults || '0', 10)
            return { volume: total2, usadas: usadasReq, searchInformation: fallbackResult.data.data.searchInformation }
        }

        const total = parseInt(data.data.searchInformation?.totalResults || '0', 10)
        if (total > 0) return { volume: total, usadas: usadasReq, searchInformation: data.data.searchInformation }

        // Histórico se zero
        if (checkCotaExceeded()) return { volume: 0, usadas: usadasReq }
        
        usadasReq += incrementarCota()
        const resp2 = await supabase.functions.invoke('ai-handler', {
            body: {
                action: 'customSearch',
                query: query
            }
        })

        if (resp2.error || !resp2.data || !resp2.data.success) {
            return { volume: 0, usadas: usadasReq }
        }

        const total2 = parseInt(resp2.data.data.searchInformation?.totalResults || '0', 10)
        return { volume: total2, usadas: usadasReq, searchInformation: resp2.data.data.searchInformation }

    } catch (error) {
        console.error("❌ ERRO DE REDE/FETCH EDGE FUNCTION:", error)
        return { volume: 0, usadas: usadasReq }
    }
}

// --- FUNÇÃO PRINCIPAL (ORQUESTRADOR) ---
// --- FUNÇÃO PRINCIPAL (ORQUESTRADOR) ---
export async function calcularNotaImportancia(
    materia: string,
    topicoSujo: string,
    inputBanca: string,
    inputCarreira: string,
    anos: number = 3
): Promise<TrendResult> {

    // 1. IA define sub-tópicos + Contexto (V20) via Edge Function
    const iaResult = await gerarTermosBuscaIA(materia, topicoSujo)
    const subTopicosIA = iaResult.tags

    // ---------------------------------------------------------
    // V35 SAFETY NET: GARANTIA DE BUSCA PELO TÓPICO ORIGINAL
    // ---------------------------------------------------------
    // Se a IA "viajar" e atomizar demais (ex: "Processo de Comunicação" -> "Comunicação"),
    // nós forçamos a busca exata do termo original como PRIORITY 1.

    // 1. Limpeza inteligente do tópico original
    const topicoLimpo = topicoSujo
        .replace(/^(noções de|introdução [àa]|o |a |os |as )/gi, "") // Remove prefixos inúteis
        .replace(/[.,;:-]/g, " ") // Remove pontuação
        .trim()

    // 2. Injeta como PRIMEIRA tag se já não estiver na lista (case insensitivo)
    const jaExiste = subTopicosIA.some(t => t.toLowerCase() === topicoLimpo.toLowerCase())
    if (!jaExiste && topicoLimpo.length > 3) {
        console.log(`🛡️ V35 Safety Net: Injetando "${topicoLimpo}" como Top Priority.`)
        subTopicosIA.unshift(topicoLimpo)
    }
    // ---------------------------------------------------------

    // V20/V35: Otimização de Contexto
    // Se a IA retornou "Língua Portuguesa", forçamos "Português" para evitar estrangulamento
    let contextoOtimizado = iaResult.search_context || removeAccents(materia.split(' ')[0])

    if (contextoOtimizado.toLowerCase() === 'lingua portuguesa' || contextoOtimizado.toLowerCase() === 'língua portuguesa') {
        contextoOtimizado = 'Português'
    }

    const materiaOtimizada = contextoOtimizado

    console.log(`🧠 AI Context: "${iaResult.search_context}" | Usada: "${materiaOtimizada}"`)

    // 2. Definição das Bancas
    let listaBancas: string[] = ["Geral"]
    if (inputBanca && inputBanca.trim()) {
        listaBancas = inputBanca.split(',').map(b => b.trim().toUpperCase()).filter(b => b)
    }

    const sufixoCarreira = (inputCarreira && inputCarreira.trim()) ? ` ${inputCarreira.trim()}` : ""

    // Variáveis para guardar o "Campeão" (Maior Volume = Maior Risco de Importância)
    let maiorVolumeGeral = 0
    let termoCampeao = ""
    let termoCampeaoContexto = materiaOtimizada // Default: Contexto IA
    const logDetalhado: string[] = []
    let usadasSessao = 0

    // Variáveis para Audit Log V30
    const auditLog = {
        total_api_calls: 0,
        attempts: [] as unknown[],
        winner_query: ""
    }

    // 3. Loop Duplo: Para cada Banca -> Para cada Sub-tópico
    // Limite de bancas para não estourar a cota (máx 3 bancas)
    for (const banca of listaBancas.slice(0, 3)) {
        for (const subTermo of subTopicosIA) {

            // 1. PREPARAÇÃO
            // Tenta usar o contexto da IA. Se não tiver, usa a primeira palavra da matéria.
            const materiaOtimizada = iaResult.search_context || removeAccents(materia.split(' ')[0]);
            let volumeDesteTermo = 0;
             
            let strategyUsed = iaResult.search_context ? "IA Context" : "Auto Context";

            // 2. TENTATIVA 1: BUSCA PRECISA (Com Contexto + Aspas)
            let query = "";
            const qtdPalavras = subTermo.trim().split(/\s+/).length;

            // Monta query com aspas para precisão inicial
            if (qtdPalavras <= 2) {
                query = `${materiaOtimizada} "${subTermo}"`;
            } else {
                query = `${subTermo} ${materiaOtimizada}`;
            }
            if (banca !== "Geral") query += ` ${banca}`;
            query += " questão concurso";

            console.log(`🔍 Query Google (V23 Aspas): "${query}"`)
            const resultado = await buscarGoogle(query, anos);

            // ... após receber resultado ...
            if (!resultado.searchInformation) {
                console.error("⚠️ Resposta da API sem 'searchInformation'. Verifique cota.");
            }

            volumeDesteTermo = Number(resultado.volume || 0);
            usadasSessao += resultado.usadas;
            auditLog.total_api_calls += resultado.usadas;
            auditLog.attempts.push({
                query: query,
                volume: volumeDesteTermo,
                strategy: "Precisa (Context+Aspas)"
            })


            // 3. TENTATIVA 2: FALLBACK NUCLEAR (SEM ASPAS e SEM CONTEXTO)
            // Se a busca precisa deu ZERO, chutamos o balde.
            if (volumeDesteTermo === 0 && qtdPalavras > 1) {
                console.warn(`⚠️ Volume 0. Iniciando Fallback Nuclear V23 (Sem aspas)...`);

                // REMOVE ASPAS do termo para permitir fuzzy match do Google
                const termoLimpo = subTermo.replace(/["']/g, "");

                // Query apenas com o termo limpo + filtro. Sem matéria.
                const queryNuclear = `${termoLimpo} questão concurso`;

                console.log(`☢️ Query Nuclear: ${queryNuclear}`);

                // Verifica cota antes
                if (!checkCotaExceeded()) {
                    const resultadoNuclear = await buscarGoogle(queryNuclear, anos);
                    const volNuclear = Number(resultadoNuclear.volume || 0);
                    usadasSessao += resultadoNuclear.usadas;
                    auditLog.total_api_calls += resultadoNuclear.usadas;

                    auditLog.attempts.push({
                        query: queryNuclear,
                        volume: volNuclear,
                        strategy: "Nuclear Fallback"
                    })

                    if (volNuclear > 0) {
                        console.log(`✅ Fallback Nuclear recuperou ${volNuclear} resultados!`);
                        volumeDesteTermo = volNuclear;
                        strategyUsed = "🌍 Global (Broad)"; // Marca para o usuário ver

                        // Atualiza o contexto efetivo para salvar no banco se este for o campeão
                        // Apenas visual, pois o contexto effective_context final que vale é o do campeão
                    }
                }
            }

            // ACUMULAÇÃO no Log
            logDetalhado.push(`[${banca}] ${subTermo}: ${volumeDesteTermo} (${strategyUsed})`)

            // Lógica GUT: Ficamos com o MAIOR volume encontrado para definir Risco
            if (volumeDesteTermo > maiorVolumeGeral) {
                maiorVolumeGeral = volumeDesteTermo
                termoCampeao = subTermo
                // Se o Nuclear salvou, marcamos o contexto como Global
                if (strategyUsed === "🌍 Global (Broad)") {
                    termoCampeaoContexto = "🌍 Global (Broad)"
                    // Nuclear usa termo limpo, mas espera... preciso capturar a query certa
                    // A query nuclear foi definida dentro do if. Vamos simplificar: Vencedor = Query do ultimo attempt que deu certo
                    const lastAttempt = auditLog.attempts[auditLog.attempts.length - 1]
                    auditLog.winner_query = lastAttempt.query
                } else {
                    termoCampeaoContexto = materiaOtimizada
                    // Se não foi nuclear, foi a query precisa do loop atual
                    // Como estamos dentro do loop principal, a query precisa foi 'query'
                    // Mas espera, se tivermos multiplas tentativas, precisamos garantir qual foi.
                    // O log 'attempts' tem tudo. Se chegamos aqui é porque volumeDesteTermo > maiorVolumeGeral.
                    // E volumeDesteTermo veio ou da precisa ou do nuclear.
                    // Se strategyUsed == "🌍 Global (Broad)", foi nuclear.
                    // Se não, foi "Precisa".

                    if (strategyUsed !== "🌍 Global (Broad)") {
                        // Recupera a query precisa usada acima
                        const qtdPalavras = subTermo.trim().split(/\s+/).length;
                        let q = "";
                        if (qtdPalavras <= 2) {
                            q = `${materiaOtimizada} "${subTermo}"`;
                        } else {
                            q = `${subTermo} ${materiaOtimizada}`;
                        }
                        if (banca !== "Geral") q += ` ${banca}`;
                        q += " questão concurso";
                        auditLog.winner_query = q;
                    }
                }
            }
        }
    }

    // Se nenhum volume encontrado, o termo campeão é o primeiro da lista (só para exibição visual)
    if (!termoCampeao && subTopicosIA.length > 0) {
        termoCampeao = subTopicosIA[0]
    }

    // 4. Régua de Importância (Calibragem)
    let nota: 1 | 2 | 3 | 4 | 5 = 1
    const limites = [1000, 500, 200, 50] // Régua v12

    if (maiorVolumeGeral > limites[0]) nota = 5
    else if (maiorVolumeGeral > limites[1]) nota = 4
    else if (maiorVolumeGeral > limites[2]) nota = 3
    else if (maiorVolumeGeral > limites[3]) nota = 2
    else nota = 1

    return {
        materia,
        topicoOriginal: topicoSujo,
        sub_topicos_ia: subTopicosIA,
        termo_maior_risco: termoCampeao,
        carreira: inputCarreira || "Todas",
        filtro_tempo: `Auto Detect (Pref. ${anos} anos)`,
        volume_maximo: maiorVolumeGeral,
        nota_importancia: nota,
        bancas_analisadas: listaBancas,
        log_detalhado: logDetalhado,
        effective_context: termoCampeaoContexto,
        api_stats: {
            usadas_sessao: usadasSessao,
            restantes: Math.max(0, COTA_DIARIA_MAXIMA - getCotaUsage().count),
            cota_maxima: COTA_DIARIA_MAXIMA
        },
        audit_log: auditLog
    }
}

// ============================================
// FUNÇÃO DE AUTOMAÇÃO (v16.5)
// ============================================

export async function processNextPendingTopic(
    userId?: string
): Promise<unknown> {
    const supabase = getSupabaseClient()

    if (!supabase) {
        return { error: 'Supabase não configurado' }
    }

    try {
        // PEGAR usuário logado
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { error: 'Usuário não autenticado' }
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        // Query com type assertion final para evitar "Type instantiation is excessively deep"
        // diretiva removida pois não é mais necessária
        const queryResult = await supabase
            .from('topics')
            .select(`
                id,
                name,
                subject_id,
                last_trend_check_at,
                is_skipped,
                subjects(name, user_id)
            `)
            .eq('is_skipped', false)
            .neq('is_active', false) // Ignora tópicos deletados logicamente (Soft Delete)
            .or(`last_trend_check_at.is.null,last_trend_check_at.lt.${thirtyDaysAgo}`)
            .order('last_trend_check_at', { ascending: true, nullsFirst: true })
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        const { data: topic, error: queryError } = queryResult as { data: TopicFromDB | null, error: unknown }

        if (queryError) {
            console.error('❌ Erro ao buscar tópico pendente:', queryError)
            return { error: `Erro no banco: ${queryError.message}` }
        }

        if (!topic) {
            console.warn('⚠️ Nenhum tópico pendente encontrado')
            return { error: 'Nenhum tópico pendente encontrado' }
        }

        // Tipagem segura com a interface TopicFromDB
        const topicData: TopicFromDB = topic

        const subjectName = topicData.subjects?.name || 'Geral'
        console.log(`📝 Tópico real selecionado: "${topicData.name}" (${subjectName})`)

        const catalogMatch = await findTopicIncidenceCatalogMatch({
            topicName: topicData.name,
            subjectName,
        })

        if (catalogMatch) {
            await applyTopicIncidenceCatalogMatch(topicData.id, catalogMatch)
            console.log(`♻️ Volume reaproveitado do catálogo para "${topicData.name}": ${catalogMatch.total_volume}`)

            return {
                success: true,
                id: topicData.id,
                materia: subjectName,
                topico_original: topicData.name,
                total_volume: catalogMatch.total_volume,
                maior_sub_topico: catalogMatch.winner_query || 'Catálogo',
                status: 'success',
                reasoning: 'Volume reaproveitado do catálogo',
                effective_context: catalogMatch.search_context || 'Catálogo',
                last_used_query: catalogMatch.winner_query || null,
                audit_log: catalogMatch.audit_log || {},
                api_cost: 0,
                from_catalog: true
            }
        }

        // 🎯 VERIFICAR SE JÁ FOI PROCESSADO RECENTEMENTE
        if (topicData.last_trend_check_at) {
            const lastCheck = new Date(topicData.last_trend_check_at)
            const now = new Date()
            const diffInMs = now.getTime() - lastCheck.getTime()
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

            // Se foi processado há menos de 7 dias, pular
            if (diffInDays < 7) {
                console.log(`⏭️ Tópico "${topic.name}" já processado há ${Math.floor(diffInDays)} dias, pulando...`)
                return {
                    error: 'Tópico já processado recentemente',
                    topic_id: topic.id,
                    topic_name: topic.name,
                    days_since_last_check: diffInDays
                }
            }
        }

        // 🛡️ VALIDAÇÃO IA - ANTES DE PROCESSAR
        const validationPrompt = `
        Atue como Auditor de Qualidade de Dados para Concursos Públicos.
        Analise a Matéria: "${subjectName}" e o Tópico: "${topic.name}"

        Sua missão é classificar se o texto do tópico é válido para busca de tendências.

        CRITÉRIOS DE INVALIDADE (REJEITAR):
        1. Letras/Números soltos (ex: "a", "1", "1.2").
        2. Placeholders evidentes de teste (ex: "teste", "asd", "xxx").
        3. Texto sem sentido ou muito vago.

        CRITÉRIOS DE VALIDADE (ACEITAR):
        1. Nomes de leis, teorias, conceitos (ex: "Direito Administrativo", "Crase").
        2. Siglas conhecidas (ex: "CPC", "CLT").
        3. Testes explícitos como "BUG_TEST" podem ser aceitos APENAS SE você achar que é um teste de sistema vital, mas idealmente rejeite se for lixo. (Neste caso, BUG_TEST soa como placeholder, então REJEITE).

        VERIFICAÇÃO EXTRA:
        - O tópico contém múltiplos assuntos? (ex: "Crase e Pontuação", "Atos e Poderes").

        SAÍDA OBRIGATÓRIA (JSON PURO):
        {
            "valido": boolean,
            "motivo": "string curta explicativa",
            "multiplos_assuntos": boolean
        }
        `


        try {
            const validationText = await runGeminiWithFallback(validationPrompt)

            // Limpeza robusta do JSON
            const cleanJson = validationText.replace(/```json/g, '').replace(/```/g, '').trim()
            const validation = JSON.parse(cleanJson)

            if (!validation.valido) {
                console.warn(`🚫 Rejeitado ANTES de processar: ${validation.motivo} `)

                // Update usando interface TopicUpdatePayload
                await supabase
                    .from('topics')
                    .update({
                        is_skipped: true,
                        skip_reason: validation.motivo,
                        last_trend_check_at: new Date().toISOString(),
                        status: 'skipped'
                    } as unknown) // Workaround: tipos Supabase desatualizados
                    .eq('id', topicData.id)

                console.log(`✅ Tópico "${topicData.name}" marcado como skipped`)
                return {
                    error: `Tópico rejeitado: ${validation.motivo} `,
                    rejected: true,
                    // Dados para display no frontend mesmo com erro
                    id: topicData.id,
                    materia: subjectName,
                    topicoOriginal: topicData.name, // Padronizado para o frontend
                    topico_original: topicData.name, // Legado
                    total_volume: 0,
                    maior_sub_topico: validation.motivo,
                    status: 'rejected',
                    reasoning: validation.motivo,
                    api_cost: 0
                }
            }

            if (validation.multiplos_assuntos) {
                console.warn(`⚠️ Tópico com múltiplos assuntos detectado: "${topicData.name}"`)
            }

            console.log(`✅ Tópico "${topicData.name}" aprovado pela IA`)
        } catch (validationError) {
            console.warn('⚠️ Validação IA falhou, continuando processamento:', validationError)
        }

        const result = await calcularNotaImportancia(
            subjectName,
            topicData.name,
            '',
            '',
            3
        )

        // Lógica de Status/Motivo baseada no Volume (V19.5 - Final)
        let skipReason = 'Processado com Sucesso'
        let isSkipped = false

        if (result.volume_maximo === 0) {
            skipReason = 'Volume 0 (Tentativa original e limpa falharam)'
            isSkipped = true // V19.5: Marca como skipped para alerta amarelo e não poluir lista principal de sucessos
        }

        // V31: ESTRUTURA OBRIGATÓRIA DE AUDIT E UPDATE
        const auditLog = result.audit_log || {
            total_api_calls: result.api_stats?.usadas_sessao || 0,
            winner_query: result.audit_log?.winner_query || "N/A",
            attempts: []
        }

        const catalogId = await saveTopicIncidenceCatalogResult({
            userId: user.id,
            topicName: topicData.name,
            subjectName,
            totalVolume: result.volume_maximo,
            importanceScore: result.nota_importancia,
            searchContext: result.effective_context,
            winnerQuery: auditLog.winner_query,
            auditLog,
            metadata: {
                sub_topics: result.sub_topicos_ia,
                term_winner: result.termo_maior_risco,
                banks: result.bancas_analisadas,
                filter_time: result.filtro_tempo,
            },
        })

        const { error: updateError } = await supabase
            .from('topics')
            .update({
                last_trend_check_at: new Date().toISOString(), // Revertido
                total_volume: result.volume_maximo,            // Revertido
                skip_reason: skipReason,
                status: isSkipped ? 'skipped' : 'processed',
                is_skipped: isSkipped,
                last_search_context: result.effective_context,
                last_used_query: auditLog.winner_query,
                last_audit_log: auditLog,
                incidence_catalog_id: catalogId,
                incidence_source: 'ai',
                incidence_applied_at: new Date().toISOString(),
                incidence_context: {
                    catalog_id: catalogId,
                    search_context: result.effective_context,
                    winner_query: auditLog.winner_query,
                    source: 'ai',
                }
            } as unknown)
            .eq('id', topicData.id)

        if (updateError) {
            console.warn('⚠️ Não foi possível atualizar timestamp:', updateError)
        } else {
            console.log(`✅ Tópico "${topicData.name}" salvo com sucesso! Vol: ${result.volume_maximo} | Status: ${isSkipped ? 'skipped' : 'processed'}`)
        }

        // RETORNO PADRONIZADO PARA O FRONTEND (Evita undefined)
        return {
            success: true,
            id: topicData.id,
            materia: subjectName,
            topico_original: topicData.name,
            total_volume: result.volume_maximo, // GARANTIDO
            maior_sub_topico: result.termo_maior_risco,
            status: isSkipped ? 'warning' : 'success',
            reasoning: skipReason,
            effective_context: result.effective_context,
            last_used_query: auditLog.winner_query, // Passando para o front
            audit_log: auditLog,                    // Passando para o front
            api_cost: auditLog.total_api_calls || result.api_stats?.usadas_sessao // Atalho
        }
    } catch (error) {
        console.error('❌ Erro crítico ao processar tópico:', error)

        // 🛡️ SE FOI REJEITADO PELA IA, MARCAR COMO SKIPPED NO BANCO
        const errorMessage = error instanceof Error ? error.message : String(error)

        if (errorMessage.includes('Tópico inválido')) {
            try {
                // Buscar o tópico novamente para pegar o ID
                const { data: rejectedTopic } = await supabase
                    .from('topics')
                    .select('id, name')
                    .eq('is_skipped', false as unknown)
                    .or(`last_trend_check_at.is.null, last_trend_check_at.lt.${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()} `)
                    .order('last_trend_check_at', { ascending: true, nullsFirst: true })
                    .limit(1)
                    .single() as { data: { id: string, name: string } | null, error: unknown }

                if (rejectedTopic) {
                    await supabase
                        .from('topics')
                        .update({
                            is_skipped: true,
                            skip_reason: errorMessage,
                            last_trend_check_at: new Date().toISOString()
                        } as unknown) // Workaround: tipos Supabase desatualizados
                        .eq('id', rejectedTopic.id)

                    console.log(`🚫 Tópico "${rejectedTopic.name}" marcado como SKIPPED permanentemente`)
                }
            } catch (skipError) {
                console.error('Erro ao marcar tópico como skipped:', skipError)
            }
        }

        throw error
    }
}
