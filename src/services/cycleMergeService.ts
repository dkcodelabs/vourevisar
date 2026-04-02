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
 * Original subjects/topics remain untouched in the database.
 * Progress is tracked against original topic IDs.
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

/** 
 * Prefixes commonly used in Brazilian public exams that are semantically meaningless
 * for the purposes of subject matching.
 */
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
 * Normalize a name for exact comparison:
 * lowercase, trim, remove accents, remove special chars,
 * and strip common Brazilian exam prefixes.
 */
function normalizeName(name: string): string {
  if (!name) return '';
  let normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .trim()
    // Remove punctuation and symbols, keeping letters, numbers, spaces
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ');

  // Strip common meaningless prefixes (in order of longest first to avoid partial strips)
  for (const prefix of COMMON_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length).trim();
      break; // Only strip one prefix
    }
  }

  return normalized;
}

/** Basic lexical similarity score based on shared words (Jaccard-like) */
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
// PROMPTS
// ============================================

/**
 * Default subject merge prompt — flat-list format, optimized for Brazilian public exams.
 * Uses $SUBJECTS$ placeholder filled with the full list of unmatched subjects + topics.
 * Returns groups (not pairs), allowing the AI to reason over the entire set at once.
 * Also handles legacy prompts with {CANDIDATES_JSON} placeholder (backward-compatible).
 */
const DEFAULT_MERGE_PROMPT = `Você é um especialista em editais de concursos públicos brasileiros e processamento de dados acadêmicos.

Sua tarefa é analisar uma lista de disciplinas e identificar aquelas que tratam do MESMO CONTEÚDO, agrupando-as para evitar duplicidade no ciclo de estudos do aluno.

### REGRAS DE OURO PARA MESCLA:
1. IGNORAR VARIAÇÕES LÉXICAS: "Português", "Língua Portuguesa", "Linguagens" e "Gramática e Texto" devem ser UNIFICADOS.
2. IGNORAR PREFIXOS DE IMPORTÂNCIA: "Noções de Direito...", "Direito... Avançado", "Fundamentos de..." devem ser unificados à disciplina principal (ex: Direito Administrativo).
3. AFINIDADE SEMÂNTICA: Se os tópicos das duas matérias forem parecidos, unifique mesmo que os nomes sejam diferentes. Ex: "Raciocínio Lógico" e "Lógica Matemática" podem ser unificados se compartilharem tópicos.
4. NORMALIZAÇÃO PRÉVIA (faça internamente antes de decidir): Remova as palavras "Noções", "Fundamentos", "Língua", "Disciplina", acentos e maiúsculas. Compare apenas o que sobrar.
5. Em caso de dúvida, unifique (probabilidade mínima de 80% de o conteúdo ser o mesmo).
6. NÃO unifique matérias de áreas claramente distintas: "Direito Administrativo" ≠ "Direito Constitucional". "Português" ≠ "Inglês".

### DADOS DE ENTRADA (MATÉRIAS):
$SUBJECTS$

### INSTRUÇÃO DE SAÍDA:
Retorne APENAS um JSON no formato abaixo. Se não houver o que mesclar, retorne [].
[
  {
    "subjectIds": ["id_original_1", "id_original_2"],
    "suggestedName": "Nome Mais Abrangente e Comum",
    "reason": "Explicação curta do porquê da mesclagem"
  }
]`;

/**
 * Default topic merge prompt — for Step D (topic-level semantic matching).
 */
const DEFAULT_TOPIC_MERGE_PROMPT = `Você é um especialista em concursos públicos brasileiros.

Dentro de uma mesma matéria unificada, analise pares de TÓPICOS de dois editais diferentes e identifique quais são EQUIVALENTES.

CRITÉRIOS:
1. Dois tópicos são equivalentes se abordam o MESMO conteúdo específico dentro da matéria.
2. IGNORE diferenças de maiúscula/minúscula, acentuação e prefixos simples.
3. "Interpretação de Texto" = "Interpretação Textual" = "Compreensão de Texto"
4. Em caso de dúvida moderada, prefira marcar como equivalente (confidence 0.6-0.7).
5. Não marque como equivalente tópicos com conteúdos claramente distintos.

ENTRADA (JSON):
{CANDIDATES_JSON}

SAÍDA OBRIGATÓRIA (JSON puro, sem markdown):
[
  {
    "topicA_id": "id_topico_A",
    "topicB_id": "id_topico_B",
    "isEquivalent": true,
    "confidence": 0.90,
    "suggestedDisplayName": "Nome unificado sugerido"
  }
]`;

// ============================================
// STEP A: EXACT MERGE
// ============================================

interface ExactMatchResult {
  matched: {
    groupName: string;
    subjects: Subject[];
    hasMultipleSides: boolean; // true = cross-edital match, false = internal dedup
  }[];
  unmatchedExisting: Subject[];
  unmatchedNew: Subject[];
}

/**
 * Performs exact name matching between existing and new subjects.
 * Also deduplicates subjects within the existing cycle that have the same normalized name.
 * Case-insensitive, accent-normalized, trimmed, and prefix-stripped comparison.
 */
export function performExactMerge(
  existingSubjects: Subject[],
  newSubjects: Subject[]
): ExactMatchResult {
  const groups = new Map<string, { subjects: Subject[], containsExisting: boolean, containsNew: boolean }>();

  // Process all subjects into groups by normalized name
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
    const isCrossEditalMatch = g.containsExisting && g.containsNew;
    const isInternalDuplicate = g.subjects.length > 1 && (
      (g.containsExisting && !g.containsNew) || (!g.containsExisting && g.containsNew)
    );

    if (isCrossEditalMatch || isInternalDuplicate) {
      // It's a match group — cross-edital or internal dedup
      matched.push({
        groupName: g.subjects[0].name,
        subjects: g.subjects,
        hasMultipleSides: isCrossEditalMatch,
      });
    } else if (g.containsExisting) {
      unmatchedExisting.push(...g.subjects);
    } else {
      unmatchedNew.push(...g.subjects);
    }
  }

  return {
    matched,
    unmatchedExisting,
    unmatchedNew
  };
}

// ============================================
// STEP B: SEMANTIC MERGE (AI - Subjects)
// ============================================

/**
 * Fetches the AI merge prompt from system_settings.
 * Falls back to the default prompt if not configured.
 */
async function fetchMergePrompt(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'ai_merge_prompt')
      .maybeSingle();

    if (!error && data?.value && typeof data.value === 'string' && data.value.trim().length > 50) {
      return data.value;
    }
  } catch (err) {
    console.warn('⚠️ Falha ao buscar ai_merge_prompt, usando prompt padrão:', err);
  }

  return DEFAULT_MERGE_PROMPT;
}

/**
 * Response format from AI (group-based).
 * The AI receives a flat list of ALL unmatched subjects and returns groups.
 */
interface AIGroupMergeResult {
  subjectIds: string[];
  suggestedName: string;
  reason?: string;
}

/**
 * A virtual subject representation for already-unified exact groups.
 * Used to allow the AI to absorb unmatched subjects into existing groups.
 */
interface VirtualGroupSubject {
  id: string;       // virtual id like "__exact_group_0"
  name: string;
  topics: string;   // joined topic names
  realSubjectIds: string[];  // the actual subject IDs in this group
}

/**
 * Calls the AI via Edge Function to analyze semantic equivalence of subjects.
 *
 * Key design: sends BOTH the already-exact-matched groups (as virtual representatives)
 * AND the remaining unmatched subjects, so the AI can absorb things like
 * "lingua portuguesa" into an existing "Português" group.
 */
async function performSemanticMerge(
  exactGroups: ExactMatchResult['matched'],
  unmatchedExisting: Subject[],
  unmatchedNew: Subject[]
): Promise<{ results: AIGroupMergeResult[], status: 'success' | 'error' | 'timeout' }> {
  const allUnmatched = [...unmatchedExisting, ...unmatchedNew];

  // Need at least one unmatched subject to try merging
  if (allUnmatched.length === 0) {
    console.log('ℹ️ Nenhuma matéria sem match para enviar à IA.');
    return { results: [], status: 'success' };
  }

  try {
    const promptTemplate = await fetchMergePrompt();

    // Build flat list:
    // 1. Virtual representatives for each exact group (the AI can "absorb" unmatched subjects into them)
    const virtualGroups: VirtualGroupSubject[] = exactGroups.map((g, i) => ({
      id: `__exact_group_${i}`,
      name: g.groupName,
      topics: [...new Set(g.subjects.flatMap(s => s.topics.map(t => t.name)))].slice(0, 15).join(', ') || '(sem tópicos)',
      realSubjectIds: g.subjects.map(s => s.id),
    }));

    // 2. Unmatched subjects (both existing and new)
    const unmatchedList = allUnmatched.map(s => ({
      id: s.id,
      name: s.name,
      topics: s.topics.map(t => t.name).slice(0, 15).join(', ') || '(sem tópicos)',
    }));

    // Full list: virtual groups first, then unmatched
    const subjectList = [
      ...virtualGroups.map(vg => ({ id: vg.id, name: vg.name, topics: vg.topics })),
      ...unmatchedList,
    ];

    if (subjectList.length < 2) {
      return { results: [], status: 'success' };
    }

    const subjectsJson = JSON.stringify(subjectList, null, 2);

    const finalPrompt = promptTemplate
      .replace('$SUBJECTS$', subjectsJson)
      .replace('{CANDIDATES_JSON}', subjectsJson);

    const allForValidation: Subject[] = [
      // fake Subject objects with virtual IDs for validation
      ...virtualGroups.map(vg => ({
        id: vg.id,
        name: vg.name,
        topics: [],
      } as unknown as Subject)),
      ...allUnmatched,
    ];

    console.group(`🤖 Chamada IA: Análise Semântica (${subjectList.length} entradas = ${virtualGroups.length} grupos + ${allUnmatched.length} sem match)`);
    console.log('📋 Grupos existentes:', virtualGroups.map(vg => `"${vg.name}" (virtual)`));
    console.log('📋 Sem match:', allUnmatched.map(s => `"${s.name}" [${s.topics.length} tópicos]`));

    const { data, error } = await supabase.functions.invoke('ai-handler', {
      body: {
        action: 'generateContent',
        prompt: finalPrompt,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.05,
        },
      },
    });

    if (error || !data?.success) {
      console.error('❌ Falha na chamada IA (matérias):', error || data?.error);
      console.groupEnd();
      return { results: [], status: 'error' };
    }

    const text = (data.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    console.debug('🤖 Resposta Bruta:', text);
    console.groupEnd();

    const parsed = JSON.parse(text);
    // Expand virtual group IDs → real subject IDs before returning
    const normalized = normalizeAIResponse(parsed, allForValidation, virtualGroups);

    console.log(`✅ IA identificou ${normalized.length} grupos:`, normalized.map(g => `[${g.subjectIds.length}] "${g.suggestedName}"${g.reason ? ' — ' + g.reason : ''}`));
    return { results: normalized, status: 'success' };
  } catch (err) {
    console.error('❌ Erro fatal na mesclagem semântica de matérias:', err);
    console.groupEnd();
    return { results: [], status: 'error' };
  }
}

/**
 * Normalizes raw AI response to AIGroupMergeResult[].
 * Handles:
 * - New format: { subjectIds[], suggestedName, reason }
 * - Legacy format: { subjectA_id, subjectB_id, isEquivalent, confidence, suggestedDisplayName }
 * - Virtual group expansion: __exact_group_N IDs are replaced with real subject IDs
 */
function normalizeAIResponse(
  raw: unknown,
  allSubjects: { id: string; name: string }[],
  virtualGroups: VirtualGroupSubject[] = []
): AIGroupMergeResult[] {
  if (!Array.isArray(raw)) return [];

  const allIds = new Set(allSubjects.map(s => s.id));
  const virtualGroupMap = new Map(virtualGroups.map(vg => [vg.id, vg]));
  const results: AIGroupMergeResult[] = [];

  // Track which virtual groups the AI decided to expand (merge with something)
  const expandedVirtualGroupIds = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;

    let rawIds: string[] = [];
    let suggestedName = '';
    let reason: string | undefined;

    if (Array.isArray(obj.subjectIds)) {
      rawIds = (obj.subjectIds as string[]).filter(id => allIds.has(id));
      suggestedName = (obj.suggestedName as string) || '';
      reason = obj.reason as string | undefined;
    } else if (obj.subjectA_id && obj.subjectB_id) {
      const isEquiv = obj.isEquivalent !== false;
      const confidence = typeof obj.confidence === 'number' ? obj.confidence : 1;
      if (!isEquiv || confidence < 0.6) continue;
      rawIds = ([obj.subjectA_id as string, obj.subjectB_id as string]).filter(id => allIds.has(id));
      suggestedName = (obj.suggestedDisplayName as string) || '';
      reason = `confidence: ${confidence}`;
    }

    if (rawIds.length < 2) continue;

    // Expand any virtual group IDs → real subject IDs
    const expandedIds: string[] = [];
    for (const id of rawIds) {
      const vg = virtualGroupMap.get(id);
      if (vg) {
        expandedIds.push(...vg.realSubjectIds);
        expandedVirtualGroupIds.add(id);
      } else {
        expandedIds.push(id);
      }
    }

    if (!suggestedName) {
      const firstRealId = rawIds.find(id => !virtualGroupMap.has(id));
      suggestedName = allSubjects.find(s => s.id === firstRealId)?.name || 'Matéria Unificada';
    }

    results.push({ subjectIds: [...new Set(expandedIds)], suggestedName, reason });
  }

  return results;
}

// ============================================
// UNIFICATION MAP BUILDER
// ============================================

function buildUnificationMap(
  exactResult: ExactMatchResult,
  semanticResults: AIGroupMergeResult[],
  existingSubjects: Subject[],
  newSubjects: Subject[],
  editalIds: string[]
): CycleUnificationMap {
  const allSubjects = [...existingSubjects, ...newSubjects];
  const unifiedSubjects: UnifiedSubjectMapping[] = [];
  const allUnifiedSubjectIds = new Set<string>();

  // Helper: build initial topic mappings for a group of subjects (exact-match only for now)
  function buildInitialTopicMappings(subs: Subject[]): UnifiedTopicMapping[] {
    const topicGroups = new Map<string, { name: string, ids: string[], subjectIds: string[] }>();
    for (const sub of subs) {
      for (const topic of sub.topics) {
        const norm = normalizeName(topic.name);
        if (!topicGroups.has(norm)) {
          topicGroups.set(norm, { name: topic.name, ids: [], subjectIds: [] });
        }
        const tg = topicGroups.get(norm)!;
        tg.ids.push(topic.id);
        tg.subjectIds.push(sub.id);
      }
    }
    return Array.from(topicGroups.values()).map(tg => ({
      displayName: tg.name,
      originalTopicIds: tg.ids,
      originalSubjectIds: tg.subjectIds,
      matchType: 'exact' as const,
    }));
  }

  // 1. Add exact matches (including internal dedup groups)
  for (const match of exactResult.matched) {
    const subjectIds = match.subjects.map(s => s.id);
    unifiedSubjects.push({
      displayName: match.groupName,
      originalSubjectIds: subjectIds,
      topicMappings: buildInitialTopicMappings(match.subjects),
      matchType: 'exact',
    });
    for (const id of subjectIds) allUnifiedSubjectIds.add(id);
  }

  // 2. Add semantic groups (from AI — new group-based format)
  //
  // The AI may return groups that INCLUDE IDs already in an exact-match group
  // (because we passed virtual group representatives). In that case, we find the
  // existing unified entry and ADD the fresh IDs to it, instead of creating a new one.
  for (const res of semanticResults) {
    const alreadyUnifiedIds = res.subjectIds.filter(id => allUnifiedSubjectIds.has(id));
    const freshIds = res.subjectIds.filter(id => !allUnifiedSubjectIds.has(id));

    if (freshIds.length === 0) continue; // nothing new to add

    const freshSubjects = freshIds
      .map(id => allSubjects.find(s => s.id === id))
      .filter((s): s is Subject => !!s);

    if (alreadyUnifiedIds.length > 0) {
      // Find the existing unified subject group and extend it with the fresh subjects
      const existingGroup = unifiedSubjects.find(u =>
        u.originalSubjectIds.some(id => alreadyUnifiedIds.includes(id))
      );

      if (existingGroup && freshSubjects.length > 0) {
        // Absorb fresh subjects into the existing group
        existingGroup.originalSubjectIds.push(...freshIds);
        existingGroup.matchType = 'semantic'; // upgraded to semantic since AI confirmed

        // Merge topics from fresh subjects (exact-match against existing topics)
        for (const freshSub of freshSubjects) {
          for (const topic of freshSub.topics) {
            const norm = normalizeName(topic.name);
            const existingTopic = existingGroup.topicMappings.find(
              tm => normalizeName(tm.displayName) === norm
            );
            if (existingTopic) {
              existingTopic.originalTopicIds.push(topic.id);
              existingTopic.originalSubjectIds.push(freshSub.id);
            } else {
              existingGroup.topicMappings.push({
                displayName: topic.name,
                originalTopicIds: [topic.id],
                originalSubjectIds: [freshSub.id],
                matchType: 'exact',
              });
            }
          }
        }

        // Override display name if AI suggested a better one
        if (res.suggestedName && res.suggestedName.trim()) {
          existingGroup.displayName = res.suggestedName;
        }

        for (const id of freshIds) allUnifiedSubjectIds.add(id);
        continue;
      }
    }

    // Pure new semantic group (no overlap with existing exact groups)
    if (freshSubjects.length < 2) continue;

    const displayName = res.suggestedName ||
      freshSubjects.reduce((best, s) => s.name.length > best.length ? s.name : best, '');

    unifiedSubjects.push({
      displayName,
      originalSubjectIds: freshIds,
      topicMappings: buildInitialTopicMappings(freshSubjects),
      matchType: 'semantic',
    });

    for (const id of freshIds) allUnifiedSubjectIds.add(id);
  }

  // 3. Collect standalone subject IDs
  const allSubjectIds = allSubjects.map(s => s.id);
  const standaloneSubjectIds = allSubjectIds.filter(id => !allUnifiedSubjectIds.has(id));

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    editalIds,
    unifiedSubjects,
    standaloneSubjectIds,
  };
}

// ============================================
// MAIN ORCHESTRATOR — ETAPA 1 (SUBJECTS)
// ============================================

/**
 * Main entry point for subject-level merge.
 * Performs Step A (exact) + Step B (AI semantic).
 */
export async function performHybridMerge(
  existingSubjects: Subject[],
  newSubjects: Subject[],
  existingEditalIds: string[],
  newEditalId: string
): Promise<HybridMergeResult> {
  console.group('🔀 Iniciando Mesclagem Híbrida (Hybrid Merge)');
  
  await new Promise(resolve => setTimeout(resolve, 800)); // Tactic delay for visual feedback

  // --- STEP A: Exact merge ---
  console.group('Step A: Busca por nomes exatos (com normalização de prefixos)');
  const exactResult = performExactMerge(existingSubjects, newSubjects);
  console.log(`  ✅ Matches exatos encontrados: ${exactResult.matched.length}`);
  exactResult.matched.forEach(m => {
    console.log(`    - Grupo: "${m.groupName}" (${m.subjects.length} matérias) [cross-edital: ${m.hasMultipleSides}]`);
  });
  console.log(`  ❌ Não combinados (Existentes): ${exactResult.unmatchedExisting.length}`);
  console.log(`  ❌ Não combinados (Novos): ${exactResult.unmatchedNew.length}`);
  console.groupEnd();

  // --- STEP B: Semantic merge (AI) ---
  console.group('Step B: Busca por equivalência semântica (IA)');
  const { results: semanticResults, status: aiStatus } = await performSemanticMerge(
    exactResult.matched,        // Pass exact groups so AI can absorb unmatched into them
    exactResult.unmatchedExisting,
    exactResult.unmatchedNew
  );
  console.log(`  🤖 IA identificou ${semanticResults.length} pares equivalentes.`);
  console.groupEnd();

  // --- Build Unification Map ---
  console.group('Construindo Mapa de Unificação');
  const unificationMap = buildUnificationMap(
    exactResult,
    semanticResults,
    existingSubjects,
    newSubjects,
    [...new Set([...existingEditalIds, newEditalId])]
  );
  console.log('  🗺️ Mapa detalhado:', unificationMap);
  console.groupEnd();

  const allExistingIds = existingSubjects.map(s => s.id);
  const allNewIds = newSubjects.map(s => s.id);
  const finalSubjectIds = [...new Set([...allExistingIds, ...allNewIds])];

  const stats = {
    exactMatches: exactResult.matched.length,
    semanticMatches: semanticResults.length,
    standaloneSubjects: unificationMap.standaloneSubjectIds.length,
    totalSubjectsInCycle: finalSubjectIds.length,
    aiStatus,
  };

  console.log('📊 Resultado final da mesclagem (Etapa 1):', stats);
  console.groupEnd();

  return { unificationMap, finalSubjectIds, stats };
}

// ============================================
// ETAPA 2: TOPIC MERGE (Steps C + D)
// ============================================

/**
 * Step D: AI semantic analysis for unmatched topics within a unified subject group.
 */
async function performTopicSemanticMerge(
  groupDisplayName: string,
  unmatchedTopicsA: Topic[],
  unmatchedTopicsB: Topic[],
  subjectAId: string,
  subjectBId: string
): Promise<{ results: AITopicMergeResult[], status: 'success' | 'error' | 'skipped' }> {
  if (unmatchedTopicsA.length === 0 || unmatchedTopicsB.length === 0) {
    return { results: [], status: 'skipped' };
  }

  // Build candidate pairs sorted by similarity
  const candidates: AITopicMergeCandidate[] = [];
  for (const tA of unmatchedTopicsA) {
    for (const tB of unmatchedTopicsB) {
      candidates.push({
        subjectGroupDisplayName: groupDisplayName,
        topicA: { id: tA.id, name: tA.name, subjectId: subjectAId },
        topicB: { id: tB.id, name: tB.name, subjectId: subjectBId },
      });
    }
  }

  // Limit to 60 pairs max for topics
  const limited = candidates.slice(0, 60);

  try {
    const candidatesJson = JSON.stringify(
      limited.map(c => ({
        topico_A: { id: c.topicA.id, nome: c.topicA.name },
        topico_B: { id: c.topicB.id, nome: c.topicB.name },
      })),
      null, 2
    );

    const prompt = DEFAULT_TOPIC_MERGE_PROMPT.replace('{CANDIDATES_JSON}', candidatesJson);

    const { data, error } = await supabase.functions.invoke('ai-handler', {
      body: {
        action: 'generateContent',
        prompt,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.05,
        },
      },
    });

    if (error || !data?.success) {
      console.error(`❌ Falha IA (tópicos de "${groupDisplayName}"):`, error || data?.error);
      return { results: [], status: 'error' };
    }

    const text = (data.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const results: AITopicMergeResult[] = JSON.parse(text);
    const filtered = results.filter(r => r.isEquivalent && r.confidence >= 0.6);
    console.log(`  ✅ IA: ${filtered.length} tópicos equivalentes em "${groupDisplayName}"`);
    return { results: filtered, status: 'success' };
  } catch (err) {
    console.error(`❌ Erro fatal IA (tópicos de "${groupDisplayName}"):`, err);
    return { results: [], status: 'error' };
  }
}

/**
 * Performs the full topic merge (Steps C + D) for all unified subject groups.
 * 
 * This is Etapa 2 of the merge flow.
 * It takes the unification map from Etapa 1 and refines the topic mappings.
 */
export async function performFullTopicMerge(
  unificationMap: CycleUnificationMap,
  allSubjects: Subject[],
  useAI: boolean
): Promise<TopicMergePhaseResult> {
  console.group('🗂️ Iniciando Mesclagem de Tópicos (Etapa 2)');

  const groups: TopicGroupResult[] = [];
  let overallAiError = false;

  for (const unified of unificationMap.unifiedSubjects) {
    const subjectDisplayName = unified.displayNameOverride || unified.displayName;

    // Collect ALL topics from ALL subjects in the group (N-way, not just A vs B)
    type TopicWithSource = { topic: Topic; subjectId: string };
    const allTopicsWithSource: TopicWithSource[] = unified.originalSubjectIds.flatMap(id => {
      const sub = allSubjects.find(s => s.id === id);
      return (sub?.topics || []).map(t => ({ topic: t, subjectId: id }));
    });

    if (allTopicsWithSource.length === 0) {
      groups.push({
        subjectDisplayName,
        originalSubjectIds: unified.originalSubjectIds,
        topicMappings: [],
        aiUsed: false,
        aiStatus: 'skipped',
      });
      continue;
    }

    // Step C: N-way exact deduplication across ALL subjects
    // Group topics by their normalized name; topics from 2+ sources → EXACT match
    console.log(`  Step C (tópicos exatos N-way): "${subjectDisplayName}" — ${allTopicsWithSource.length} tópicos de ${unified.originalSubjectIds.length} matérias`);

    const normalizedGroups = new Map<string, TopicWithSource[]>();
    for (const item of allTopicsWithSource) {
      const norm = normalizeName(item.topic.name);
      const existing = normalizedGroups.get(norm) ?? [];
      existing.push(item);
      normalizedGroups.set(norm, existing);
    }

    const exactTopicMappings: UnifiedTopicMapping[] = [];
    // Standalone = topics from exactly one source (no match in other subjects)
    const standAloneTopics: TopicWithSource[] = [];

    for (const [, items] of normalizedGroups) {
      // Get unique source subjects for this topic name
      const sourceSubjectIds = [...new Set(items.map(i => i.subjectId))];

      if (sourceSubjectIds.length >= 2) {
        // Matched across 2+ subjects → EXACT merge
        // Pick the best display name (prefer the longest/most complete)
        const bestName = items.reduce((best, { topic }) =>
          topic.name.length > best.length ? topic.name : best, '');

        exactTopicMappings.push({
          displayName: bestName,
          originalTopicIds: items.map(i => i.topic.id),
          originalSubjectIds: items.map(i => i.subjectId),
          matchType: 'exact',
        });
      } else {
        // Only in one source → standalone
        standAloneTopics.push(...items);
      }
    }

    // Step D: AI semantic matching for remaining standalone topics from DIFFERENT sources
    // (Only meaningful when there are at least 2 different source subjects with unmatched topics)
    let aiUsed = false;
    let aiStatus: 'success' | 'error' | 'skipped' = 'skipped';
    const aiTopicMappings: UnifiedTopicMapping[] = [];

    if (useAI && standAloneTopics.length >= 2) {
      // Group standalone topics by source subject
      const bySource = new Map<string, Topic[]>();
      for (const { topic, subjectId } of standAloneTopics) {
        const arr = bySource.get(subjectId) ?? [];
        arr.push(topic);
        bySource.set(subjectId, arr);
      }

      // Run AI pair-wise between first two sources that have unmatched topics
      const sourcesWithTopics = [...bySource.entries()];
      if (sourcesWithTopics.length >= 2) {
        const [idA, topicsA] = sourcesWithTopics[0];
        const [idB, topicsB] = sourcesWithTopics[1];

        aiUsed = true;
        const { results: aiResults, status } = await performTopicSemanticMerge(
          subjectDisplayName,
          topicsA,
          topicsB,
          idA,
          idB
        );
        aiStatus = status;
        if (status === 'error') overallAiError = true;

        const usedAiAIds = new Set<string>();
        const usedAiBIds = new Set<string>();

        for (const res of aiResults) {
          if (!usedAiAIds.has(res.topicA_id) && !usedAiBIds.has(res.topicB_id)) {
            aiTopicMappings.push({
              displayName: res.suggestedDisplayName,
              originalTopicIds: [res.topicA_id, res.topicB_id],
              originalSubjectIds: [idA, idB],
              matchType: 'semantic',
              confidence: res.confidence,
            });
            usedAiAIds.add(res.topicA_id);
            usedAiBIds.add(res.topicB_id);
          }
        }

        // Remaining from first two sources after AI
        for (const t of topicsA) {
          if (!usedAiAIds.has(t.id)) {
            aiTopicMappings.push({ displayName: t.name, originalTopicIds: [t.id], originalSubjectIds: [idA], matchType: 'semantic' });
          }
        }
        for (const t of topicsB) {
          if (!usedAiBIds.has(t.id)) {
            aiTopicMappings.push({ displayName: t.name, originalTopicIds: [t.id], originalSubjectIds: [idB], matchType: 'semantic' });
          }
        }

        // Topics from remaining sources (3rd, 4th...) stay as standalone
        for (const [srcId, topics] of sourcesWithTopics.slice(2)) {
          for (const t of topics) {
            aiTopicMappings.push({ displayName: t.name, originalTopicIds: [t.id], originalSubjectIds: [srcId], matchType: 'semantic' });
          }
        }
      } else {
        // Only one source has standalone topics → all stay as MANTIDO
        for (const { topic, subjectId } of standAloneTopics) {
          aiTopicMappings.push({ displayName: topic.name, originalTopicIds: [topic.id], originalSubjectIds: [subjectId], matchType: 'exact' });
        }
      }
    } else {
      // No AI — all standalone topics stay as-is (MANTIDO)
      for (const { topic, subjectId } of standAloneTopics) {
        aiTopicMappings.push({ displayName: topic.name, originalTopicIds: [topic.id], originalSubjectIds: [subjectId], matchType: 'exact' });
      }
    }

    groups.push({
      subjectDisplayName,
      originalSubjectIds: unified.originalSubjectIds,
      topicMappings: [...exactTopicMappings, ...aiTopicMappings],
      aiUsed,
      aiStatus,
    });
  }


  // Add standalone subjects as simple pass-through groups (no merging needed)
  for (const standaloneId of unificationMap.standaloneSubjectIds) {
    const sub = allSubjects.find(s => s.id === standaloneId);
    if (!sub) continue;

    // Check not already covered by a unified group
    const alreadyCovered = groups.some(g => g.originalSubjectIds.includes(standaloneId));
    if (alreadyCovered) continue;

    groups.push({
      subjectDisplayName: sub.name,
      originalSubjectIds: [sub.id],
      topicMappings: sub.topics.map(t => ({
        displayName: t.name,
        originalTopicIds: [t.id],
        originalSubjectIds: [sub.id],
        matchType: 'exact' as const,
      })),
      aiUsed: false,
      aiStatus: 'skipped',
    });
  }

  console.log(`�� Etapa 2 concluída: ${groups.length} grupos de matérias processados.`);
  console.groupEnd();

  return {
    groups,
    overallAiStatus: overallAiError ? 'error' : (groups.some(g => g.aiUsed) ? 'success' : 'skipped'),
  };
}

/**
 * Applies topic merge results back into the unification map.
 * Call this after the student confirms Etapa 2.
 */
export function applyTopicMergeToMap(
  unificationMap: CycleUnificationMap,
  topicMergeResult: TopicMergePhaseResult
): CycleUnificationMap {
  const updatedSubjects = unificationMap.unifiedSubjects.map(unified => {
    const groupResult = topicMergeResult.groups.find(
      g => g.originalSubjectIds.join(',') === unified.originalSubjectIds.join(',')
    );
    if (!groupResult) return unified;
    return {
      ...unified,
      topicMappings: groupResult.topicMappings,
    };
  });

  return {
    ...unificationMap,
    unifiedSubjects: updatedSubjects,
  };
}

// ============================================
// PERSISTENCE
// ============================================

export async function saveUnificationMap(
  userId: string,
  unificationMap: CycleUnificationMap
): Promise<void> {
  try {
    const { error } = await (supabase
      .from('user_cycles') as unknown as { update: (v: unknown) => { eq: (k: string, v: unknown) => { eq: (k: string, v: unknown) => Promise<{ error: unknown }> } } })
      .update({
        unification_map: unificationMap,
        atualizado_em: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      console.error('❌ Erro ao salvar unification_map:', error);
      throw error;
    }

    console.log('✅ UnificationMap salvo no banco de dados.');
  } catch (err) {
    console.error('❌ Falha fatal ao persistir unification_map:', err);
    throw err;
  }
}

export async function loadUnificationMap(
  userId: string
): Promise<CycleUnificationMap | null> {
  try {
    const { data, error } = await (supabase
      .from('user_cycles') as unknown as { select: (v: string) => { eq: (k: string, v: unknown) => { eq: (k: string, v: unknown) => { limit: (n: number) => { maybeSingle: () => Promise<{ data: { unification_map?: unknown } | null, error: unknown }> } } } } })
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (error || !data?.unification_map) {
      return null;
    }

    return data.unification_map as CycleUnificationMap;
  } catch (err) {
    console.error('⚠️ Erro ao carregar unification_map:', err);
    return null;
  }
}

// ============================================
// DUAL PROGRESS REGISTRATION
// ============================================

export function findSiblingTopicIds(
  completedTopicId: string,
  unificationMap: CycleUnificationMap | null
): string[] {
  if (!unificationMap) return [];

  for (const subject of unificationMap.unifiedSubjects) {
    for (const topicMapping of subject.topicMappings) {
      if (topicMapping.originalTopicIds.includes(completedTopicId)) {
        return topicMapping.originalTopicIds.filter(id => id !== completedTopicId);
      }
    }
  }

  return [];
}

export async function registerDualProgress(
  completedTopicId: string,
  updateData: Record<string, unknown>,
  unificationMap: CycleUnificationMap | null
): Promise<void> {
  const siblingIds = findSiblingTopicIds(completedTopicId, unificationMap);

  if (siblingIds.length === 0) return;

  console.log(`🔄 Dual Progress: Sincronizando ${siblingIds.length} tópico(s) irmão(s)...`);

  for (const siblingId of siblingIds) {
    try {
      await supabase
        .from('topics')
        .update({
          review_count: updateData.review_count as number,
          next_review: updateData.next_review as string | null,
          review_stage: updateData.review_stage as string | null,
          completed: updateData.completed as boolean,
          last_reviewed_at: updateData.last_reviewed_at as string,
          memory_stability: updateData.memory_stability as number | null,
          current_interval: updateData.current_interval as number | null,
        })
        .eq('id', siblingId);
    } catch (err) {
      console.error(`⚠️ Erro ao sincronizar dual progress para ${siblingId}:`, err);
    }
  }
}

// ============================================
// UI RENDERING UTILITIES
// ============================================

export function getCanonicalSubjectName(
  subjectId: string,
  originalName: string,
  unificationMap?: CycleUnificationMap | null
): string {
  if (!unificationMap?.unifiedSubjects) return originalName;
  
  for (const unified of unificationMap.unifiedSubjects) {
    if (unified.originalSubjectIds.includes(subjectId)) {
      return unified.displayNameOverride || unified.displayName;
    }
  }
  return originalName;
}

export function getCanonicalTopicName(
  topicId: string,
  originalName: string,
  unificationMap?: CycleUnificationMap | null
): string {
  if (!unificationMap?.unifiedSubjects) return originalName;

  for (const unified of unificationMap.unifiedSubjects) {
    for (const tm of unified.topicMappings) {
      if (tm.originalTopicIds.includes(topicId)) {
        return tm.displayName;
      }
    }
  }
  return originalName;
}

export function applyUnificationMap(
  subjects: Subject[],
  unificationMap: CycleUnificationMap | undefined | null
): Subject[] {
  if (!unificationMap || !unificationMap.unifiedSubjects) return subjects;

  const result: Subject[] = [];
  const processedOriginalIds = new Set<string>();

  for (const unified of unificationMap.unifiedSubjects) {
    if (!unified.originalSubjectIds || unified.originalSubjectIds.length === 0) continue;

    const primarySubjectId = unified.originalSubjectIds[0];
    const primarySubject = subjects.find(s => s.id === primarySubjectId);

    if (primarySubject) {
      const virtualTopics: Topic[] = [];
      const processedTopicIds = new Set<string>();

      for (const tm of unified.topicMappings) {
        if (!tm.originalTopicIds || tm.originalTopicIds.length === 0) continue;
        
        const primaryTopicId = tm.originalTopicIds[0];
        let sourceTopic: Topic | undefined;
        
        for (const subId of unified.originalSubjectIds) {
          const sub = subjects.find(s => s.id === subId);
          if (sub) {
            const topic = sub.topics.find(t => tm.originalTopicIds.includes(t.id));
            if (topic) {
              sourceTopic = topic;
              break;
            }
          }
        }

        if (sourceTopic && !processedTopicIds.has(primaryTopicId)) {
          virtualTopics.push({
            ...sourceTopic,
            id: primaryTopicId,
            name: tm.displayName,
          });
          processedTopicIds.add(primaryTopicId);
        }
      }

      result.push({
        ...primarySubject,
        name: unified.displayNameOverride || unified.displayName,
        topics: virtualTopics,
      });
      unified.originalSubjectIds.forEach(id => processedOriginalIds.add(id));
    }
  }

  for (const subject of subjects) {
    if (!processedOriginalIds.has(subject.id)) {
      result.push(subject);
    }
  }

  return result;
}
