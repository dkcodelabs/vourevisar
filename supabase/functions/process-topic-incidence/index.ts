import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import md5 from 'https://esm.sh/crypto-js@4.2.0/md5';
import { getIncidenceLevelFromScore, type TopicIncidenceLevel } from './incidenceScore.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-worker-secret',
};

const WORKER_VERSION = '2026-06-08-two-year-search-window';
const MAX_TERMS_PER_TOPIC = 3;
const MAX_GOOGLE_CALLS_PER_TOPIC = 3;
const STRONG_SIGNAL_THRESHOLD = 1000;
const DEFAULT_DAILY_GOOGLE_CALL_LIMIT = 100;
const DEFAULT_YEARS_WINDOW = 2;
const DAILY_SEARCH_LIMIT_LABEL = 'Limite diario de buscas atingido';

type TopicRow = {
  id: string;
  name: string;
  subject_id?: string;
  subjects?: {
    id: string;
    name: string;
    user_id?: string;
    edital_id?: string | null;
    user_editais?: {
      id: string;
      name: string;
      exam_board: string | null;
      organ: string | null;
      position: string | null;
      year: string | null;
      created_at: string;
    } | null;
  } | Array<{
    id: string;
    name: string;
    user_id?: string;
    edital_id?: string | null;
    user_editais?: {
      id: string;
      name: string;
      exam_board: string | null;
      organ: string | null;
      position: string | null;
      year: string | null;
      created_at: string;
    } | null;
  }> | null;
};

type CatalogMatch = {
  id: string;
  total_volume: number;
  importance_score: number | null;
  search_context: string | null;
  winner_query: string | null;
  audit_log: unknown;
};

type AnalysisContext = {
  editalId: string | null;
  editalName: string | null;
  examBoard: string | null;
  examBoardKey: string | null;
  organization: string | null;
  organizationKey: string | null;
  career: string | null;
  careerKey: string | null;
  year: string | null;
};

type IncidenceScoreMetadata = {
  raw_volume: number;
  normalized_score: number;
  incidence_level: TopicIncidenceLevel;
  rank_percentile: number | null;
  score_label: string;
  score_scope: string;
  score_basis_count: number;
  score_confidence: 'low_sample' | 'cohort';
  score_updated_at: string;
};

type PaidUserCandidate = {
  user_id: string;
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
  created_at?: string | null;
  first_cycle_snapshot_at?: string | null;
};

const updateTopicOrThrow = async (
  supabase: ReturnType<typeof createClient>,
  topicId: string,
  values: Record<string, unknown>,
) => {
  const { error } = await supabase
    .from('topics')
    .update(values)
    .eq('id', topicId)
    .select('id')
    .single();

  if (error) {
    throw error;
  }
};

const getDailyGoogleUsage = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await (supabase as any)
    .from('topics')
    .select('last_audit_log,incidence_source,incidence_applied_at,subjects!inner(user_id)')
    .eq('subjects.user_id', userId)
    .eq('incidence_source', 'ai')
    .gte('incidence_applied_at', today.toISOString());

  if (error) throw error;

  return (data || []).reduce((total: number, row: any) => {
    return total + Number(row.last_audit_log?.total_api_calls || 0);
  }, 0);
};

const removeAccents = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeText = (value?: string | null) =>
  removeAccents(String(value || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(nocoes|nocao|de|da|do|das|dos|e|para|em|no|na|nos|nas)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sanitizeTopicForSearch = (value: string) =>
  value
    .replace(/^\s*\d+(\.\d+)*\s*[-.)]?\s*/g, '')
    .replace(/^(noções de|introdução [àa]|o |a |os |as )/i, '')
    .replace(/\betc\.?\b/gi, ' ')
    .replace(/[()[\]{}.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const contextHash = (subjectName: string, topicName: string, context?: AnalysisContext | null) =>
  md5([
    normalizeText(subjectName),
    normalizeText(topicName),
    context?.examBoardKey || '',
    '',
    '',
  ].join('|')).toString();

const callAiHandler = async (
  _supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
  authToken?: string | null,
) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const workerSecret = Deno.env.get('INCIDENCE_WORKER_SECRET');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase env ausente para chamar ai-handler');
  }

  if (!authToken && !workerSecret) {
    throw new Error('JWT do usuário ou segredo interno ausente para chamar ai-handler');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-handler`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken || serviceRoleKey}`,
      apikey: serviceRoleKey,
      ...(workerSecret && !authToken ? { 'x-worker-secret': workerSecret } : {}),
    },
    body: JSON.stringify(body),
  });
  const responseText = await response.text();
  let data: any = null;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = null;
  }

  if (!response.ok || !data?.success) {
    throw new Error(`ai-handler ${response.status}: ${data?.error || responseText || 'Falha ao chamar ai-handler'}`);
  }

  if (body.action === 'customSearch' && data.data?.error) {
    throw new Error(`Google Search: ${data.data.error.message || JSON.stringify(data.data.error)}`);
  }

  return data;
};

const getTopicSubjectName = (topic: TopicRow) => {
  if (Array.isArray(topic.subjects)) {
    return topic.subjects[0]?.name || 'Geral';
  }

  return topic.subjects?.name || 'Geral';
};

const getTopicSubject = (topic: TopicRow) => {
  if (Array.isArray(topic.subjects)) {
    return topic.subjects[0] || null;
  }

  return topic.subjects || null;
};

const getAnalysisContext = (topic: TopicRow): AnalysisContext => {
  const subject = getTopicSubject(topic);
  const edital = subject?.user_editais || null;

  return {
    editalId: edital?.id || subject?.edital_id || null,
    editalName: edital?.name || null,
    examBoard: edital?.exam_board || null,
    examBoardKey: normalizeText(edital?.exam_board || ''),
    organization: edital?.organ || null,
    organizationKey: normalizeText(edital?.organ || ''),
    career: edital?.position || null,
    careerKey: normalizeText(edital?.position || ''),
    year: edital?.year || null,
  };
};

const getContextPromptLines = (context?: AnalysisContext | null) => {
  const lines = [];

  if (context?.examBoard) lines.push(`Banca: "${context.examBoard}"`);
  if (context?.organization) lines.push(`Orgao/Instituicao: "${context.organization}"`);
  if (context?.career) lines.push(`Cargo/Carreira: "${context.career}"`);
  if (context?.editalName) lines.push(`Edital: "${context.editalName}"`);
  if (context?.year) lines.push(`Ano do edital: "${context.year}"`);

  return lines.join('\n');
};

const buildQueryCandidates = (
  tag: string,
  subjectName: string,
  searchContext: string,
  context?: AnalysisContext | null,
) => {
  const cleanedTag = sanitizeTopicForSearch(tag.replace(/["']/g, ''));
  const subject = subjectName.trim();
  const board = context?.examBoard?.trim();
  const organization = context?.organization?.trim();
  const career = context?.career?.trim();
  const baseContext = searchContext.trim();
  const candidates = new Set<string>();

  if (board) {
    candidates.add(`${cleanedTag} ${subject} "${board}" questão concurso`);
    candidates.add(`${cleanedTag} "${board}" questão concurso`);
    candidates.add(`${cleanedTag} ${subject} "${board}" prova concurso`);
    if (organization) candidates.add(`${cleanedTag} ${subject} "${board}" "${organization}" questão concurso`);
    if (career) candidates.add(`${cleanedTag} ${subject} "${board}" "${career}" questão concurso`);
    candidates.add(`"${cleanedTag}" "${subject}" "${board}" questão concurso`);
  }

  candidates.add(`${cleanedTag} ${baseContext || subject} questão concurso`);
  candidates.add(`${cleanedTag} ${subject} questão concurso`);

  return [...candidates].filter(Boolean);
};

const hasPaidSubscription = async (supabase: ReturnType<typeof createClient>, userId: string) => {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('plan,status,subscription_ends_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .neq('plan', 'free_trial')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return false;

  return !data.subscription_ends_at || new Date(data.subscription_ends_at).getTime() > Date.now();
};

const getCandidateDateValue = (value?: string | null) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
};

const sortPaidUserCandidates = (candidates: PaidUserCandidate[]) => {
  return [...candidates].sort((a, b) => {
    const aHasClosedCycle = Boolean(a.first_cycle_snapshot_at);
    const bHasClosedCycle = Boolean(b.first_cycle_snapshot_at);

    if (aHasClosedCycle !== bHasClosedCycle) {
      return aHasClosedCycle ? -1 : 1;
    }

    const aPriorityDate = a.first_cycle_snapshot_at || a.subscription_started_at || a.created_at;
    const bPriorityDate = b.first_cycle_snapshot_at || b.subscription_started_at || b.created_at;
    return getCandidateDateValue(aPriorityDate) - getCandidateDateValue(bPriorityDate);
  });
};

const hasCurrentPaidEntitlement = (candidate: PaidUserCandidate) => {
  return !candidate.subscription_ends_at || getCandidateDateValue(candidate.subscription_ends_at) > Date.now();
};

const attachCycleSnapshotPriority = async (
  supabase: ReturnType<typeof createClient>,
  candidates: PaidUserCandidate[],
) => {
  const userIds = candidates.map(candidate => candidate.user_id).filter(Boolean);
  if (userIds.length === 0) return candidates;

  const { data, error } = await (supabase as any)
    .from('cycle_rotation_snapshots')
    .select('user_id,created_at,completed_at')
    .in('user_id', userIds)
    .order('completed_at', { ascending: true });

  if (error) {
    console.warn('Prioridade por ciclo fechado indisponível; usando ordem da assinatura:', error);
    return candidates;
  }

  const firstSnapshotByUser = new Map<string, string>();
  for (const snapshot of data || []) {
    if (!snapshot.user_id || firstSnapshotByUser.has(snapshot.user_id)) continue;
    firstSnapshotByUser.set(snapshot.user_id, snapshot.completed_at || snapshot.created_at);
  }

  return candidates.map(candidate => ({
    ...candidate,
    first_cycle_snapshot_at: firstSnapshotByUser.get(candidate.user_id) || null,
  }));
};

const generateSearchTerms = async (
  supabase: ReturnType<typeof createClient>,
  subjectName: string,
  topicName: string,
  context?: AnalysisContext | null,
  authToken?: string | null,
) => {
  const contextLines = getContextPromptLines(context);
  const searchableTopicName = sanitizeTopicForSearch(topicName) || topicName;
  const prompt = `
Atue como especialista em concursos publicos e busca de questoes.

Materia: "${subjectName}"
Topico: "${searchableTopicName}"
${contextLines ? `\nContexto do edital:\n${contextLines}` : ''}

Gere ate 3 termos compostos para busca de questoes considerando a banca quando informada.
Nao use palavras soltas genericas.
Tambem gere um search_context curto, como Portugues, Informatica, Direito Administrativo.

Responda somente JSON:
{
  "isValid": boolean,
  "reasoning": "string",
  "tags": ["string"],
  "search_context": "string"
}
`;

  try {
    const data = await callAiHandler(supabase, {
      action: 'generateContent',
      prompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }, authToken);

    const text = String(data.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
      : [];

    if (parsed.isValid === false || tags.length === 0) {
      return {
        tags: [topicName],
        searchContext: subjectName.split(' ')[0] || 'Concurso',
        reasoning: parsed.reasoning || 'Fallback de termos',
      };
    }

    return {
      tags,
      searchContext: String(parsed.search_context || subjectName.split(' ')[0] || 'Concurso'),
      reasoning: String(parsed.reasoning || ''),
    };
  } catch (error) {
    const contextText = context?.examBoard
      ? `${subjectName} ${context.examBoard}`
      : subjectName;
    const cleanTopic = sanitizeTopicForSearch(topicName);

    return {
      tags: Array.from(new Set([cleanTopic, topicName].filter(term => term && term.length > 2))),
      searchContext: contextText || subjectName.split(' ')[0] || 'Concurso',
      reasoning: `Fallback sem Gemini: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

const validateTopicForIncidence = async (
  supabase: ReturnType<typeof createClient>,
  subjectName: string,
  topicName: string,
  authToken?: string | null,
) => {
  const compactTopic = normalizeText(topicName);

  if (!compactTopic || compactTopic.length <= 2) {
    return {
      valid: false,
      reason: 'Tópico curto demais para análise.',
    };
  }

  if (/^(teste|test|asd|xxx|bug_test|\d+|[a-z])$/i.test(compactTopic)) {
    return {
      valid: false,
      reason: 'Tópico parece placeholder, teste ou código isolado.',
    };
  }

  const prompt = `
Atue como auditor de qualidade de dados para concursos publicos.

Materia: "${subjectName}"
Topico: "${topicName}"

Classifique se o topico e valido para busca de incidencia/cobranca.

REJEITE apenas quando:
- for letra, numero ou codigo solto;
- for placeholder/teste/lixo;
- for texto sem sentido ou vago demais;
- nao representar assunto estudavel de concurso.

ACEITE quando:
- for conceito, lei, teoria, tecnica, tema de edital ou sigla conhecida;
- for topico longo com varios assuntos reais;
- for especifico, mesmo que possa retornar pouco volume.

Responda somente JSON:
{
  "valido": boolean,
  "motivo": "string curta"
}
`;

  try {
    const data = await callAiHandler(supabase, {
      action: 'generateContent',
      prompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0,
      },
    }, authToken);

    const text = String(data.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);

    return {
      valid: parsed.valido !== false,
      reason: String(parsed.motivo || ''),
    };
  } catch (error) {
    return {
      valid: true,
      reason: `Validação indisponível; processamento mantido. ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

const searchGoogleVolume = async (
  supabase: ReturnType<typeof createClient>,
  query: string,
  anosPreferencia = DEFAULT_YEARS_WINDOW,
  authToken?: string | null,
) => {
  const data = await callAiHandler(supabase, {
    action: 'customSearch',
    query,
    anosPreferencia,
  }, authToken);

  return Number.parseInt(data.data?.searchInformation?.totalResults || '0', 10) || 0;
};

const findCatalogMatch = async (
  supabase: ReturnType<typeof createClient>,
  topicKey: string,
  subjectKey: string,
  context: AnalysisContext,
) => {
  const baseSelect = 'id,total_volume,importance_score,search_context,winner_query,audit_log';
  const makeBaseQuery = () => (supabase as any)
    .from('topic_incidence_catalog')
    .select(baseSelect)
    .eq('topic_key', topicKey)
    .eq('subject_key', subjectKey)
    .in('confidence_status', ['auto', 'approved'])
    .order('last_analyzed_at', { ascending: false });

  if (context.examBoardKey) {
    const { data, error } = await makeBaseQuery()
      .eq('exam_board_key', context.examBoardKey)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return { match: data as CatalogMatch, matchType: 'board' };
  }

  const { data, error } = await makeBaseQuery()
    .is('exam_board_key', null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  return {
    match: data ? data as CatalogMatch : null,
    matchType: data ? 'generic' : null,
  };
};

const countTopicsForMap = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
  editalId: string,
  applyFilter?: (query: any) => any,
) => {
  let query = (supabase as any)
    .from('topics')
    .select('id,subjects!inner(user_id,edital_id)', { count: 'exact', head: true })
    .eq('subjects.user_id', userId)
    .eq('subjects.edital_id', editalId)
    .neq('is_active', false);

  if (applyFilter) query = applyFilter(query);

  const { count, error } = await query;
  if (error) throw error;

  return count || 0;
};

const refreshIncidenceMapStatus = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
  editalId?: string | null,
  editalName?: string | null,
) => {
  if (!editalId) return;

  const [
    totalTopics,
    withSignalCount,
    noSignalCount,
    catalogCount,
    aiCount,
    skippedCount,
    errorCount,
    pendingCount,
  ] = await Promise.all([
    countTopicsForMap(supabase, userId, editalId),
    countTopicsForMap(supabase, userId, editalId, query => query.gt('total_volume', 0)),
    countTopicsForMap(supabase, userId, editalId, query => query.eq('status', 'no_volume')),
    countTopicsForMap(supabase, userId, editalId, query => query.eq('incidence_source', 'catalog').gt('total_volume', 0)),
    countTopicsForMap(supabase, userId, editalId, query => query.eq('incidence_source', 'ai')),
    countTopicsForMap(supabase, userId, editalId, query => query.eq('is_skipped', true)),
    countTopicsForMap(supabase, userId, editalId, query => query.eq('status', 'error')),
    countTopicsForMap(supabase, userId, editalId, query => query
      .eq('is_skipped', false)
      .is('last_trend_check_at', null)),
  ]);

  const completedAt = pendingCount === 0 ? new Date().toISOString() : null;
  const status = totalTopics === 0
    ? 'nao_iniciado'
    : pendingCount > 0
      ? 'processando'
      : (noSignalCount > 0 || skippedCount > 0 || errorCount > 0)
        ? 'concluido_parcial'
        : 'concluido';

  const now = new Date().toISOString();
  const { data: currentMap } = await (supabase as any)
    .from('edital_incidence_maps')
    .select('id,notification_sent_at,status')
    .eq('user_id', userId)
    .eq('edital_id', editalId)
    .maybeSingle();

  const { data: savedMap, error } = await (supabase as any)
    .from('edital_incidence_maps')
    .upsert({
      user_id: userId,
      edital_id: editalId,
      status,
      total_topics: totalTopics,
      with_signal_count: withSignalCount,
      no_signal_count: noSignalCount,
      catalog_count: catalogCount,
      ai_count: aiCount,
      skipped_count: skippedCount,
      error_count: errorCount,
      pending_count: pendingCount,
      started_at: currentMap?.id ? undefined : now,
      completed_at: completedAt,
      last_processed_at: now,
      updated_at: now,
      metadata: {
        edital_name: editalName,
        measurement_type: 'raw_search_signal',
      },
    }, { onConflict: 'user_id,edital_id' })
    .select('id,notification_sent_at')
    .single();

  if (error) throw error;

  const shouldNotify = pendingCount === 0 && !currentMap?.notification_sent_at && !savedMap?.notification_sent_at && totalTopics > 0;
  if (shouldNotify) {
    const title = status === 'concluido'
      ? 'Mapa de cobrança pronto'
      : 'Mapa de cobrança finalizado parcialmente';
    const displayName = editalName || 'seu edital';
    const message = status === 'concluido'
      ? `Mapa de cobrança do edital ${displayName} pronto: ${totalTopics} tópicos analisados, ${withSignalCount} com sinal.`
      : `Mapa de cobrança do edital ${displayName} finalizado parcialmente: ${withSignalCount} com sinal, ${noSignalCount} sem sinal encontrado, ${errorCount} com erro para retentar.`;

    await (supabase as any)
      .from('user_notifications')
      .insert({
        user_id: userId,
        type: 'estudo',
        title,
        message,
        action_url: '/ciclo-estudos',
        read: false,
        data: {
          edital_id: editalId,
          map_id: savedMap.id,
          status,
          total_topics: totalTopics,
          with_signal_count: withSignalCount,
          no_signal_count: noSignalCount,
          error_count: errorCount,
        },
      });

    await (supabase as any)
      .from('edital_incidence_maps')
      .update({ notification_sent_at: now })
      .eq('id', savedMap.id);
  }
};

const getScoreLabel = (score: number) => {
  if (score >= 5) return 'Cobrança muito alta';
  if (score >= 4) return 'Cobrança alta';
  if (score >= 3) return 'Cobrança média';
  if (score >= 2) return 'Cobrança baixa';
  return 'Cobrança muito baixa';
};

const getScoreFromPercentile = (percentile: number | null, volume: number, minVolume: number, maxVolume: number) => {
  if (percentile === null) return 3;
  if (maxVolume === minVolume) return 3;
  if (percentile >= 0.8) return 5;
  if (percentile >= 0.6) return 4;
  if (percentile >= 0.4) return 3;
  if (percentile >= 0.2) return 2;
  return volume > 0 ? 1 : 0;
};

const normalizeIncidenceScoresForSubject = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subjectId?: string | null,
) => {
  if (!subjectId) return {} as Record<string, IncidenceScoreMetadata>;

  const { data, error } = await (supabase as any)
    .from('topics')
    .select('id,total_volume,incidence_context,subjects!inner(user_id,edital_id)')
    .eq('subjects.user_id', userId)
    .eq('subject_id', subjectId)
    .neq('is_active', false)
    .gt('total_volume', 0);

  if (error) throw error;

  const rows = (data || [])
    .map((row: any) => ({
      id: String(row.id),
      total_volume: Number(row.total_volume || 0),
      incidence_context: row.incidence_context && typeof row.incidence_context === 'object'
        ? row.incidence_context
        : {},
    }))
    .filter((row: any) => row.total_volume > 0);

  if (rows.length === 0) return {};

  const now = new Date().toISOString();
  const volumes = rows.map(row => row.total_volume).sort((a, b) => a - b);
  const minVolume = volumes[0];
  const maxVolume = volumes[volumes.length - 1];
  const scoreByTopic: Record<string, IncidenceScoreMetadata> = {};

  for (const row of rows) {
    const lessCount = volumes.filter(volume => volume < row.total_volume).length;
    const equalCount = volumes.filter(volume => volume === row.total_volume).length;
    const percentile = rows.length < 2
      ? null
      : Number(((lessCount + Math.max(0, equalCount - 1) / 2) / (rows.length - 1)).toFixed(4));
    const score = getScoreFromPercentile(percentile, row.total_volume, minVolume, maxVolume);
    const incidenceLevel = getIncidenceLevelFromScore(score);
    const metadata: IncidenceScoreMetadata = {
      raw_volume: row.total_volume,
      normalized_score: score,
      incidence_level: incidenceLevel,
      rank_percentile: percentile,
      score_label: getScoreLabel(score),
      score_scope: 'subject_edital',
      score_basis_count: rows.length,
      score_confidence: rows.length < 3 ? 'low_sample' : 'cohort',
      score_updated_at: now,
    };

    scoreByTopic[row.id] = metadata;

    await updateTopicOrThrow(supabase, row.id, {
      incidence_score: score,
      incidence_level: incidenceLevel,
      incidence_context: {
        ...row.incidence_context,
        ...metadata,
      },
    });
  }

  return scoreByTopic;
};

const calculateIncidence = async (
  supabase: ReturnType<typeof createClient>,
  subjectName: string,
  topicName: string,
  analysisContext?: AnalysisContext | null,
  authToken?: string | null,
) => {
  const searchableTopicName = sanitizeTopicForSearch(topicName) || topicName;
  const aiTerms = await generateSearchTerms(supabase, subjectName, searchableTopicName, analysisContext, authToken);
  const tags = [...aiTerms.tags];
  const cleanTopic = searchableTopicName;

  if (cleanTopic.length > 3 && !tags.some(tag => tag.toLowerCase() === cleanTopic.toLowerCase())) {
    tags.unshift(cleanTopic);
  }

  const searchContextName = aiTerms.searchContext.toLowerCase().includes('lingua portuguesa')
    ? 'Português'
    : aiTerms.searchContext;

  const auditLog = {
    measurement_type: 'raw_search_signal',
    confirmed_questions_count: null,
    confidence_note: 'Volume bruto retornado pela busca; ainda nao e contagem confirmada de questoes/provas.',
    search_budget: {
      max_terms_per_topic: MAX_TERMS_PER_TOPIC,
      max_google_calls_per_topic: MAX_GOOGLE_CALLS_PER_TOPIC,
      strong_signal_threshold: STRONG_SIGNAL_THRESHOLD,
    },
    total_api_calls: 0,
    attempts: [] as Array<{ query: string; volume: number; strategy: string; error?: string }>,
    winner_query: '',
  };
  let maxVolume = 0;
  let winnerTerm = tags[0] || topicName;
  let successfulSearches = 0;
  const technicalErrors: string[] = [];

  const selectedTags = tags.slice(0, MAX_TERMS_PER_TOPIC);

  for (let tagIndex = 0; tagIndex < selectedTags.length; tagIndex += 1) {
    if (auditLog.total_api_calls >= MAX_GOOGLE_CALLS_PER_TOPIC) break;
    if (maxVolume >= STRONG_SIGNAL_THRESHOLD) break;

    const tag = selectedTags[tagIndex];
    const queryCandidates = buildQueryCandidates(tag, subjectName, searchContextName, analysisContext);
    let query = queryCandidates[0];

    let volume = 0;
    for (let index = 0; index < queryCandidates.length; index += 1) {
      if (auditLog.total_api_calls >= MAX_GOOGLE_CALLS_PER_TOPIC) break;

      const remainingTags = selectedTags.length - tagIndex - 1;
      const remainingBudgetAfterThisCall = MAX_GOOGLE_CALLS_PER_TOPIC - auditLog.total_api_calls - 1;
      const canSpendFallback = index === 0 || remainingBudgetAfterThisCall > remainingTags;
      if (!canSpendFallback) break;

      const candidate = queryCandidates[index];
      try {
        const candidateVolume = await searchGoogleVolume(supabase, candidate, 3, authToken);
        successfulSearches += 1;
        auditLog.total_api_calls += 1;
        auditLog.attempts.push({
          query: candidate,
          volume: candidateVolume,
          strategy: analysisContext?.examBoard && index === 0 ? 'banca' : index === 0 ? 'contexto' : 'fallback',
        });
        if (candidateVolume > volume) {
          volume = candidateVolume;
          query = candidate;
        }
        if (candidateVolume > 0) break;
      } catch (error) {
        auditLog.total_api_calls += 1;
        const message = error instanceof Error ? error.message : String(error);
        technicalErrors.push(`"${candidate}": ${message}`);
        auditLog.attempts.push({ query: candidate, volume: 0, strategy: 'fallback', error: message });
        continue;
      }
    }

    if (volume > maxVolume) {
      maxVolume = volume;
      winnerTerm = tag;
      auditLog.winner_query = query;
    }
  }

  if (successfulSearches === 0 && technicalErrors.length > 0) {
    throw new Error(`Todas as buscas falharam tecnicamente. ${technicalErrors[0]}`);
  }

  const importanceScore = maxVolume > 1000 ? 5 : maxVolume > 500 ? 4 : maxVolume > 200 ? 3 : maxVolume > 50 ? 2 : 1;

  return {
    totalVolume: maxVolume,
    importanceScore,
    winnerTerm,
    searchContext: searchContextName,
    auditLog,
    tags,
    reasoning: aiTerms.reasoning,
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase env ausente');

    const workerSecret = Deno.env.get('INCIDENCE_WORKER_SECRET');
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '');
    const providedSecret = req.headers.get('x-worker-secret');
    let isAuthorized =
      bearer === serviceRoleKey ||
      (workerSecret && providedSecret === workerSecret);
    let callerUserId: string | null = null;
    let callerIsAdmin = false;

    if (bearer && bearer !== serviceRoleKey) {
      const { data: userData } = await createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      }).auth.getUser(bearer);

      if (userData?.user?.id) {
        callerUserId = userData.user.id;
        const { data: roleRows } = await createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .in('role', ['admin', 'owner']);

        callerIsAdmin = Boolean(roleRows?.length);
        isAuthorized = isAuthorized || callerIsAdmin;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(Math.max(Number(body.limit || 2), 1), 5);
    const requestedTopicId = typeof body.topicId === 'string' ? body.topicId : null;
    const dryRun = body.dryRun === true;
    const previewQueue = body.previewQueue === true;
    const requestedEditalId = typeof body.editalId === 'string' && body.editalId ? body.editalId : null;
    const requestedSubjectId = typeof body.subjectId === 'string' && body.subjectId ? body.subjectId : null;
    const requestedQueueStatus = ['pending', 'no_result', 'error'].includes(String(body.queueStatus || ''))
      ? String(body.queueStatus)
      : 'pending';
    const configuredDailyGoogleLimit = Number(Deno.env.get('INCIDENCE_DAILY_GOOGLE_LIMIT') || DEFAULT_DAILY_GOOGLE_CALL_LIMIT);
    const dailyGoogleLimit = Number.isFinite(configuredDailyGoogleLimit)
      ? Math.max(configuredDailyGoogleLimit, 0)
      : DEFAULT_DAILY_GOOGLE_CALL_LIMIT;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let targetUserId = callerUserId;
    let targetUserIsPaid = false;
    let queueSelection: Record<string, unknown> | null = null;

    if (targetUserId) {
      targetUserIsPaid = await hasPaidSubscription(supabase, targetUserId);
      if (!targetUserIsPaid && !callerIsAdmin) {
        return new Response(JSON.stringify({
          worker_version: WORKER_VERSION,
          processed: 0,
          scoped_user_id: targetUserId,
          subscription_required: true,
          message: 'Mapa de cobrança avançado disponível para assinantes ativos.',
          catalog: 0,
          ai: 0,
          zero: 0,
          skipped: 0,
          errors: 0,
          dryRun,
          results: [],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!targetUserId && workerSecret && providedSecret === workerSecret) {
      const { data: paidUsers, error: paidUsersError } = await supabase
        .from('user_subscriptions')
        .select('user_id,subscription_started_at,subscription_ends_at,created_at')
        .eq('status', 'active')
        .neq('plan', 'free_trial')
        .order('subscription_started_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
        .limit(25);

      if (paidUsersError) throw paidUsersError;

      const paidUserCandidates = sortPaidUserCandidates(
        await attachCycleSnapshotPriority(
          supabase,
          ((paidUsers || []) as PaidUserCandidate[]).filter(hasCurrentPaidEntitlement),
        ),
      );

      for (const paidUser of paidUserCandidates) {
        const { count, error: pendingCountError } = await (supabase as any)
          .from('topics')
          .select('id,subjects!inner(user_id)', { count: 'exact', head: true })
          .eq('subjects.user_id', paidUser.user_id)
          .neq('is_active', false)
          .eq('is_skipped', false)
          .or('total_volume.is.null,total_volume.eq.0')
          .or(`last_trend_check_at.is.null,last_trend_check_at.lt.${thirtyDaysAgo},status.eq.error`);

        if (pendingCountError) throw pendingCountError;
        if ((count || 0) > 0) {
          targetUserId = paidUser.user_id;
          targetUserIsPaid = true;
          queueSelection = {
            mode: 'automatic_paid_queue',
            prioritized_by: paidUser.first_cycle_snapshot_at ? 'closed_cycle_snapshot' : 'subscription_order',
            first_cycle_snapshot_at: paidUser.first_cycle_snapshot_at || null,
            subscription_started_at: paidUser.subscription_started_at || null,
            subscription_ends_at: paidUser.subscription_ends_at || null,
          };
          break;
        }
      }
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({
        worker_version: WORKER_VERSION,
        processed: 0,
        scoped_user_id: null,
        message: 'Nenhum assinante pago com tópicos pendentes encontrado.',
        catalog: 0,
        ai: 0,
        zero: 0,
        skipped: 0,
        errors: 0,
        dryRun,
        results: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const topicSelect = 'id,name,subject_id,subjects!inner(id,name,user_id,edital_id,user_editais(id,name,exam_board,organ,position,year,created_at))';
    const applyQueueScope = (query: any) => {
      let scopedQuery = query.eq('subjects.user_id', targetUserId);

      if (requestedEditalId) {
        scopedQuery = scopedQuery.eq('subjects.edital_id', requestedEditalId);
      }

      if (requestedSubjectId) {
        scopedQuery = scopedQuery.eq('subject_id', requestedSubjectId);
      }

      return scopedQuery;
    };

    const pendingTopicFilter = (query: any) => {
      const filteredQuery = query
        .neq('is_active', false)
        .eq('is_skipped', false);

      if (requestedQueueStatus === 'error') {
        return filteredQuery.eq('status', 'error');
      }

      if (requestedQueueStatus === 'no_result') {
        return filteredQuery.eq('status', 'no_volume');
      }

      return filteredQuery
        .or('total_volume.is.null,total_volume.eq.0')
        .or(`last_trend_check_at.is.null,last_trend_check_at.lt.${thirtyDaysAgo},status.eq.error`);
    };

    const firstCandidateQuery = requestedTopicId
      ? (supabase as any)
        .from('topics')
        .select(topicSelect)
        .eq('subjects.user_id', targetUserId)
        .eq('id', requestedTopicId)
      : pendingTopicFilter(
        applyQueueScope(
          (supabase as any)
            .from('topics')
            .select(topicSelect)
        )
      )
        .order('last_trend_check_at', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true });

    const { data: firstCandidateRows, error: firstCandidateError } = await firstCandidateQuery.limit(1);

    if (firstCandidateError) throw firstCandidateError;

    const firstCandidate = (firstCandidateRows || [])[0] as TopicRow | undefined;
    if (!firstCandidate) {
      return new Response(JSON.stringify({
        worker_version: WORKER_VERSION,
        processed: 0,
        scoped_user_id: targetUserId,
        paid_user: targetUserIsPaid,
        message: 'Nenhum tópico pendente encontrado para o escopo selecionado.',
        catalog: 0,
        ai: 0,
        zero: 0,
        skipped: 0,
        errors: 0,
        dryRun,
        requested_topic_id: requestedTopicId,
        queue_selection: queueSelection,
        results: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firstSubject = getTopicSubject(firstCandidate);
    const topicQuery = requestedTopicId
      ? (supabase as any)
        .from('topics')
        .select(topicSelect)
        .eq('subjects.user_id', targetUserId)
        .eq('id', requestedTopicId)
        .limit(1)
      : pendingTopicFilter(
        applyQueueScope(
          (supabase as any)
            .from('topics')
            .select(topicSelect)
        )
      )
        .eq('subject_id', requestedSubjectId || firstCandidate.subject_id || firstSubject?.id)
        .order('last_trend_check_at', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true })
        .limit(limit);

    const { data: topics, error: topicError } = await topicQuery;

    if (topicError) throw topicError;

    if (previewQueue) {
      const previewResults = ((topics || []) as TopicRow[]).map((topic) => {
        const analysisContext = getAnalysisContext(topic);

        return {
          topic_id: topic.id,
          topic_name: topic.name,
          subject_name: getTopicSubjectName(topic),
          status: 'preview',
          volume: 0,
          reason: requestedTopicId
            ? 'Tópico selecionado manualmente para prévia.'
            : 'Próximo tópico pendente da fila manual/controlada.',
          edital_id: analysisContext.editalId,
          edital_name: analysisContext.editalName,
          exam_board: analysisContext.examBoard,
          organ: analysisContext.organization,
          position: analysisContext.career,
          year: analysisContext.year,
        };
      });

      return new Response(JSON.stringify({
        worker_version: WORKER_VERSION,
        preview_queue: true,
        processed: previewResults.length,
        scoped_user_id: targetUserId,
        paid_user: targetUserIsPaid,
        processing_context: {
          requested_topic_id: requestedTopicId,
          requested_edital_id: requestedEditalId,
          requested_subject_id: requestedSubjectId,
          queue_status: requestedQueueStatus,
          subject_id: firstCandidate.subject_id || firstSubject?.id || null,
          subject_name: getTopicSubjectName(firstCandidate),
          edital_id: getAnalysisContext(firstCandidate).editalId,
          edital_name: getAnalysisContext(firstCandidate).editalName,
          exam_board: getAnalysisContext(firstCandidate).examBoard,
          organ: getAnalysisContext(firstCandidate).organization,
          position: getAnalysisContext(firstCandidate).career,
          year: getAnalysisContext(firstCandidate).year,
          queue_selection: queueSelection,
        },
        catalog: 0,
        ai: 0,
        zero: 0,
        skipped: 0,
        deferred: 0,
        errors: 0,
        dryRun: true,
        results: previewResults,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    const affectedSubjectIds = new Set<string>();
    const initialDailyGoogleUsage = await getDailyGoogleUsage(supabase, targetUserId);
    let googleCallsThisRun = 0;
    const adminSingleTopicOverride = callerIsAdmin && Boolean(requestedTopicId);

    for (const topic of (topics || []) as TopicRow[]) {
      const subjectName = getTopicSubjectName(topic);
      const topicKey = normalizeText(topic.name);
      const subjectKey = normalizeText(subjectName);
      const analysisContext = getAnalysisContext(topic);

      try {
        const { match: catalogMatch, matchType } = await findCatalogMatch(
          supabase,
          topicKey,
          subjectKey,
          analysisContext,
        );

        if (catalogMatch && Number(catalogMatch.total_volume) > 0) {
          const now = new Date().toISOString();
          if (!dryRun) {
            await updateTopicOrThrow(supabase, topic.id, {
              last_trend_check_at: now,
              total_volume: catalogMatch.total_volume,
              incidence_score: null,
              incidence_level: null,
              incidence_catalog_id: catalogMatch.id,
              incidence_source: 'catalog',
              incidence_applied_at: now,
              incidence_context: {
                catalog_id: catalogMatch.id,
                catalog_match_type: matchType,
                search_context: catalogMatch.search_context,
                winner_query: catalogMatch.winner_query,
                source: 'catalog',
                edital_id: analysisContext.editalId,
                edital_name: analysisContext.editalName,
                exam_board: analysisContext.examBoard,
                organ: analysisContext.organization,
                position: analysisContext.career,
                year: analysisContext.year,
              },
              last_search_context: catalogMatch.search_context,
              last_used_query: catalogMatch.winner_query,
              last_audit_log: catalogMatch.audit_log,
              status: 'catalog_applied',
              is_skipped: false,
              skip_reason: matchType === 'board'
                ? 'Volume reaproveitado do catálogo da mesma banca'
                : 'Volume reaproveitado do catálogo genérico',
            });
          }

          results.push({
            topic_id: topic.id,
            topic_name: topic.name,
            subject_name: subjectName,
            status: 'catalog',
            volume: catalogMatch.total_volume,
            catalog_match_type: matchType,
            exam_board: analysisContext.examBoard,
          });
          if (topic.subject_id) affectedSubjectIds.add(topic.subject_id);
          continue;
        }

        const projectedGoogleUsage = initialDailyGoogleUsage + googleCallsThisRun;
        if (!adminSingleTopicOverride && projectedGoogleUsage >= dailyGoogleLimit) {
          results.push({
            topic_id: topic.id,
            topic_name: topic.name,
            subject_name: subjectName,
            status: 'deferred',
            volume: 0,
            reason: `${DAILY_SEARCH_LIMIT_LABEL} (${projectedGoogleUsage}/${dailyGoogleLimit}). Catálogo ainda pode ser reaproveitado; novas buscas ficam para o próximo ciclo.`,
          });
          continue;
        }

        const validation = await validateTopicForIncidence(supabase, subjectName, topic.name, bearer);
        if (!validation.valid) {
          if (!dryRun) {
            await updateTopicOrThrow(supabase, topic.id, {
              last_trend_check_at: new Date().toISOString(),
              total_volume: 0,
              incidence_score: null,
              incidence_level: null,
              skip_reason: validation.reason,
              status: 'skipped',
              is_skipped: true,
              incidence_source: null,
              incidence_applied_at: null,
              incidence_context: {
                reason: validation.reason,
                source: 'validation',
              },
            });
          }

          results.push({
            topic_id: topic.id,
            topic_name: topic.name,
            subject_name: subjectName,
            status: 'skipped',
            volume: 0,
            reason: validation.reason,
          });
          continue;
        }

        const incidence = await calculateIncidence(supabase, subjectName, topic.name, analysisContext, bearer);
        googleCallsThisRun += Number(incidence.auditLog.total_api_calls || 0);
        const now = new Date().toISOString();
        const sourceMethod = incidence.reasoning.startsWith('Fallback sem Gemini') ? 'fallback_without_gemini' : 'gemini_terms';
        let catalogId: string | null = null;

        if (!dryRun && incidence.totalVolume > 0) {
          const { data: insertedCatalog, error: catalogError } = await supabase
            .from('topic_incidence_catalog')
            .upsert({
              context_hash: contextHash(subjectName, topic.name, analysisContext),
              topic_key: topicKey,
              topic_name: topic.name,
              subject_key: subjectKey,
              subject_name: subjectName,
              exam_board_key: analysisContext.examBoardKey || null,
              exam_board_name: analysisContext.examBoard,
              organization_key: analysisContext.organizationKey || null,
              organization_name: analysisContext.organization,
              career_key: analysisContext.careerKey || null,
              career_name: analysisContext.career,
              total_volume: incidence.totalVolume,
              importance_score: incidence.importanceScore,
              source: 'ai',
              confidence_status: 'auto',
              search_context: incidence.searchContext,
              winner_query: incidence.auditLog.winner_query || null,
              audit_log: incidence.auditLog,
              analysis_metadata: {
                measurement_type: 'raw_search_signal',
                worker_version: WORKER_VERSION,
                confirmed_questions_count: null,
                sub_topics: incidence.tags,
                term_winner: incidence.winnerTerm,
                reasoning: incidence.reasoning,
                source_method: sourceMethod,
                edital_id: analysisContext.editalId,
                edital_name: analysisContext.editalName,
                exam_board: analysisContext.examBoard,
                organ: analysisContext.organization,
                position: analysisContext.career,
                year: analysisContext.year,
                years_window: DEFAULT_YEARS_WINDOW,
              },
              last_analyzed_at: now,
              updated_at: now,
            }, { onConflict: 'context_hash' })
            .select('id')
            .single();

          if (catalogError) console.warn('Falha ao salvar catálogo:', catalogError);
          catalogId = insertedCatalog?.id || null;
        }

        if (!dryRun) {
          await updateTopicOrThrow(supabase, topic.id, {
            last_trend_check_at: now,
            total_volume: incidence.totalVolume,
            incidence_score: null,
            incidence_level: null,
            skip_reason: incidence.totalVolume > 0 ? 'Processado com sucesso' : 'Volume 0 na busca atual',
            status: incidence.totalVolume > 0 ? 'processed' : 'no_volume',
            is_skipped: false,
            last_search_context: incidence.searchContext,
            last_used_query: incidence.auditLog.winner_query || null,
            last_audit_log: incidence.auditLog,
            incidence_catalog_id: catalogId,
            incidence_source: 'ai',
            incidence_applied_at: now,
            incidence_context: {
              catalog_id: catalogId,
              worker_version: WORKER_VERSION,
              search_context: incidence.searchContext,
              winner_query: incidence.auditLog.winner_query,
              source: 'ai',
              source_method: sourceMethod,
              edital_id: analysisContext.editalId,
              edital_name: analysisContext.editalName,
              exam_board: analysisContext.examBoard,
              organ: analysisContext.organization,
              position: analysisContext.career,
              year: analysisContext.year,
              years_window: DEFAULT_YEARS_WINDOW,
            },
          });
        }

        results.push({
          topic_id: topic.id,
          topic_name: topic.name,
          subject_name: subjectName,
          status: incidence.totalVolume > 0 ? 'ai' : 'zero',
          volume: incidence.totalVolume,
          api_calls: incidence.auditLog.total_api_calls,
          reasoning: incidence.reasoning,
          source_method: sourceMethod,
          exam_board: analysisContext.examBoard,
        });
        if (topic.subject_id && incidence.totalVolume > 0) affectedSubjectIds.add(topic.subject_id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!dryRun) {
          await updateTopicOrThrow(supabase, topic.id, {
            status: 'error',
            skip_reason: message,
            last_trend_check_at: new Date().toISOString(),
            incidence_source: null,
            incidence_applied_at: null,
            incidence_catalog_id: null,
            incidence_score: null,
            incidence_level: null,
            incidence_context: {
              source: 'error',
              reason: message,
            },
          });
        }
        results.push({
          topic_id: topic.id,
          topic_name: topic.name,
          subject_name: subjectName,
          status: 'error',
          error: message,
        });
      }
    }

    const scoreByTopic: Record<string, IncidenceScoreMetadata> = {};
    if (!dryRun) {
      for (const subjectId of affectedSubjectIds) {
        Object.assign(scoreByTopic, await normalizeIncidenceScoresForSubject(supabase, targetUserId, subjectId));
      }
    }

    const enrichedResults = results.map((result: any) => {
      const score = result.topic_id ? scoreByTopic[result.topic_id] : null;
      return score
        ? {
          ...result,
          normalized_score: score.normalized_score,
          score_label: score.score_label,
          rank_percentile: score.rank_percentile,
          score_confidence: score.score_confidence,
          score_basis_count: score.score_basis_count,
        }
        : result;
    });

    await refreshIncidenceMapStatus(
      supabase,
      targetUserId,
      firstSubject?.edital_id || null,
      firstSubject?.user_editais?.name || null,
    );

    return new Response(JSON.stringify({
      worker_version: WORKER_VERSION,
      processed: enrichedResults.length,
      scoped_user_id: targetUserId,
      paid_user: targetUserIsPaid,
      google_quota: {
        limit: dailyGoogleLimit,
        used_before_run: initialDailyGoogleUsage,
        used_in_run: googleCallsThisRun,
        used_after_run: initialDailyGoogleUsage + googleCallsThisRun,
        admin_single_topic_override: adminSingleTopicOverride,
      },
      processing_context: {
        requested_topic_id: requestedTopicId,
        subject_id: firstCandidate.subject_id || firstSubject?.id || null,
        subject_name: firstSubject?.name || null,
        edital_id: firstSubject?.edital_id || null,
        edital_name: firstSubject?.user_editais?.name || null,
        exam_board: firstSubject?.user_editais?.exam_board || null,
        organ: firstSubject?.user_editais?.organ || null,
        position: firstSubject?.user_editais?.position || null,
        year: firstSubject?.user_editais?.year || null,
        queue_selection: queueSelection,
      },
      catalog: enrichedResults.filter(result => result.status === 'catalog').length,
      ai: enrichedResults.filter(result => result.status === 'ai').length,
      zero: enrichedResults.filter(result => result.status === 'zero').length,
      skipped: enrichedResults.filter(result => result.status === 'skipped').length,
      deferred: enrichedResults.filter(result => result.status === 'deferred').length,
      errors: enrichedResults.filter(result => result.status === 'error').length,
      dryRun,
      results: enrichedResults,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
