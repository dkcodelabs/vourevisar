export type SubjectSliceConfidence = 'high' | 'medium' | 'low' | 'failed';

export interface SubjectAnchor {
  chave: string;
  titulo: string;
  tipo_conhecimento: 'Conhecimentos Básicos' | 'Conhecimentos Específicos' | 'Geral' | string;
  ordem: number;
  startHeading: string;
  endHeading?: string;
  startAnchor?: string;
  endAnchor?: string;
  firstTopicAnchor?: string;
  lastTopicAnchor?: string;
  confidence?: 'high' | 'medium' | 'low';
  evidencia_localizacao?: string;
}

export interface SubjectSliceResult {
  subject: SubjectAnchor;
  sourceExcerpt: string;
  startIndex: number;
  endIndex: number;
  confidence: SubjectSliceConfidence;
  startMatchedBy?: string;
  endMatchedBy?: string;
  warnings: string[];
}

interface SearchIndex {
  text: string;
  originalIndexes: number[];
}

interface AnchorMatch {
  normalizedIndex: number;
  originalIndex: number;
  normalizedLength: number;
  matchedBy: string;
}

function isWhitespace(char: string) {
  return /\s/.test(char);
}

function normalizeChar(char: string) {
  if (char === 'º' || char === '°') return 'o';
  if (char === 'ª') return 'a';
  return char
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function buildNormalizedSearchIndex(value: string): SearchIndex {
  let text = '';
  const originalIndexes: number[] = [];
  let previousWasWhitespace = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (isWhitespace(char)) {
      if (!previousWasWhitespace && text.length > 0) {
        text += ' ';
        originalIndexes.push(index);
        previousWasWhitespace = true;
      }
      continue;
    }

    const normalized = normalizeChar(char);
    if (!normalized) continue;

    for (const normalizedChar of normalized) {
      text += normalizedChar;
      originalIndexes.push(index);
    }
    previousWasWhitespace = false;
  }

  if (text.endsWith(' ')) {
    text = text.slice(0, -1);
    originalIndexes.pop();
  }

  return { text, originalIndexes };
}

function normalizeAnchor(value: string) {
  return buildNormalizedSearchIndex(value).text.trim();
}

function getOriginalIndex(searchIndex: SearchIndex, normalizedIndex: number) {
  return searchIndex.originalIndexes[Math.max(0, Math.min(normalizedIndex, searchIndex.originalIndexes.length - 1))] ?? -1;
}

function getAnchorCandidates(anchor: string) {
  const normalized = normalizeAnchor(anchor);
  if (!normalized) return [];

  const tokens = normalized.split(' ').filter(Boolean);
  const candidates = [normalized];

  for (const size of [12, 10, 8, 6, 4]) {
    if (tokens.length >= size) {
      candidates.push(tokens.slice(0, size).join(' '));
    }
  }

  return [...new Set(candidates.filter((candidate) => candidate.length >= 6))];
}

function findAnchor(searchIndex: SearchIndex, anchor: string | undefined, fromNormalizedIndex: number, matchedBy: string): AnchorMatch | null {
  if (!anchor?.trim()) return null;

  for (const candidate of getAnchorCandidates(anchor)) {
    const normalizedIndex = searchIndex.text.indexOf(candidate, Math.max(0, fromNormalizedIndex));
    if (normalizedIndex >= 0) {
      return {
        normalizedIndex,
        originalIndex: getOriginalIndex(searchIndex, normalizedIndex),
        normalizedLength: candidate.length,
        matchedBy,
      };
    }
  }

  return null;
}

function findFirstAnchor(searchIndex: SearchIndex, anchors: Array<[string | undefined, string]>, fromNormalizedIndex = 0) {
  for (const [anchor, matchedBy] of anchors) {
    const match = findAnchor(searchIndex, anchor, fromNormalizedIndex, matchedBy);
    if (match) return match;
  }
  return null;
}

function findNextSubjectStart(searchIndex: SearchIndex, subjects: SubjectAnchor[], currentSubject: SubjectAnchor, startFrom: number) {
  const nextSubjects = subjects
    .filter((subject) => subject.ordem > currentSubject.ordem)
    .sort((a, b) => a.ordem - b.ordem);

  for (const subject of nextSubjects) {
    const match = findFirstAnchor(searchIndex, [
      [subject.startHeading, `nextSubject:${subject.chave}:startHeading`],
      [subject.startAnchor, `nextSubject:${subject.chave}:startAnchor`],
      [subject.firstTopicAnchor, `nextSubject:${subject.chave}:firstTopicAnchor`],
    ], startFrom);

    if (match) return match;
  }

  return null;
}

function classifyConfidence(startMatch: AnchorMatch | null, endMatch: AnchorMatch | null, warnings: string[]): SubjectSliceConfidence {
  if (!startMatch) return 'failed';
  if (!endMatch) return 'low';
  if (warnings.length > 0) return 'medium';
  return 'high';
}

export function sliceTextForSubject(fullText: string, subject: SubjectAnchor, subjects: SubjectAnchor[] = []): SubjectSliceResult {
  const warnings: string[] = [];
  const searchIndex = buildNormalizedSearchIndex(fullText);
  const startMatch = findFirstAnchor(searchIndex, [
    [subject.startHeading, 'startHeading'],
    [subject.startAnchor, 'startAnchor'],
    [subject.firstTopicAnchor, 'firstTopicAnchor'],
    [subject.titulo, 'title'],
  ]);

  if (!startMatch) {
    return {
      subject,
      sourceExcerpt: '',
      startIndex: -1,
      endIndex: -1,
      confidence: 'failed',
      warnings: ['start anchor not found'],
    };
  }

  const endSearchFrom = startMatch.normalizedIndex + Math.max(startMatch.normalizedLength, 1);
  let endMatch = findFirstAnchor(searchIndex, [
    [subject.endHeading, 'endHeading'],
    [subject.endAnchor, 'endAnchor'],
  ], endSearchFrom);

  if (!endMatch && subjects.length > 0) {
    endMatch = findNextSubjectStart(searchIndex, subjects, subject, endSearchFrom);
    if (endMatch) warnings.push('end anchor not found; used next subject start');
  }

  if (!endMatch && subject.lastTopicAnchor) {
    const lastTopicMatch = findAnchor(searchIndex, subject.lastTopicAnchor, endSearchFrom, 'lastTopicAnchor');
    if (lastTopicMatch) {
      const endNormalizedIndex = lastTopicMatch.normalizedIndex + lastTopicMatch.normalizedLength;
      endMatch = {
        ...lastTopicMatch,
        normalizedIndex: endNormalizedIndex,
        originalIndex: getOriginalIndex(searchIndex, endNormalizedIndex),
      };
      warnings.push('end anchor not found; used last topic anchor');
    }
  }

  const startIndex = startMatch.originalIndex;
  const endIndex = endMatch?.originalIndex ?? fullText.length;

  if (!endMatch) warnings.push('end anchor not found; excerpt reaches end of text');
  if (endIndex <= startIndex) warnings.push('end index is before start index');

  const safeEndIndex = endIndex > startIndex ? endIndex : fullText.length;
  const sourceExcerpt = fullText.slice(startIndex, safeEndIndex).trim();

  if (sourceExcerpt.length < 50) warnings.push('excerpt is unexpectedly short');
  if (sourceExcerpt.length > 60000) warnings.push('excerpt is very long and should be reviewed before sending to AI');

  return {
    subject,
    sourceExcerpt,
    startIndex,
    endIndex: safeEndIndex,
    confidence: classifyConfidence(startMatch, endMatch, warnings),
    startMatchedBy: startMatch.matchedBy,
    endMatchedBy: endMatch?.matchedBy,
    warnings,
  };
}

export function sliceTextForSubjects(fullText: string, subjects: SubjectAnchor[]) {
  return subjects
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((subject) => sliceTextForSubject(fullText, subject, subjects));
}
