/**
 * Types for Hybrid Cycle Merging (Exact + Semantic via AI)
 * 
 * These types define the structure for visually unifying subjects/topics
 * from different editais into a single study cycle. The merge is strictly
 * referential — original data remains untouched in subjects/topics tables.
 */

/** Represents a visual unification of two topics from different editais */
export interface UnifiedTopicMapping {
  /** Canonical name displayed in the cycle */
  displayName: string;
  /** IDs of the original topics that were unified */
  originalTopicIds: string[];
  /** IDs of the parent subjects of the original topics */
  originalSubjectIds: string[];
  /** IDs of the original editais involved in this specific mapping */
  sourceEditalIds?: string[];
  /** Match type: exact = identical names, semantic = AI suggestion, manual = student confirmed */
  matchType: 'exact' | 'semantic' | 'manual';
  /** AI confidence (0-1), only present for matchType='semantic' */
  confidence?: number;
}

/** Represents a visual unification of two subjects from different editais */
export interface UnifiedSubjectMapping {
  /** Canonical name displayed in the cycle */
  displayName: string;
  /** Name override set by the student (overrides displayName in UI) */
  displayNameOverride?: string;
  /** IDs of the original subjects that were unified */
  originalSubjectIds: string[];
  /** IDs of the original editais involved in this specific mapping */
  sourceEditalIds?: string[];
  /** Topic-level unification mappings within this subject */
  topicMappings: UnifiedTopicMapping[];
  /** Match type */
  matchType: 'exact' | 'semantic' | 'manual';
  /** AI confidence (0-1), only present for matchType='semantic' */
  confidence?: number;
}

/** Complete unification map for a merged cycle */
export interface CycleUnificationMap {
  /** Schema version for future migrations */
  version: 1;
  /** Creation timestamp */
  createdAt: string;
  /** IDs of the editais involved in the merge */
  editalIds: string[];
  /** Subjects that were unified (visual pointers) */
  unifiedSubjects: UnifiedSubjectMapping[];
  /** Subject IDs that were NOT unified (remain standalone in cycle) */
  standaloneSubjectIds: string[];
}

/** Candidate pair for AI semantic analysis */
export interface AIMergeCandidate {
  editalA: {
    subjectId: string;
    subjectName: string;
  };
  editalB: {
    subjectId: string;
    subjectName: string;
  };
}

/** AI response for a merge suggestion */
export interface AIMergeResult {
  subjectA_id: string;
  subjectB_id: string;
  isEquivalent: boolean;
  confidence: number;
  suggestedDisplayName: string;
  topicMappings: {
    topicA_id: string;
    topicB_id: string;
    isEquivalent: boolean;
    confidence: number;
    suggestedDisplayName: string;
  }[];
}

/** Result of the hybrid merge process */
export interface HybridMergeResult {
  /** The complete unification map to persist in user_cycles */
  unificationMap: CycleUnificationMap;
  /** Final list of subject IDs to set in ciclo_atual */
  finalSubjectIds: string[];
  /** Stats about the merge operation */
  stats: {
    exactMatches: number;
    semanticMatches: number;
    standaloneSubjects: number;
    totalSubjectsInCycle: number;
    aiStatus?: 'success' | 'error' | 'timeout';
    aiWarning?: string;
  };
}

// ============================================
// TOPIC MERGE TYPES (Etapa 2 do fluxo)
// ============================================

/** Candidate pair for AI topic analysis */
export interface AITopicMergeCandidate {
  subjectGroupDisplayName: string;
  topicA: { id: string; name: string; subjectId: string };
  topicB: { id: string; name: string; subjectId: string };
}

/** AI response for a topic merge suggestion */
export interface AITopicMergeResult {
  topicA_id: string;
  topicB_id: string;
  isEquivalent: boolean;
  confidence: number;
  suggestedDisplayName: string;
}

/** A single topic group result for a unified subject pair */
export interface TopicGroupResult {
  /** Display name of the parent unified subject */
  subjectDisplayName: string;
  /** IDs of the original subjects in this group */
  originalSubjectIds: string[];
  /** Topic mappings from both exact matches and AI */
  topicMappings: UnifiedTopicMapping[];
  /** Whether AI was needed for topic analysis */
  aiUsed: boolean;
  /** Status of AI call for this group */
  aiStatus: 'success' | 'error' | 'skipped';
}

/** Full result of the topic merge step (Etapa 2) */
export interface TopicMergePhaseResult {
  /** Per-subject-group topic results */
  groups: TopicGroupResult[];
  /** Overall AI status for the topic phase */
  overallAiStatus: 'success' | 'error' | 'skipped';
  /** User-facing warning when AI failed and deterministic fallback was used */
  aiWarning?: string;
}
