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
import { Json } from '@/integrations/supabase/types';
import { Subject, Topic } from '@/types';
import {
  CycleUnificationMap,
  UnifiedSubjectMapping,
  UnifiedTopicMapping,
  HybridMergeResult,
  TopicGroupResult,
  TopicMergePhaseResult,
} from '@/types/cycleMergeTypes';
import { mergeService } from './mergeService';
import { isReviewProgramCompleted } from '@/utils/reviewStage';
import { buildTopicEquivalenceGroups, getExplicitSiblingTopicIds } from '@/utils/topicEquivalenceGraph';

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

const CANONICAL_SUBJECT_MAP: Record<string, string> = {
  // Empty - the AI handles all semantic mappings now
};

/**
 * Normalização simplificada para Módulo 1 (Matches Exatos)
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,:;!?(){}[\]\\/|<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularizeSafeToken(token: string): string {
  if (token.length <= 4 || !token.endsWith('s')) return token;
  if (token.endsWith('oes')) return `${token.slice(0, -3)}ao`;
  if (token.endsWith('ais')) return `${token.slice(0, -3)}al`;
  if (token.endsWith('eis')) return `${token.slice(0, -3)}el`;
  if (token.endsWith('is')) return `${token.slice(0, -2)}il`;
  return token.slice(0, -1);
}

function normalizeSafeTopicName(name: string): string {
  return normalizeText(name)
    .split(' ')
    .filter(Boolean)
    .map(singularizeSafeToken)
    .join(' ');
}

/**
 * Deterministic guard for topic merge suggestions.
 * Automatic topic merge only happens when names are equal after conservative
 * normalization. AI suggestions that are merely semantic remain individual.
 */
export function isSafeSemanticTopicMerge(topicNames: string[]): boolean {
  const validNames = topicNames.map(name => name.trim()).filter(Boolean);
  if (validNames.length < 2) return false;

  const normalized = validNames.map(normalizeSafeTopicName);
  const first = normalized[0];
  return Boolean(first) && normalized.every(name => name === first);
}

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
  
  // 1. Normalização básica: remove acentos, minúsculas, pontuação e espaços extras
  let normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .trim()
    .replace(/[.,:;!?(){}[\]\\/|<>]/g, ' ') 
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove caracteres especiais mantendo letras e números
    .replace(/\s+/g, ' ') // Remove espaços extras
    .trim();

  // 2. Remoção agressiva de prefixos de editais (Ex: "noções de português" -> "português")
  // Esta lista cobre centenas de combinações possíveis
  const prefixes = [
    'nocoes de ', 'nocoes basicas de ', 'conhecimentos de ', 
    'conhecimentos basicos de ', 'conhecimentos especificos de ',
    'lingua ', 'linguagem de ', 'disciplina de ', 'materia de ', 
    'fundamentos de ', 'introducao a ', 'introducao ao ', 'elementos de ', 
    'principios de ', 'legislacao de ', 'normas de ', 'estudo de ', 
    'teoria de ', 'aspectos de ', 'topicos de ', 'manual de '
  ];

  // Remove os prefixos de forma iterativa (ex: "Noções de Língua Portuguesa" -> "Portuguesa")
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of prefixes) {
      if (normalized.startsWith(prefix)) {
        normalized = normalized.substring(prefix.length).trim();
        changed = true;
      }
    }
  }

  // 3. Mapeamento de sinônimos/variações ultra comuns para Match Exato
  const commonSynonyms: Record<string, string> = {
    'portuguesa': 'portugues',
    'matematica e raciocinio logico': 'raciocinio logico',
    'raciocinio logico e matematica': 'raciocinio logico',
    'raciocinio logico-matematico': 'raciocinio logico',
    'raciocinio logico matematico': 'raciocinio logico',
    'raciocinio logico matemático': 'raciocinio logico',
    'rlm': 'raciocinio logico'
  };

  if (commonSynonyms[normalized]) {
    normalized = commonSynonyms[normalized];
  }

  return normalized;
}

/**
 * Extrai o conteúdo JSON de uma string que pode conter preâmbulos ou explicações.
 */
function extractJsonFromText(text: string): unknown {
  if (!text) return null;
  
  // Limpar blocos de código se existirem
  const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Procurar por arrays [] ou objetos {}
  const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
  const objectMatch = cleanText.match(/\{[\s\S]*\}/);
  
  // Decidir qual pegar (o que começar primeiro)
  const arrayIndex = cleanText.indexOf('[');
  const objectIndex = cleanText.indexOf('{');
  
  try {
    if (arrayIndex !== -1 && (objectIndex === -1 || arrayIndex < objectIndex)) {
      if (arrayMatch) return JSON.parse(arrayMatch[0]);
    }
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
    // Fallback para parse direto se nada for encontrado via regex
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("[extractJsonFromText] Erro ao parsear JSON extraído:", e);
    throw e;
  }
}

// ============================================
// CONFIGURAÇÕES DE PROMPT (Sempre do Banco)
// ============================================

async function fetchMergePrompt(key: 'ai_merge_prompt' | 'ai_topic_grouping_prompt'): Promise<string> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    
    if (data?.value && typeof data.value === 'string' && data.value.length > 10) {
      return data.value;
    }
    console.warn(`[Supabase] Prompt ${key} não encontrado no banco ou vazio. Verifique a tabela system_settings.`);
  } catch (err) {
    console.error(`[Supabase] Erro ao buscar prompt ${key}:`, err);
  }
  
    // Erro explícito: o sistema não deve ter prompts no código por regra de projeto
    throw new Error(`[Projeto] Prompt "${key}" obrigatório não encontrado no banco de dados. Configure na tabela system_settings.`);
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
  type TaggedSubject = Subject & { _isExisting: boolean };
  const groups = new Map<string, { subjects: TaggedSubject[], containsExisting: boolean, containsNew: boolean }>();
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
    g.subjects.push(s);
    if (s._isExisting) g.containsExisting = true;
    else g.containsNew = true;
  }

  const matched: ExactMatchResult['matched'] = [];
  const unmatchedExisting: Subject[] = [];
  const unmatchedNew: Subject[] = [];

  for (const [, g] of groups.entries()) {
    // REGRA DE OURO: Só mescla se houver matérias de lados DIFERENTES (Existente vs Novo)
    // E JAMAIS mescla matérias da mesma fonte (mesmo edital ou ciclo)
    const isCross = g.containsExisting && g.containsNew;
    const sourceIds = new Set(g.subjects.map(s => s.edital_id || 'ciclo'));
    const hasSourceConflict = g.subjects.length !== sourceIds.size;

    if (isCross && !hasSourceConflict) {
      matched.push({
        groupName: g.subjects[0].name,
        subjects: g.subjects,
        hasMultipleSides: true,
      });
    } else {
      // Se houver conflito de fonte ou não for cross, mantém separadas
      const existingInGroup = g.subjects.filter(s => s._isExisting);
      const newInGroup = g.subjects.filter(s => !s._isExisting);
      unmatchedExisting.push(...existingInGroup);
      unmatchedNew.push(...newInGroup);
    }
  }

  return { matched, unmatchedExisting, unmatchedNew };
}

// ============================================
// STEP B: SEMANTIC MERGE (AI)
// ============================================

async function performSemanticMerge(
  exactGroups: ExactMatchResult['matched'],
  unmatchedExisting: Subject[],
  unmatchedNew: Subject[]
): Promise<{ results: AIGroupMergeResult[], status: 'success' | 'error' }> {
  const allUnmatched = [...unmatchedExisting, ...unmatchedNew];
  if (allUnmatched.length === 0) return { results: [], status: 'success' };

  try {
    const promptTemplate = await fetchMergePrompt('ai_merge_prompt');
    const virtualGroups = exactGroups.map((g, i) => ({
      id: `__exact_group_${i}`,
      name: g.groupName,
      topics: [...new Set(g.subjects.flatMap(s => s.topics.map(t => t.name)))].slice(0, 15).join(', '),
      realSubjectIds: g.subjects.map(s => s.id),
    }));

    const subjectList = [
      ...virtualGroups.map(vg => ({ 
        id: vg.id, 
        name: vg.name, 
        topics: vg.topics,
        // Precisamos indicar se é um grupo de mesclagem ou uma única matéria
        source: 'múltiplos editais'
      })),
      ...allUnmatched.map(s => ({ 
        id: s.id, 
        name: s.name, 
        topics: s.topics.map(t => t.name).slice(0, 15).join(', '),
        edid: s.edital_id || 'ciclo'
      })),
    ];

    if (subjectList.length < 2) return { results: [], status: 'success' };

    const enhancedPrompt = promptTemplate + `
REGRAS OBRIGATÓRIAS:
1. JAMAIS sugira a unificação de matérias que possuam o mesmo "edid".
2. Se o novo edital tiver matérias similares internamente, MANTENHA-AS SEPARADAS.
3. Unifique apenas matérias de FONTES DIFERENTES (ex: Ciclo Atual vs Novo Edital).
4. Ignore a similaridade interna de nomes.`;

    const { data, error } = await supabase.functions.invoke('ai-handler', {
      body: { 
        action: 'generateContent', 
        prompt: enhancedPrompt.replace('$SUBJECTS$', JSON.stringify(subjectList)),
        model: 'gemini-2.5-flash'
      },
    });

    if (error || !data?.success) {
      console.error(`[IA] Erro na Edge Function (Módulo 2):`, error || data?.error);
      return { results: [], status: 'error' };
    }

    const text = (data.text || '');

    try {
      const parsed = extractJsonFromText(text) as Array<{ subjectIds?: string[]; suggestedName?: string; reason?: string }>;
      const results = normalizeAIResponse(
        parsed, 
        [
          ...virtualGroups.map(v => ({ id: v.id, name: v.name })), 
          ...allUnmatched.map(s => ({ id: s.id, name: s.name, edital_id: s.edital_id }))
        ], 
        virtualGroups
      );
      console.log(`[IA] Unificacão semântica concluída: ${results.length} sugestões.`);
      return { results, status: 'success' };
    } catch (parseErr) {
      console.error(`[IA] Erro ao parsear JSON das matérias:`, parseErr);
      return { results: [], status: 'error' };
    }
  } catch (err) {
    console.error(`[IA] Erro ao processar unificação semântica de matérias:`, err);
    return { results: [], status: 'error' };
  }
}

export interface FullTopicMergeResult {
  subjectName: string;
  groups: {
    suggestedTopicName: string;
    originalTopicsToMerge: string[];
    originalTopicIds: string[];
  }[];
  preview: {
    name: string;
    isUnified: boolean;
    ids: string[];
  }[];
}

interface AIGroupMergeResult {
  subjectIds: string[];
  suggestedName: string;
  reason?: string;
}

function normalizeAIResponse(
  raw: Array<{ subjectIds?: string[]; originalTopicIds?: string[]; originalTopicsToMerge?: string[]; suggestedName?: string; reason?: string }>, 
  subjects: { id: string; name: string; edital_id?: string | null }[], 
  vGroups: { id: string; realSubjectIds: string[] }[]
): AIGroupMergeResult[] {
  if (!Array.isArray(raw)) return [];
  const vgMap = new Map(vGroups.map(vg => [vg.id, vg]));
  
  return raw.map(item => {
    const rawIds = item.subjectIds || item.originalTopicIds || item.originalTopicsToMerge || [];
    const ids = rawIds.flatMap((id: string) => vgMap.get(id)?.realSubjectIds || [id]);
    const name = item.suggestedName || subjects.find(s => ids.includes(s.id))?.name || 'Unificada';
    
    // REGRA DE OURO: Validar se as fontes são realmente diferentes
    const sourceIds = new Set<string>();
    ids.forEach(id => {
      const s = subjects.find(sub => sub.id === id);
      if (s?.edital_id) sourceIds.add(s.edital_id);
      else sourceIds.add('ciclo'); // Fallback para ciclo se não tiver edital_id
    });

    // Só permite se houver pelo menos 2 fontes diferentes 
    // E JAMAIS permite se houver mais de uma matéria da mesma fonte no mesmo grupo
    if (sourceIds.size < 2 || ids.length !== sourceIds.size) return null;

    return { subjectIds: ids, suggestedName: name, reason: item.reason } as AIGroupMergeResult;
  }).filter((r): r is AIGroupMergeResult => r !== null && r.subjectIds.length >= 2);
}

// ============================================
// ETAPA 1 ORCHESTRATOR
// ============================================

export interface MergeProgress {
  message: string;
  current?: number;
  total?: number;
  percentage?: number;
}

export async function performHybridMerge(
  existingSubjects: Subject[],
  newSubjects: Subject[],
  existingEditalIds: string[],
  newEditalId: string,
  existingMerges: Array<{ primary_subject_id: string, source_edital_ids: string[] }> = [], // Estritamente tipado
  onPhaseChange?: (phase: 'exact' | 'ai') => void,
  onProgress?: (progress: MergeProgress) => void
): Promise<HybridMergeResult> {
  try {
    onPhaseChange?.('exact');
    onProgress?.({ message: 'Identificando matérias idênticas...', percentage: 20 });
    const exactResult = performExactMerge(existingSubjects, newSubjects);
    
    onPhaseChange?.('ai');
    onProgress?.({ message: 'Analisando equivalências semânticas...' });
    const { results: semanticResults, status: aiStatus } = await performSemanticMerge(exactResult.matched, exactResult.unmatchedExisting, exactResult.unmatchedNew);

    const unificationMap = buildUnificationMap(
      exactResult, 
      semanticResults, 
      existingSubjects, 
      newSubjects, 
      [...new Set([...existingEditalIds, newEditalId])],
      existingMerges
    );
    
    // Deduplicar finalSubjectIds baseada no mapa de unificação
    const finalSet = new Set<string>();
    // Adiciona os IDs primários de cada grupo unificado
    unificationMap.unifiedSubjects.forEach(u => {
      if (u.originalSubjectIds.length > 0) {
        finalSet.add(u.originalSubjectIds[0]);
      }
    });
    // Adiciona as matérias que ficaram sozinhas (standalones)
    unificationMap.standaloneSubjectIds.forEach(id => finalSet.add(id));
    
    const finalSubjectIds = Array.from(finalSet);

    return { 
      unificationMap, 
      finalSubjectIds, 
      stats: { 
        exactMatches: exactResult.matched.length, 
        semanticMatches: semanticResults.length, 
        standaloneSubjects: unificationMap.standaloneSubjectIds.length,
        totalSubjectsInCycle: finalSubjectIds.length,
        aiStatus,
        aiWarning: aiStatus === 'error'
          ? 'A IA não conseguiu analisar equivalências entre matérias. Mantivemos apenas unificações seguras por nomes idênticos.'
          : undefined,
      } 
    };
  } catch (err) {
    console.error(`[Mesclagem] Erro crítico na unificação híbrida de matérias:`, err);
    // Retorno de fallback seguro em caso de erro catastrófico
    const allSubjectIds = [...new Set([...existingSubjects.map(s => s.id), ...newSubjects.map(s => s.id)])];
    return {
      unificationMap: {
        version: 1, editalIds: [...new Set([...existingEditalIds, newEditalId])],
        unifiedSubjects: [], createdAt: new Date().toISOString(), standaloneSubjectIds: allSubjectIds
      },
      finalSubjectIds: allSubjectIds,
      stats: {
        exactMatches: 0,
        semanticMatches: 0,
        standaloneSubjects: allSubjectIds.length,
        totalSubjectsInCycle: allSubjectIds.length,
        aiStatus: 'error',
        aiWarning: 'A preparação inteligente falhou. Mantivemos o ciclo seguro, sem apagar matérias nem tópicos.',
      }
    };
  }
}

function buildUnificationMap(
  exact: ExactMatchResult, 
  semantic: AIGroupMergeResult[], 
  existing: Subject[], 
  newSubs: Subject[], 
  editalIds: string[],
  existingMerges: Array<{ primary_subject_id: string, source_edital_ids: string[] }> = []
): CycleUnificationMap {
  const all = [...existing, ...newSubs];
  const unified: UnifiedSubjectMapping[] = [];
  const usedIds = new Set<string>();

  // Auxiliar para pegar editais de um conjunto de IDs de matérias, incluindo herança de merges anteriores
  const getSourceEditalIds = (ids: string[]) => {
    const idsSet = new Set<string>();
    ids.forEach(id => {
      // 1. Edital direto da matéria
      const s = all.find(sub => sub.id === id);
      if (s?.edital_id) idsSet.add(s.edital_id);
      
      // 2. Herança de merges existentes (essencial para não perder badges como TJES)
      const prevMerge = existingMerges.find(m => m.primary_subject_id === id);
      if (prevMerge && Array.isArray(prevMerge.source_edital_ids)) {
        prevMerge.source_edital_ids.forEach((eid: string) => idsSet.add(eid));
      }
    });
    return Array.from(idsSet);
  };

  for (const m of exact.matched) {
    const ids = m.subjects.map(s => s.id);
    unified.push({ 
      displayName: m.groupName, 
      originalSubjectIds: ids, 
      sourceEditalIds: getSourceEditalIds(ids),
      topicMappings: [], 
      matchType: 'exact' 
    });
    ids.forEach(id => usedIds.add(id));
  }

  for (const s of semantic) {
    const fresh = s.subjectIds.filter(id => !usedIds.has(id));
    if (fresh.length === 0) continue;
    const overlapId = s.subjectIds.find(id => usedIds.has(id));
    if (overlapId) {
      const g = unified.find(u => u.originalSubjectIds.includes(overlapId));
      if (g) {
        // Validação crucial: Só permite anexar se não causar conflito de fonte
        const tentativeIds = [...g.originalSubjectIds, ...fresh];
        const sourceIds = getSourceEditalIds(tentativeIds);
        
        if (tentativeIds.length === sourceIds.length) {
          g.originalSubjectIds.push(...fresh);
          g.sourceEditalIds = sourceIds;
          g.matchType = 'semantic';
          if (s.suggestedName) g.displayName = s.suggestedName;
          fresh.forEach(id => usedIds.add(id));
          continue;
        } else {
          console.warn('[Merge] Bloqueada unificação transitiva por conflito de fonte para:', s.suggestedName);
        }
      }
    }
    unified.push({ 
      displayName: s.suggestedName, 
      originalSubjectIds: s.subjectIds, 
      sourceEditalIds: getSourceEditalIds(s.subjectIds),
      topicMappings: [], 
      matchType: 'semantic' 
    });
    s.subjectIds.forEach(id => usedIds.add(id));
  }

  return {
    version: 1, 
    editalIds, 
    unifiedSubjects: unified, 
    createdAt: new Date().toISOString(),
    standaloneSubjectIds: all.map(s => s.id).filter(id => !usedIds.has(id))
  };
}

// ============================================
// ETAPA 2: TOPIC MERGE (Processamento Sequencial por Matéria)
// ============================================

async function performTopicGroupingAI(
  subjectName: string, 
  topics: Topic[]
): Promise<UnifiedTopicMapping[]> {
  if (topics.length < 2) return [];

  const topicList = topics.map((t) => `- [ID:${t.id}] [EDID:${t.edital_id || 'ciclo'}] ${t.name}`).join('\n');

  const { data: config } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'ai_topic_grouping_prompt')
    .single();

  const basePrompt = (typeof config?.value === 'string') ? config.value : `Analise os tópicos abaixo da matéria "{{subject}}" e identifique quais são equivalentes. 
REGRAS: 
1. JAMAIS mescle tópicos que tenham o mesmo EDID (mesmo edital).
2. Agrupe apenas tópicos de FONTES DIFERENTES que tratem do mesmo assunto.
3. Se o edital original repete um assunto, MANTENHA-OS SEPARADOS.
Retorne um JSON no formato: { "groups": [ { "originalTopicsToMerge": ["ID1", "ID2"], "suggestedName": "Nome Unificado", "reason": "Motivo" } ] }`;

  const fullPrompt = basePrompt.replace('{{subject}}', subjectName) + `\n\nLista de Tópicos:\n${topicList}`;

  const { data, error } = await supabase.functions.invoke('ai-handler', {
    body: {
      action: 'generateContent',
      prompt: fullPrompt,
      model: 'gemini-2.5-flash'
    },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Erro desconhecido na Edge Function');

  const text = (data.text || '');

  interface AITopicGroup {
    originalTopicIds?: string[];
    originalTopicsToMerge?: string[];
    suggestedName?: string;
    suggestedTopicName?: string;
  }

  const parsed = extractJsonFromText(text) as { groups: AITopicGroup[] } | null;

  if (!parsed || !parsed.groups || !Array.isArray(parsed.groups)) return [];

  const mappings: UnifiedTopicMapping[] = [];
  const usedTopicIds = new Set<string>();

  for (const group of parsed.groups) {
    const originalIds = group.originalTopicIds || group.originalTopicsToMerge || [];
    const suggestedName = group.suggestedName || group.suggestedTopicName;

    if (!originalIds.length || !suggestedName) continue;

    // Filtrar IDs que realmente pertencem a esta matéria e não foram usados
    const matchingTopics = topics.filter(t => originalIds.includes(t.id) && !usedTopicIds.has(t.id));

    // Só criar mapeamento se houver pelo menos 2 tópicos para mesclar
    if (matchingTopics.length >= 2) {
      const topicNames = matchingTopics.map(t => t.name);
      if (!isSafeSemanticTopicMerge(topicNames)) {
        continue;
      }

      const sourceEditalIds = Array.from(new Set(matchingTopics.map(t => t.edital_id).filter(Boolean))) as string[];
      mappings.push({
        displayName: suggestedName,
        originalTopicIds: matchingTopics.map(t => t.id),
        originalSubjectIds: [...new Set(matchingTopics.map(t => t.subject_id))],
        sourceEditalIds,
        matchType: 'semantic'
      });
      matchingTopics.forEach(t => usedTopicIds.add(t.id));
    }
  }

  return mappings;
}

export async function performFullTopicMerge(
  unificationMap: CycleUnificationMap, 
  allSubjects: Subject[], 
  useAI: boolean,
  userId?: string,
  cycleId?: string,
  onProgress?: (progress: MergeProgress) => void,
  onPhaseChange?: (phase: 'exact' | 'ai') => void
): Promise<TopicMergePhaseResult> {
  const groups: TopicGroupResult[] = [];
  let overallAiError = false;
  let aiErrorGroupCount = 0;
  
  onPhaseChange?.('exact');
  const pendingAISuggestions: Array<{
    suggestionType: 'subject' | 'topic';
    originalNames: string[];
    suggestedName: string;
    originalIds?: string[];
  }> = [];

  for (let i = 0; i < unificationMap.unifiedSubjects.length; i++) {
    const unified = unificationMap.unifiedSubjects[i];
    if (onProgress) {
      const current = i + 1;
      const total = unificationMap.unifiedSubjects.length;
      const percentage = Math.round((current / total) * 100);
      onProgress({
        message: total > 1
          ? `Processando grupos de tópicos (${current} de ${total})...`
          : 'Processando tópicos equivalentes...',
        current,
        total,
        percentage
      });
    }
    
    const allTopicsForThisSubject = unified.originalSubjectIds.flatMap(id => {
      const sub = allSubjects.find(s => s.id === id);
      return sub?.topics || [];
    });

    // Filtro inicial para evitar IDs duplicados se o backend retornar dados redundantes
    const uniqueTopics = Array.from(new Map(allTopicsForThisSubject.map(t => [t.id, t])).values());

    // Módulo 1: Normalização e Mesclagem Automática (Exata)
    const normMap = new Map<string, Topic[]>();
    for (const t of uniqueTopics) {
      const norm = normalizeText(t.name);
      const list = normMap.get(norm) ?? [];
      list.push(t);
      normMap.set(norm, list);
    }

    const exactMappings: UnifiedTopicMapping[] = [];
    const unmatchedTopics: Topic[] = [];
    const usedIds = new Set<string>();

    for (const [norm, items] of normMap.entries()) {
      // REGRA DE OURO: Só mescla se os tópicos vierem de editais DIFERENTES
      const uniqueEditalIds = new Set(items.map(i => i.edital_id).filter(Boolean));
      
      if (uniqueEditalIds.size >= 2) {
        exactMappings.push({
          displayName: items[0].name, 
          originalTopicIds: items.map(i => i.id),
          originalSubjectIds: Array.from(new Set(items.map(i => i.subject_id))),
          sourceEditalIds: Array.from(new Set(items.map(i => i.edital_id).filter(Boolean) as string[])),
          matchType: 'exact'
        });
        items.forEach(i => usedIds.add(i.id));
      } else {
        unmatchedTopics.push(...items);
      }
    }

    // Módulo 2: Motor de Sugestões (IA por Matéria)
    const aiMappings: UnifiedTopicMapping[] = [];
    let aiStatus: 'success' | 'error' | 'skipped' = 'skipped';

    if (useAI && unmatchedTopics.length >= 2) {
      try {
        onPhaseChange?.('ai');
        const aiResults = await performTopicGroupingAI(unified.displayName, unmatchedTopics);
        aiStatus = 'success';
        
        const usedInAI = new Set<string>();
        aiResults.forEach(m => {
          aiMappings.push(m);
          m.originalTopicIds.forEach(id => usedInAI.add(id));
          
          pendingAISuggestions.push({
            suggestionType: 'topic',
            originalNames: m.originalTopicIds.map(id => unmatchedTopics.find(t => t.id === id)?.name || id),
            suggestedName: m.displayName,
            originalIds: m.originalTopicIds,
          });
        });

        // Tópicos que sobraram (essencial para manter o edital verticalizado)
        unmatchedTopics.forEach(t => {
          if (!usedInAI.has(t.id)) {
            aiMappings.push({
              displayName: t.name,
              originalTopicIds: [t.id],
              originalSubjectIds: [t.subject_id],
              sourceEditalIds: t.edital_id ? [t.edital_id] : [],
              matchType: 'exact'
            });
          }
        });
      } catch (err) {
        console.warn(`[IA] Agrupamento por IA indisponível para ${unified.displayName}. Usando fallback determinístico.`, err);
        aiStatus = 'error';
        overallAiError = true;
        aiErrorGroupCount += 1;
        // Fallback: Standalone
        unmatchedTopics.forEach(t => {
          aiMappings.push({
            displayName: t.name,
            originalTopicIds: [t.id],
            originalSubjectIds: [t.subject_id],
            sourceEditalIds: t.edital_id ? [t.edital_id] : [],
            matchType: 'exact'
          });
        });
      }
    } else {
      unmatchedTopics.forEach(t => {
        aiMappings.push({
          displayName: t.name,
          originalTopicIds: [t.id],
          originalSubjectIds: [t.subject_id],
          sourceEditalIds: t.edital_id ? [t.edital_id] : [],
          matchType: 'exact'
        });
      });
    }

    groups.push({ 
      subjectDisplayName: unified.displayName, 
      originalSubjectIds: unified.originalSubjectIds, 
      topicMappings: [...exactMappings, ...aiMappings].sort((a, b) => {
        const tA = allSubjects.flatMap(s => s.topics || []).find(t => t.id === a.originalTopicIds[0]);
        const tB = allSubjects.flatMap(s => s.topics || []).find(t => t.id === b.originalTopicIds[0]);
        return (tA?.position ?? 0) - (tB?.position ?? 0);
      }),
      aiUsed: useAI, 
      aiStatus 
    });
  }

  // Standalone subjects pass-through
  for (const sid of unificationMap.standaloneSubjectIds) {
    const sub = allSubjects.find(s => s.id === sid);
    if (!sub || groups.some(g => g.originalSubjectIds.includes(sid))) continue;
    groups.push({
      subjectDisplayName: sub.name, 
      originalSubjectIds: [sid],
      topicMappings: (sub.topics || []).map(t => ({ 
        displayName: t.name, 
        originalTopicIds: [t.id], 
        originalSubjectIds: [sid], 
        sourceEditalIds: t.edital_id ? [t.edital_id] : [],
        matchType: 'exact' 
      })),
      aiUsed: false, aiStatus: 'skipped'
    });
  }

  if (userId) {
    try {
      // Sempre limpamos as sugestões pendentes dessa sessão antes de salvar novas,
      // garantindo que não teremos duplicidades por navegação vai-e-volta no modal.
      await discardPendingMergeSuggestions(userId);
      
      if (pendingAISuggestions.length > 0) {
        await savePendingMergeSuggestions(userId, cycleId || null, pendingAISuggestions);
      }
    } catch (err) {
      console.error('[PendingSuggestions] Erro ao atualizar:', err);
    }
  }

  const overallAiStatus = overallAiError ? 'error' : (groups.some(g => g.aiUsed) ? 'success' : 'skipped');

  return {
    groups,
    overallAiStatus,
    aiWarning: overallAiError
      ? `A IA não conseguiu analisar tópicos em ${aiErrorGroupCount} ${aiErrorGroupCount === 1 ? 'matéria' : 'matérias'}. Mantivemos a mesclagem segura apenas por nomes idênticos.`
      : undefined,
  };
}

export function applyTopicMergeToMap(unificationMap: CycleUnificationMap, result: TopicMergePhaseResult): CycleUnificationMap {
  const updated = unificationMap.unifiedSubjects.map(u => {
    // Ordenar os IDs para garantir que a comparação ignore a ordem dos elementos
    const sortedUSubIds = [...u.originalSubjectIds].sort().join(',');
    const res = result.groups.find(g => {
        const sortedGSubIds = [...g.originalSubjectIds].sort().join(',');
        return sortedGSubIds === sortedUSubIds;
    });
    return res ? { ...u, topicMappings: res.topicMappings } : u;
  });
  return { ...unificationMap, unifiedSubjects: updated };
}

// ============================================
// PERSISTENCE & UI
// ============================================

export async function saveUnificationMap(userId: string, unificationMap: CycleUnificationMap): Promise<void> {
  // Disabling DB save for unification_map - now handled dynamically in frontend
}

export async function loadUnificationMap(userId: string): Promise<CycleUnificationMap | null> {
  // Always return null to force dynamic rebuild from merges table
  return null;
}

export async function persistPhysicalSoftMerge(unificationMap: CycleUnificationMap): Promise<void> {
  // IMPORTANTE: A tabela 'topics' é GLOBAL (sem user_id).
  // NÃO alteramos is_hidden ou parent_topic_id para evitar afetar outros usuários.
  // A lógica de visualização deve usar APENAS o unification_map para determinar
  // quais tópicos mostrar/ocultar.
  
  // Se precisar de uma tabela por-usuário para is_hidden, seria necessário criar uma nova tabela.
}

export function findSiblingTopicIds(completedTopicId: string, map: CycleUnificationMap | null): string[] {
  return getExplicitSiblingTopicIds(completedTopicId, buildTopicEquivalenceGroups({ unificationMap: map }));
}

export async function registerDualProgress(id: string, data: Partial<Topic>, map: CycleUnificationMap | null): Promise<void> {
  const siblings = new Set(findSiblingTopicIds(id, map));
  if (siblings.size === 0) return;

  // Propagar tanto dados SRS quanto dados de estudo (notas, dificuldade, subtópicos)
  const updatePayload: Record<string, unknown> = {};

  // Campos SRS (progresso de revisão)
  if (data.review_count !== undefined) updatePayload.review_count = data.review_count;
  if (data.next_review !== undefined) updatePayload.next_review = data.next_review;
  if (data.review_stage !== undefined) updatePayload.review_stage = data.review_stage;
  if (data.completed !== undefined) updatePayload.completed = data.completed;
  if (data.last_reviewed_at !== undefined) updatePayload.last_reviewed_at = data.last_reviewed_at;
  if (data.memory_stability !== undefined) updatePayload.memory_stability = data.memory_stability;
  if (data.current_interval !== undefined) updatePayload.current_interval = data.current_interval;

  // Campos de dados de estudo (propagação profunda v2.2)
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.difficulty_level !== undefined) updatePayload.difficulty_level = data.difficulty_level;
  if (data.difficulty_set_at !== undefined) updatePayload.difficulty_set_at = data.difficulty_set_at;
  if (data.subtopics !== undefined) updatePayload.subtopics = data.subtopics;

  if (Object.keys(updatePayload).length === 0) return;

  for (const sid of siblings) {
    await supabase.from('topics').update(updatePayload).eq('id', sid);
  }
}

export function findSiblingSubjectIds(subjectId: string, map: CycleUnificationMap | null): string[] {
  if (!map || !Array.isArray(map.unifiedSubjects)) return [];
  for (const u of map.unifiedSubjects) {
    if (u.originalSubjectIds.includes(subjectId)) {
      return u.originalSubjectIds.filter(id => id !== subjectId);
    }
  }
  return [];
}

export async function registerSubjectDualProgress(subjectId: string, data: Partial<Subject>, map: CycleUnificationMap | null): Promise<void> {
  const siblings = findSiblingSubjectIds(subjectId, map);
  if (siblings.length === 0) return;

  const updatePayload: Record<string, unknown> = {};
  if (data.notes !== undefined) updatePayload.notes = data.notes;

  if (Object.keys(updatePayload).length === 0) return;

  for (const sid of siblings) {
    await supabase.from('subjects').update(updatePayload).eq('id', sid);
  }
}

export function getUnifiedSubjectId(originalId: string, map: CycleUnificationMap | null): string {
  if (!map) return originalId;
  const u = map.unifiedSubjects.find(sub => sub.originalSubjectIds.includes(originalId));
  return u ? u.originalSubjectIds[0] : originalId;
}

function normalizeCycleTopicName(name: string): string {
  return name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function chooseCycleTopicRepresentative(current: Topic, candidate: Topic): Topic {
  const currentCompleted = isReviewProgramCompleted(current);
  const candidateCompleted = isReviewProgramCompleted(candidate);

  if (currentCompleted !== candidateCompleted) {
    return candidateCompleted ? candidate : current;
  }

  const currentContactCount = Math.max(current.reviewCount || 0, current.review_count || 0);
  const candidateContactCount = Math.max(candidate.reviewCount || 0, candidate.review_count || 0);
  if (currentContactCount !== candidateContactCount) {
    return candidateContactCount > currentContactCount ? candidate : current;
  }

  const currentNextReview = current.next_review ? new Date(current.next_review).getTime() : Number.POSITIVE_INFINITY;
  const candidateNextReview = candidate.next_review ? new Date(candidate.next_review).getTime() : Number.POSITIVE_INFINITY;
  if (currentNextReview !== candidateNextReview) {
    return candidateNextReview < currentNextReview ? candidate : current;
  }

  const currentLastReview = current.last_reviewed_at ? new Date(current.last_reviewed_at).getTime() : 0;
  const candidateLastReview = candidate.last_reviewed_at ? new Date(candidate.last_reviewed_at).getTime() : 0;
  return candidateLastReview > currentLastReview ? candidate : current;
}

function dedupeUnifiedCycleTopics(topics: Topic[]): Topic[] {
  const order: string[] = [];
  const topicByName = new Map<string, Topic>();

  for (const topic of topics) {
    const key = normalizeCycleTopicName(topic.name);
    const current = topicByName.get(key);

    if (!current) {
      order.push(key);
      topicByName.set(key, topic);
      continue;
    }

    const representative = chooseCycleTopicRepresentative(current, topic);
    topicByName.set(key, {
      ...representative,
      name: current.name,
      is_hidden: false,
    });
  }

  return order.map(key => topicByName.get(key)).filter((topic): topic is Topic => Boolean(topic));
}

export function applyUnificationMap(subjects: Subject[], map: CycleUnificationMap | null): Subject[] {
  if (!map) return subjects;
  const result: Subject[] = [];
  const usedSubIds = new Set<string>();

  for (const u of map.unifiedSubjects) {
    const originalSubjects = subjects.filter(s => u.originalSubjectIds.includes(s.id));
    if (originalSubjects.length === 0) continue;

    // Prevenir que um assunto já processado em outro grupo de unificação seja duplicado
    const validOriginalSubjects = originalSubjects.filter(s => !usedSubIds.has(s.id));
    if (validOriginalSubjects.length === 0) {
      console.warn('[applyUnificationMap] Assunto já processado em outro grupo de unificação:', u.displayName);
      continue;
    }

    const primarySub = validOriginalSubjects[0];
    const virtualTopics: Topic[] = [];
    const usedTids = new Set<string>();

    // Debug: Verifica se todas as matérias originais mapeadas chegaram para processamento
    if (u.originalSubjectIds.length > originalSubjects.length) {
      console.warn(`[applyUnificationMap] Matérias incompletas para "${u.displayName}". Recebidas ${originalSubjects.length} de ${u.originalSubjectIds.length}. Tópicos secundários podem sumir.`);
    }

    if (u.topicMappings && u.topicMappings.length > 0) {
      for (const tm of u.topicMappings) {
        tm.originalTopicIds.forEach(id => usedTids.add(id));
        
        let sourceTopic: Topic | undefined;
        for (const os of originalSubjects) {
          const found = os.topics?.find(t => tm.originalTopicIds.includes(t.id));
          if (found) {
            sourceTopic = found;
            break;
          }
        }
        
        if (sourceTopic && tm.originalTopicIds.length > 0) {
          // Grant visibility for the virtual/canonical topic entry
          // Use the first ID as the canon ID
          virtualTopics.push({ ...sourceTopic, id: tm.originalTopicIds[0], name: tm.displayName, is_hidden: false });
        } else if (tm.originalTopicIds.length > 0) {
          // Fallback: If source topic is missing (likely due to edital removal),
          // allow individual original topics to be picked up by the fallback logic below
          tm.originalTopicIds.forEach(id => usedTids.delete(id));
        }
      }
    }

    originalSubjects.forEach(sub => {
      if (sub.topics && sub.topics.length > 0) {
        sub.topics.forEach(t => {
          if (!usedTids.has(t.id)) {
            virtualTopics.push({ ...t, is_hidden: false });
            usedTids.add(t.id);
          }
        });
      }
    });

    result.push({ ...primarySub, name: u.displayName, topics: dedupeUnifiedCycleTopics(virtualTopics) });
    u.originalSubjectIds.forEach(id => usedSubIds.add(id));
  }
  
  subjects.forEach(s => { if (!usedSubIds.has(s.id)) result.push(s); });
  return result;
}

export function getCanonicalSubjectName(id: string, name: string, map?: CycleUnificationMap | null): string {
  if (!map) return name;
  const u = map.unifiedSubjects.find(sub => sub.originalSubjectIds.includes(id));
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
    default:
      return '';
  }
}

// ============================================
// PENDING MERGE SUGGESTIONS (Módulo 2 e 3)
// ============================================

export interface PendingSuggestion {
  id: string;
  user_id: string;
  cycle_id: string | null;
  suggestion_type: 'subject' | 'topic';
  original_names: string[] | Json;
  suggested_name: string;
  status: 'pending' | 'approved' | 'rejected';
  original_ids: string[] | Json | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
}

export async function savePendingMergeSuggestions(
  userId: string,
  cycleId: string | null,
  suggestions: Array<{
    suggestionType: 'subject' | 'topic';
    originalNames: string[];
    suggestedName: string;
    originalIds?: string[];
  }>
): Promise<void> {
  if (!suggestions.length) return;

  const records = suggestions.map(s => ({
    user_id: userId,
    cycle_id: cycleId,
    suggestion_type: s.suggestionType,
    original_names: s.originalNames,
    suggested_name: s.suggestedName,
    original_ids: s.originalIds || null,
    status: 'pending' as const,
  }));

  const { error } = await supabase
    .from('pending_merge_suggestions')
    .upsert(records, { onConflict: 'user_id,cycle_id,suggestion_type,original_names' });

  if (error) {
    console.error('[PendingSuggestions] Erro ao salvar:', error);
    throw error;
  }
}

export async function fetchPendingMergeSuggestions(
  userId: string,
  cycleId?: string
): Promise<PendingSuggestion[]> {
  let query = supabase
    .from('pending_merge_suggestions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (cycleId) {
    query = query.eq('cycle_id', cycleId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[PendingSuggestions] Erro ao buscar:', error);
    throw error;
  }

  const suggestions = (data || []).map(item => ({
    ...item,
    suggestion_type: item.suggestion_type as 'subject' | 'topic',
    status: item.status as 'pending' | 'approved' | 'rejected'
  })) as PendingSuggestion[];

  // Validação de referências órfãs vinculadas a editais deletados
  if (suggestions.length === 0) return [];

  try {
    // Busca todos os IDs de matérias e tópicos existentes do usuário
    const { data: subjectsData } = await supabase.from('subjects').select('id').eq('user_id', userId);
    const activeSubjectIds = new Set((subjectsData || []).map(s => s.id));
    
    let activeTopicIds = new Set<string>();
    if (activeSubjectIds.size > 0) {
      const { data: topicsData } = await supabase
        .from('topics')
        .select('id')
        .in('subject_id', Array.from(activeSubjectIds));
      activeTopicIds = new Set((topicsData || []).map(t => t.id));
    }

    // Filtra sugestões que tenham pelo menos 2 IDs originais válidos
    return suggestions.filter(s => {
      const originalIds = (s.original_ids as string[] || []);
      const activeIds = s.suggestion_type === 'subject' ? activeSubjectIds : activeTopicIds;
      const validIds = originalIds.filter(id => activeIds.has(id));
      
      // Uma sugestão só faz sentido se houver pelo menos 2 itens para unificar
      return validIds.length >= 2;
    });
  } catch (err) {
    console.error('[PendingSuggestions] Erro na validação de órfãos:', err);
    return suggestions; // Fallback para não quebrar a UI se a validação falhar
  }
}

export async function updateSuggestionStatus(
  suggestionId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('pending_merge_suggestions')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (error) {
    console.error('[PendingSuggestions] Erro ao atualizar status:', error);
    throw error;
  }
}

export async function approveSuggestionAndMerge(
  suggestion: PendingSuggestion,
  primaryId: string,
  secondaryIds: string[]
): Promise<void> {
  if (suggestion.suggestion_type === 'topic') {
    // Buscar ou criar o registro de TopicMerge para representar esta unificação
    const allIds = [primaryId, ...secondaryIds];
    const { data: subjectMerge } = await supabase
      .from('subject_merges')
      .select('id')
      .eq('user_id', suggestion.user_id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    const newMerge = await mergeService.createTopicMerge({
      user_id: suggestion.user_id,
      cycle_id: suggestion.cycle_id,
      subject_merge_id: subjectMerge?.id || null,
      primary_topic_id: primaryId,
      merged_topic_ids: secondaryIds,
      display_name: suggestion.suggested_name,
      match_type: 'semantic',
      created_by_ai: true,
      source_edital_ids: []
    });

    // A sincronização de parent_topic_id já ocorre dentro do createTopicMerge
  }

  await updateSuggestionStatus(suggestion.id, 'approved');
}

/**
 * Remove todas as sugestões pendentes de um usuário.
 * Útil ao deletar editais ou resetar o ciclo para evitar sugestões órfãs.
 */
export async function discardPendingMergeSuggestions(userId: string): Promise<void> {
  const { error } = await supabase
    .from('pending_merge_suggestions')
    .delete()
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) {
    console.error('[PendingSuggestions] Erro ao descartar sugestões:', error);
    throw error;
  }
}
