import md5 from 'crypto-js/md5';
import { supabase } from '@/integrations/supabase/client';

export type TopicIncidenceCatalogContext = {
  topicName: string;
  subjectName: string;
  examBoard?: string | null;
  career?: string | null;
  organization?: string | null;
};

export type TopicIncidenceCatalogMatch = {
  id: string;
  total_volume: number;
  importance_score: number | null;
  search_context: string | null;
  winner_query: string | null;
  audit_log: unknown;
};

export type SaveTopicIncidenceCatalogInput = TopicIncidenceCatalogContext & {
  userId: string;
  totalVolume: number;
  importanceScore?: number | null;
  searchContext?: string | null;
  winnerQuery?: string | null;
  auditLog?: unknown;
  metadata?: Record<string, unknown>;
};

const removeAccents = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const normalizeIncidenceCatalogText = (value?: string | null) =>
  removeAccents(String(value || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(nocoes|nocao|de|da|do|das|dos|e|para|em|no|na|nos|nas)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const buildTopicIncidenceContextHash = ({
  topicName,
  subjectName,
  examBoard,
  career,
  organization,
}: TopicIncidenceCatalogContext) => {
  const parts = [
    normalizeIncidenceCatalogText(subjectName),
    normalizeIncidenceCatalogText(topicName),
    normalizeIncidenceCatalogText(examBoard),
    normalizeIncidenceCatalogText(career),
    normalizeIncidenceCatalogText(organization),
  ];

  return md5(parts.join('|')).toString();
};

const buildCatalogKeys = (context: TopicIncidenceCatalogContext) => ({
  context_hash: buildTopicIncidenceContextHash(context),
  topic_key: normalizeIncidenceCatalogText(context.topicName),
  subject_key: normalizeIncidenceCatalogText(context.subjectName),
  exam_board_key: normalizeIncidenceCatalogText(context.examBoard) || null,
  career_key: normalizeIncidenceCatalogText(context.career) || null,
  organization_key: normalizeIncidenceCatalogText(context.organization) || null,
});

export const findTopicIncidenceCatalogMatch = async (
  context: TopicIncidenceCatalogContext,
): Promise<TopicIncidenceCatalogMatch | null> => {
  const keys = buildCatalogKeys(context);
  if (!keys.topic_key || !keys.subject_key) return null;

  const { data: exactMatch, error: exactError } = await (supabase as unknown)
    .from('topic_incidence_catalog')
    .select('id,total_volume,importance_score,search_context,winner_query,audit_log')
    .eq('context_hash', keys.context_hash)
    .in('confidence_status', ['auto', 'approved'])
    .maybeSingle();

  if (exactError) {
    console.warn('[topicIncidenceCatalog] falha ao buscar match exato:', exactError);
  }

  if (exactMatch && Number(exactMatch.total_volume) > 0) {
    return exactMatch as TopicIncidenceCatalogMatch;
  }

  const { data: fallbackMatch, error: fallbackError } = await (supabase as unknown)
    .from('topic_incidence_catalog')
    .select('id,total_volume,importance_score,search_context,winner_query,audit_log')
    .eq('topic_key', keys.topic_key)
    .eq('subject_key', keys.subject_key)
    .is('exam_board_key', null)
    .is('career_key', null)
    .is('organization_key', null)
    .in('confidence_status', ['auto', 'approved'])
    .order('last_analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError) {
    console.warn('[topicIncidenceCatalog] falha ao buscar match generico:', fallbackError);
  }

  return fallbackMatch && Number(fallbackMatch.total_volume) > 0
    ? fallbackMatch as TopicIncidenceCatalogMatch
    : null;
};

export const applyTopicIncidenceCatalogMatch = async (
  topicId: string,
  match: TopicIncidenceCatalogMatch,
) => {
  const { error } = await (supabase as unknown)
    .from('topics')
    .update({
      total_volume: match.total_volume,
      incidence_catalog_id: match.id,
      incidence_source: 'catalog',
      incidence_applied_at: new Date().toISOString(),
      incidence_context: {
        catalog_id: match.id,
        search_context: match.search_context,
        winner_query: match.winner_query,
      },
      status: 'catalog_applied',
      is_skipped: false,
      skip_reason: 'Volume reaproveitado do catálogo',
    })
    .eq('id', topicId);

  if (error) throw error;
};

export const saveTopicIncidenceCatalogResult = async ({
  userId,
  totalVolume,
  importanceScore,
  searchContext,
  winnerQuery,
  auditLog,
  metadata = {},
  ...context
}: SaveTopicIncidenceCatalogInput) => {
  if (!userId || totalVolume <= 0) return null;

  const keys = buildCatalogKeys(context);
  if (!keys.topic_key || !keys.subject_key) return null;

  const existing = await findTopicIncidenceCatalogMatch(context);
  const now = new Date().toISOString();

  if (existing) {
    const { error } = await (supabase as unknown)
      .from('topic_incidence_catalog')
      .update({
        total_volume: Math.max(existing.total_volume || 0, totalVolume),
        importance_score: importanceScore || existing.importance_score,
        search_context: searchContext || existing.search_context,
        winner_query: winnerQuery || existing.winner_query,
        audit_log: auditLog || existing.audit_log || {},
        analysis_metadata: metadata,
        last_analyzed_at: now,
        updated_at: now,
      })
      .eq('id', existing.id);

    if (error) {
      console.warn('[topicIncidenceCatalog] falha ao atualizar catalogo:', error);
      return existing.id;
    }

    return existing.id;
  }

  const { data, error } = await (supabase as unknown)
    .from('topic_incidence_catalog')
    .insert({
      ...keys,
      topic_name: context.topicName,
      subject_name: context.subjectName,
      exam_board_name: context.examBoard || null,
      career_name: context.career || null,
      organization_name: context.organization || null,
      total_volume: totalVolume,
      importance_score: importanceScore || null,
      source: 'ai',
      confidence_status: 'auto',
      search_context: searchContext || null,
      winner_query: winnerQuery || null,
      audit_log: auditLog || {},
      analysis_metadata: metadata,
      created_by: userId,
      last_analyzed_at: now,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('[topicIncidenceCatalog] falha ao inserir catalogo:', error);
    return null;
  }

  return data?.id || null;
};
