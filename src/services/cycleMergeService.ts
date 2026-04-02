/**
 * cycleMergeService.ts
 * 
 * Service that orchestrates the 2-step hybrid merge of editais into a study cycle.
 * 
 * SUBJECT MERGE (Etapa 1):
 *   Step A: Exact name matching (case-insensitive, accent-normalized, prefix-stripped)
 *   Step B: Semantic matching via AI
 * 
 * TOPIC MERGE (Etapa 2):
 *   Step C: Exact topic matching within merged subject groups
 *   Step D: AI semantic matching for unmatched topics
 * 
 * The merge is STRICTLY VISUAL — no master edital is created.
 */

import { supabase } from '@/integrations/supabase/client';
import { Subject, Topic } from '@/types';
import {
  CycleUnificationMap,
  UnifiedSubjectMapping,
  UnifiedTopicMapping,
  HybridMergeResult,
  AITopicMergeCandidate,
  AITopicMergeResult,
  TopicGroupResult,
  TopicMergePhaseResult,
} from '@/types/cycleMergeTypes';

// ============================================
// HELPERS
// ============================================

const COMMON_PREFIXES = [
  'noções de ',
  'noções básicas de ',
  'noções fundamentais de ',
  'fundamentos de ',
  'fundamentos do ',
  'fundamentos da ',
  'introdução à ',
  'introdução ao ',
  'introdução a ',
  'elementos de ',
  'elementos do ',
  'princípios de ',
  'princípios do ',
  'princípios da ',
  'legislação de ',
  'legislação do ',
  'legislação da ',
];

/**
 * Normalização robusta e agressiva:
 * 1. Remove acentos e caracteres especiais.
 * 2. Converte para minúsculas.
 * 3. Remove pontuação agressivamente.
 * 4. Singularização Genérica: "Crases" -> "Crase", etc.
 * 5. Remove prefixos de editais.
 */
function normalizeName(name: string): string {
  if (!name) return '';
  let normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[.,:;!?(){}[\]\\/|<>]/g, ' ') 
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalização de plural (Qualquer palavra > 3 letras terminada em 's')
  normalized = normalized.split(' ').map(word => {
    if (word.length > 3 && word.endsWith('s')) {
      // Exceções comuns
      if (['caes', 'pães', 'maes', 'pos'].includes(word)) return word;
      return word.slice(0, -1);
    }
    return word;
  }).join(' ');

  for (const prefix of COMMON_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length).trim();
      break;
    }
  }

  return normalized;
}

function getSimilarityScore(nameA: string, nameB: string): number {
  const nA = normalizeName(nameA);
  const nB = normalizeName(nameB);
  const wordsA = new Set(nA.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(nB.split(' ').filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) intersection++; });
  return intersection / Math.max(wordsA.size, wordsB.size);
}

// ============================================
// PROMPTS (Fallbacks técnicos - As regras devem estar no banco)
// ============================================

const DEFAULT_MERGE_PROMPT = `Analise a lista de disciplinas e agrupe aquelas que tratam do MESMO CONTEÚDO seguindo as instruções do usuário.

$SUBJECTS$

Retorne APENAS um JSON no formato:
[{"subjectIds": ["id1", "id2"], "suggestedName": "Nome Unificado", "reason": "Motivo"}]`;

const DEFAULT_TOPIC_MERGE_PROMPT = `Analise a lista de tópicos e identifique quais são equivalentes ou duplicados.

$TOPICS$

Retorne APENAS um JSON no formato:
[{"topicNames": ["Nome 1", "Nome 2"], "mergedName": "Nome Unificado"}]`;

async function fetchMergePrompt(type: 'subject' | 'topic'): Promise<string> {
  const key = type === 'subject' ? 'ai_merge_prompt' : 'ai_topic_merge_prompt';
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    
    if (data?.value && typeof data.value === 'string' && data.value.length > 20) {
      return data.value;
    }
  } catch (err) {
    console.warn(`[Supabase] Erro ao buscar prompt ${key} (usando fallback técnico):`, err);
  }
  return type === 'subject' ? DEFAULT_MERGE_PROMPT : DEFAULT_TOPIC_MERGE_PROMPT;
}

// ============================================
// STEP A: EXACT MERGE
// ============================================

interface ExactMatchResult {
  matched: {
    groupName: string;
    subjects: Subject[];
    hasMultipleSides: boolean;
  }[];
  unmatchedExisting: Subject[];
  unmatchedNew: Subject[];
}

export function performExactMerge(
  existingSubjects: Subject[],
  newSubjects: Subject[]
): ExactMatchResult {
  const groups = new Map<string, { subjects: Subject[], containsExisting: boolean, containsNew: boolean }>();
  const allSubjects = [
    ...existingSubjects.map(s => ({ ...s, _isExisting: true as const })),
    ...newSubjects.map(s => ({ ...s, _isExisting: false as const }))
  ];

  for (const s of allSubjects) {
    const norm = normalizeName(s.name);
    if (!groups.has(norm)) {
      groups.set(norm, { subjects: [], containsExisting: false, containsNew: false });
    }
    const g = groups.get(norm)!;
    g.subjects.push(s as Subject);
    if (s._isExisting) g.containsExisting = true;
    else g.containsNew = true;
  }

  const matched: ExactMatchResult['matched'] = [];
  const unmatchedExisting: Subject[] = [];
  const unmatchedNew: Subject[] = [];

  for (const [, g] of groups.entries()) {
    const isCross = g.containsExisting && g.containsNew;
    const isInternal = g.subjects.length > 1 && !isCross;

    if (isCross || isInternal) {
      matched.push({
        groupName: g.subjects[0].name,
        subjects: g.subjects,
        hasMultipleSides: isCross,
      });
    } else if (g.containsExisting) {
      unmatchedExisting.push(...g.subjects);
    } else {
      unmatchedNew.push(...g.subjects);
    }
  }

  return { matched, unmatchedExisting, unmatchedNew };
}

// ============================================
// STEP B: SEMANTIC MERGE (AI)
// ============================================

// fetchMergePrompt movido para cima para ficar junto com os prompts

async function performSemanticMerge(
  exactGroups: ExactMatchResult['matched'],
  unmatchedExisting: Subject[],
  unmatchedNew: Subject[]
): Promise<{ results: AIGroupMergeResult[], status: 'success' | 'error' }> {
  const allUnmatched = [...unmatchedExisting, ...unmatchedNew];
  if (allUnmatched.length === 0) return { results: [], status: 'success' };

  try {
    const promptTemplate = await fetchMergePrompt('subject');
    const virtualGroups = exactGroups.map((g, i) => ({
      id: `__exact_group_${i}`,
      name: g.groupName,
      topics: [...new Set(g.subjects.flatMap(s => s.topics.map(t => t.name)))].slice(0, 15).join(', '),
      realSubjectIds: g.subjects.map(s => s.id),
    }));

    const subjectList = [
      ...virtualGroups.map(vg => ({ id: vg.id, name: vg.name, topics: vg.topics })),
      ...allUnmatched.map(s => ({ id: s.id, name: s.name, topics: s.topics.map(t => t.name).slice(0, 15).join(', ') })),
    ];

    if (subjectList.length < 2) return { results: [], status: 'success' };

    const { data, error } = await supabase.functions.invoke('ai-handler', {
      body: { action: 'generateContent', prompt: promptTemplate.replace('$SUBJECTS$', JSON.stringify(subjectList)) },
    });

    if (error || !data?.success) return { results: [], status: 'error' };

    const text = (data.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(text);
    const results = normalizeAIResponse(parsed, [...virtualGroups.map(v => ({ id: v.id, name: v.name })), ...allUnmatched], virtualGroups);
    return { results, status: 'success' };
  } catch (err) {
    return { results: [], status: 'error' };
  }
}

interface AIGroupMergeResult {
  subjectIds: string[];
  suggestedName: string;
  reason?: string;
}

function normalizeAIResponse(raw: any, subjects: any[], vGroups: any[]): AIGroupMergeResult[] {
  if (!Array.isArray(raw)) return [];
  const vgMap = new Map(vGroups.map(vg => [vg.id, vg]));
  return raw.map(item => {
    const ids = (item.subjectIds || []).flatMap((id: string) => vgMap.get(id)?.realSubjectIds || [id]);
    const name = item.suggestedName || subjects.find(s => ids.includes(s.id))?.name || 'Unificada';
    return { subjectIds: ids, suggestedName: name, reason: item.reason };
  }).filter(r => r.subjectIds.length >= 2);
}

// ============================================
// ETAPA 1 ORCHESTRATOR
// ============================================

export async function performHybridMerge(
  existingSubjects: Subject[],
  newSubjects: Subject[],
  existingEditalIds: string[],
  newEditalId: string
): Promise<HybridMergeResult> {
  const exactResult = performExactMerge(existingSubjects, newSubjects);
  const { results: semanticResults, status: aiStatus } = await performSemanticMerge(exactResult.matched, exactResult.unmatchedExisting, exactResult.unmatchedNew);

  const unificationMap = buildUnificationMap(exactResult, semanticResults, existingSubjects, newSubjects, [...new Set([...existingEditalIds, newEditalId])]);
  const finalSubjectIds = [...new Set([...existingSubjects.map(s => s.id), ...newSubjects.map(s => s.id)])];

  return { 
    unificationMap, 
    finalSubjectIds, 
    stats: { 
      exactMatches: exactResult.matched.length, 
      semanticMatches: semanticResults.length, 
      standaloneSubjects: unificationMap.standaloneSubjectIds.length,
      totalSubjectsInCycle: finalSubjectIds.length,
      aiStatus
    } 
  };
}

function buildUnificationMap(exact: ExactMatchResult, semantic: AIGroupMergeResult[], existing: Subject[], newSubs: Subject[], editalIds: string[]): CycleUnificationMap {
  const all = [...existing, ...newSubs];
  const unified: UnifiedSubjectMapping[] = [];
  const usedIds = new Set<string>();

  for (const m of exact.matched) {
    const ids = m.subjects.map(s => s.id);
    unified.push({ displayName: m.groupName, originalSubjectIds: ids, topicMappings: [], matchType: 'exact' });
    ids.forEach(id => usedIds.add(id));
  }

  for (const s of semantic) {
    const fresh = s.subjectIds.filter(id => !usedIds.has(id));
    if (fresh.length === 0) continue;
    const overlapId = s.subjectIds.find(id => usedIds.has(id));
    if (overlapId) {
      const g = unified.find(u => u.originalSubjectIds.includes(overlapId));
      if (g) {
        g.originalSubjectIds.push(...fresh);
        g.matchType = 'semantic';
        if (s.suggestedName) g.displayName = s.suggestedName;
        fresh.forEach(id => usedIds.add(id));
        continue;
      }
    }
    unified.push({ displayName: s.suggestedName, originalSubjectIds: s.subjectIds, topicMappings: [], matchType: 'semantic' });
    s.subjectIds.forEach(id => usedIds.add(id));
  }

  return {
    version: 1, editalIds, unifiedSubjects: unified, createdAt: new Date().toISOString(),
    standaloneSubjectIds: all.map(s => s.id).filter(id => !usedIds.has(id))
  };
}

// ============================================
// ETAPA 2: TOPIC MERGE (Chunking & N-Way)
// ============================================

async function performTopicSemanticMerge(
  groupName: string, topicsA: Topic[], topicsB: Topic[], idA: string, idB: string
): Promise<{ results: AITopicMergeResult[], status: 'success' | 'error' }> {
  const candidates: AITopicMergeCandidate[] = [];
  for (const tA of topicsA) for (const tB of topicsB) {
    candidates.push({ subjectGroupDisplayName: groupName, topicA: { id: tA.id, name: tA.name, subjectId: idA }, topicB: { id: tB.id, name: tB.name, subjectId: idB } });
  }
  if (candidates.length === 0) return { results: [], status: 'success' };

  const CHUNK_SIZE = 25;
  const results: AITopicMergeResult[] = [];
  let hasError = false;

  const promptTemplate = await fetchMergePrompt('topic');

  for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
    const chunk = candidates.slice(i, i + CHUNK_SIZE);
    try {
      const { data, error } = await supabase.functions.invoke('ai-handler', {
        body: { 
          action: 'generateContent', 
          prompt: promptTemplate.replace('$TOPICS$', JSON.stringify(chunk.map(c => ({ topico_A: c.topicA, topico_B: c.topicB })))) 
        },
      });
      if (error || !data?.success) { 
        console.warn('[SemanticMerge] Erro no chunk:', error || data?.error);
        hasError = true; 
        continue; 
      }
      const parsed = JSON.parse((data.text || '').replace(/```json/g, '').replace(/```/g, '').trim());
      results.push(...parsed);
    } catch (e) { 
      console.error('[SemanticMerge] Erro no processamento de chunk:', e);
      hasError = true; 
    }
  }
  return { results: results.filter(r => r.isEquivalent && r.confidence >= 0.6), status: hasError ? 'error' : 'success' };
}

export async function performFullTopicMerge(unificationMap: CycleUnificationMap, allSubjects: Subject[], useAI: boolean): Promise<TopicMergePhaseResult> {
  const groups: TopicGroupResult[] = [];
  let overallAiError = false;

  for (const unified of unificationMap.unifiedSubjects) {
    const allTopicsWithSource = unified.originalSubjectIds.flatMap(id => {
      const sub = allSubjects.find(s => s.id === id);
      return (sub?.topics || []).map(topic => ({ topic, subjectId: id }));
    });

    // Step C: Exact Match N-Way
    const normMap = new Map<string, any[]>();
    for (const item of allTopicsWithSource) {
      const norm = normalizeName(item.topic.name);
      const existing = normMap.get(norm) ?? [];
      existing.push(item);
      normMap.set(norm, existing);
    }

    const exactMappings: UnifiedTopicMapping[] = [];
    const standalones: any[] = [];
    for (const [, items] of normMap) {
      const sources = [...new Set(items.map(i => i.subjectId))];
      if (sources.length >= 2) {
        exactMappings.push({
          displayName: items.reduce((b, i) => i.topic.name.length > b.length ? i.topic.name : b, ''),
          originalTopicIds: items.map(i => i.topic.id),
          originalSubjectIds: sources,
          matchType: 'exact'
        });
      } else {
        standalones.push(...items);
      }
    }

    // Step D: AI Semantic
    const aiMappings: UnifiedTopicMapping[] = [];
    const usedIds = new Set<string>();
    let aiStatus: 'success' | 'error' | 'skipped' = 'skipped';

    if (useAI && standalones.length >= 2) {
      const bySource = new Map<string, Topic[]>();
      standalones.forEach(s => { const a = bySource.get(s.subjectId) ?? []; a.push(s.topic); bySource.set(s.subjectId, a); });
      const sources = [...bySource.entries()];
      
      for (let i = 0; i < sources.length - 1; i++) {
        for (let j = i + 1; j < sources.length; j++) {
          const [idA, topicsA] = sources[i];
          const [idB, topicsB] = sources[j];
          const fA = topicsA.filter(t => !usedIds.has(t.id));
          const fB = topicsB.filter(t => !usedIds.has(t.id));
          if (fA.length === 0 || fB.length === 0) continue;

          const { results, status } = await performTopicSemanticMerge(unified.displayName, fA, fB, idA, idB);
          if (status === 'error') { aiStatus = 'error'; overallAiError = true; }
          else if (aiStatus !== 'error') aiStatus = 'success';

          results.forEach(res => {
            if (!usedIds.has(res.topicA_id) && !usedIds.has(res.topicB_id)) {
              aiMappings.push({ displayName: res.suggestedDisplayName, originalTopicIds: [res.topicA_id, res.topicB_id], originalSubjectIds: [idA, idB], matchType: 'semantic', confidence: res.confidence });
              usedIds.add(res.topicA_id); usedIds.add(res.topicB_id);
            }
          });
        }
      }
    }

    // Fallback: Remaining topics are kept as exact (standalone)
    standalones.forEach(s => {
      if (!usedIds.has(s.topic.id)) {
        aiMappings.push({ displayName: s.topic.name, originalTopicIds: [s.topic.id], originalSubjectIds: [s.subjectId], matchType: 'exact' });
      }
    });

    groups.push({ subjectDisplayName: unified.displayName, originalSubjectIds: unified.originalSubjectIds, topicMappings: [...exactMappings, ...aiMappings], aiUsed: useAI, aiStatus });
  }

  // Standalone subjects pass-through
  for (const sid of unificationMap.standaloneSubjectIds) {
    const sub = allSubjects.find(s => s.id === sid);
    if (!sub || groups.some(g => g.originalSubjectIds.includes(sid))) continue;
    groups.push({
      subjectDisplayName: sub.name, originalSubjectIds: [sid],
      topicMappings: (sub.topics || []).map(t => ({ displayName: t.name, originalTopicIds: [t.id], originalSubjectIds: [sid], matchType: 'exact' })),
      aiUsed: false, aiStatus: 'skipped'
    });
  }

  return { groups, overallAiStatus: overallAiError ? 'error' : (groups.some(g => g.aiUsed) ? 'success' : 'skipped') };
}

export function applyTopicMergeToMap(unificationMap: CycleUnificationMap, result: TopicMergePhaseResult): CycleUnificationMap {
  const updated = unificationMap.unifiedSubjects.map(u => {
    const res = result.groups.find(g => g.originalSubjectIds.join(',') === u.originalSubjectIds.join(','));
    return res ? { ...u, topicMappings: res.topicMappings } : u;
  });
  return { ...unificationMap, unifiedSubjects: updated };
}

// ============================================
// PERSISTENCE & UI
// ============================================

export async function saveUnificationMap(userId: string, unificationMap: CycleUnificationMap): Promise<void> {
  await (supabase.from('user_cycles') as any).update({ unification_map: unificationMap, atualizado_em: new Date().toISOString() }).eq('user_id', userId).eq('status', 'active');
}

export async function loadUnificationMap(userId: string): Promise<CycleUnificationMap | null> {
  const { data } = await (supabase.from('user_cycles') as any).select('*').eq('user_id', userId).eq('status', 'active').limit(1).maybeSingle();
  return data?.unification_map || null;
}

export function findSiblingTopicIds(completedTopicId: string, map: CycleUnificationMap | null): string[] {
  if (!map) return [];
  for (const s of map.unifiedSubjects) for (const tm of s.topicMappings) {
    if (tm.originalTopicIds.includes(completedTopicId)) return tm.originalTopicIds.filter(id => id !== completedTopicId);
  }
  return [];
}

export async function registerDualProgress(id: string, data: any, map: CycleUnificationMap | null): Promise<void> {
  const siblings = findSiblingTopicIds(id, map);
  for (const sid of siblings) {
    await supabase.from('topics').update({
      review_count: data.review_count, next_review: data.next_review, review_stage: data.review_stage,
      completed: data.completed, last_reviewed_at: data.last_reviewed_at, memory_stability: data.memory_stability,
      current_interval: data.current_interval
    }).eq('id', sid);
  }
}

export function applyUnificationMap(subjects: Subject[], map: CycleUnificationMap | null): Subject[] {
  if (!map) return subjects;
  const result: Subject[] = [];
  const usedSubIds = new Set<string>();

  for (const u of map.unifiedSubjects) {
    const primarySub = subjects.find(s => u.originalSubjectIds.includes(s.id));
    if (primarySub) {
      const virtualTopics: Topic[] = [];
      const usedTids = new Set<string>();
      for (const tm of u.topicMappings) {
        const tid = tm.originalTopicIds[0];
        const sourceSub = subjects.find(s => u.originalSubjectIds.includes(s.id));
        const sourceTopic = sourceSub?.topics.find(t => tm.originalTopicIds.includes(t.id));
        if (sourceTopic && !usedTids.has(tid)) {
          virtualTopics.push({ ...sourceTopic, id: tid, name: tm.displayName });
          usedTids.add(tid);
        }
      }
      result.push({ ...primarySub, name: u.displayName, topics: virtualTopics });
      u.originalSubjectIds.forEach(id => usedSubIds.add(id));
    }
  }
  subjects.forEach(s => { if (!usedSubIds.has(s.id)) result.push(s); });
  return result;
}

export function getCanonicalSubjectName(id: string, name: string, map?: CycleUnificationMap | null): string {
  if (!map) return name;
  const u = map.unifiedSubjects.find(s => s.originalSubjectIds.includes(id));
  return u ? u.displayName : name;
}

export function getCanonicalTopicName(id: string, name: string, map?: CycleUnificationMap | null): string {
  if (!map) return name;
  for (const s of map.unifiedSubjects) for (const tm of s.topicMappings) {
    if (tm.originalTopicIds.includes(id)) return tm.displayName;
  }
  return name;
}

export function getMergeStatusLabel(status: string): string {
  switch (status) {
    case 'unified':
    case 'exact':
    case 'semantic':
    case 'merged_ai':
      return 'UNIFICADO';
    case 'single':
      return 'MATÉRIA ÚNICA';
    default:
      return 'MANTIDO';
  }
}
