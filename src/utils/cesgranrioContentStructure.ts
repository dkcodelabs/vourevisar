export interface CesgranrioSubjectAnchor {
  chave: string;
  titulo: string;
  tipo_conhecimento: string;
  ordem: number;
  startHeading: string;
  endHeading?: string | null;
  startAnchor?: string | null;
  endAnchor?: string | null;
  firstTopicAnchor?: string | null;
  lastTopicAnchor?: string | null;
  confidence?: 'high' | 'medium' | 'low';
}

function normalizeForMatch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value: string) {
  return normalizeForMatch(value).replace(/\s+/g, '_');
}

function normalizeLine(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function isLikelySubjectHeading(line: string) {
  const clean = normalizeLine(line);
  if (clean.length < 4 || clean.length > 90) return false;
  if (clean.includes('/')) return false;
  if (/^cargos?\s*:/i.test(clean)) return false;
  if (/^conhecimentos\s+/i.test(clean)) return false;
  if (/^[0-9]/.test(clean)) return false;

  const letters = clean.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 4) return false;

  return clean === clean.toLocaleUpperCase('pt-BR');
}

function firstWords(value: string, size = 10) {
  return normalizeLine(value).split(' ').filter(Boolean).slice(0, size).join(' ');
}

const KNOWN_BASIC_SUBJECT_TITLES = [
  'PORTUGUÊS',
  'PORTUGUES',
  'LÍNGUA PORTUGUESA',
  'LINGUA PORTUGUESA',
  'INGLÊS TÉCNICO MARÍTIMO',
  'INGLES TECNICO MARITIMO',
  'LÍNGUA INGLESA',
  'LINGUA INGLESA',
  'MATEMÁTICA',
  'MATEMATICA',
  'RACIOCÍNIO LÓGICO',
  'RACIOCINIO LOGICO',
];

function cleanCompactSubjectTitle(value: string) {
  const normalizedValue = normalizeForMatch(value);

  for (const subjectTitle of KNOWN_BASIC_SUBJECT_TITLES) {
    if (normalizedValue.endsWith(normalizeForMatch(subjectTitle))) {
      return subjectTitle;
    }
  }

  return value;
}

function getBasicKnowledgeSection(fullText: string) {
  const basicHeadingPattern = /CONHECIMENTOS\s+B[ÁA]SICOS/gi;
  const matches = Array.from(fullText.matchAll(basicHeadingPattern));

  for (const match of matches) {
    const start = (match.index || 0) + match[0].length;
    const afterBasic = fullText.slice(start);
    const sectionEndMatch = afterBasic.match(/CONHECIMENTOS\s+ESPEC[ÍI]FICOS|\bCARGO\s*:/i);
    if (!sectionEndMatch?.index) continue;

    const section = afterBasic.slice(0, sectionEndMatch.index);
    if (/\bCARGOS?\s*:/i.test(section)) return section;
  }

  return '';
}

function getProgrammaticText(fullText: string) {
  const markers = Array.from(fullText.matchAll(/CONTE[ÚU]DOS\s+PROGRAM[ÁA]TICOS|CONTE[ÚU]DO\s+PROGRAM[ÁA]TICO/gi));
  if (!markers.length) return fullText;

  return fullText.slice(markers[0].index || 0);
}

function getLevelScopedBasicSections(fullText: string, selectedCargo: string) {
  const programmaticText = getProgrammaticText(fullText);
  const levelMatches = Array.from(programmaticText.matchAll(/\bN[ÍI]VEL\s+(?:M[ÉE]DIO|SUPERIOR|FUNDAMENTAL)\s*:/gi));
  const sections: string[] = [];

  for (let index = 0; index < levelMatches.length; index += 1) {
    const start = levelMatches[index].index || 0;
    const end = levelMatches[index + 1]?.index ?? programmaticText.length;
    const levelSection = programmaticText.slice(start, end).trim();
    const specificMatch = levelSection.match(/CONHECIMENTOS\s+ESPEC[ÍI]FICOS/i);
    const basicSection = specificMatch?.index ? levelSection.slice(0, specificMatch.index) : levelSection;

    if (subsectionIncludesCargo(basicSection, selectedCargo)) {
      sections.push(basicSection);
    }
  }

  return sections;
}

function getKnownSubjectPattern() {
  return /\b(PORTUGU[ÊE]S|L[ÍI]NGUA\s+PORTUGUESA|INGL[ÊE]S\s+T[ÉE]CNICO\s+MAR[ÍI]TIMO|L[ÍI]NGUA\s+INGLESA|MATEM[ÁA]TICA|RACIOC[ÍI]NIO\s+L[ÓO]GICO)\b/gi;
}

function findFirstTopicAnchor(value: string) {
  const match = normalizeLine(value).match(/\b(?:\d{1,3}|[IVXLCDM]{1,8})\s*[.-]\s+[A-ZÀ-ÿ]/i);
  return match?.index != null ? normalizeLine(value).slice(match.index).trim() : null;
}

function recoverLevelScopedBasicSubjects(fullText: string, selectedCargo: string) {
  const recovered: CesgranrioSubjectAnchor[] = [];
  const seenTitles = new Set<string>();

  for (const section of getLevelScopedBasicSections(fullText, selectedCargo)) {
    const matches = Array.from(section.matchAll(getKnownSubjectPattern()));

    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const title = normalizeLine(cleanCompactSubjectTitle(match[0].toLocaleUpperCase('pt-BR')));
      const titleKey = normalizeKey(title);
      if (seenTitles.has(titleKey)) continue;

      const contentStart = (match.index || 0) + match[0].length;
      const contentEnd = matches[index + 1]?.index ?? section.length;
      const subjectContent = section.slice(contentStart, contentEnd).trim();
      const firstTopic = findFirstTopicAnchor(subjectContent);
      if (!firstTopic) continue;

      const nextTitle = matches[index + 1]?.[0] ? normalizeLine(cleanCompactSubjectTitle(matches[index + 1][0].toLocaleUpperCase('pt-BR'))) : null;
      seenTitles.add(titleKey);
      recovered.push({
        chave: titleKey,
        titulo: title,
        tipo_conhecimento: 'Conhecimentos Básicos',
        ordem: recovered.length + 1,
        startHeading: `${title} ${firstWords(firstTopic, 9)}`,
        startAnchor: `${title} ${firstWords(firstTopic, 9)}`,
        firstTopicAnchor: firstTopic,
        endHeading: nextTitle || 'CONHECIMENTOS ESPECÍFICOS',
        endAnchor: nextTitle || 'CONHECIMENTOS ESPECÍFICOS',
        confidence: 'high',
      });
    }
  }

  return recovered;
}

function getCargoSubsections(basicSection: string) {
  const matches = Array.from(basicSection.matchAll(/\bCARGOS?\s*:/gi));

  return matches.map((match, index) => {
    const start = match.index || 0;
    const end = matches[index + 1]?.index ?? basicSection.length;
    return basicSection.slice(start, end).trim();
  });
}

function subsectionIncludesCargo(subsection: string, selectedCargo: string) {
  const normalizedCargo = normalizeForMatch(selectedCargo);
  if (!normalizedCargo) return false;

  const headerText = subsection.split(/\n/).slice(0, 4).join(' ');
  return normalizeForMatch(headerText).includes(normalizedCargo);
}

function findSubjectInSubsection(subsection: string) {
  const lines = subsection.split(/\n/).map(normalizeLine).filter(Boolean);
  const subjectIndex = lines.findIndex(isLikelySubjectHeading);

  if (subjectIndex >= 0) {
    const title = lines[subjectIndex];
    const firstTopic = lines.slice(subjectIndex + 1).find((line) => /^[0-9]/.test(line)) || null;
    const nextMarker = subsection.match(/\n\s*CARGOS?\s*:[^\n]*/i)?.[0]?.trim() || null;

    return {
      title,
      firstTopic,
      startAnchor: firstTopic ? `${title} ${firstWords(firstTopic, 9)}` : title,
      endHeading: nextMarker,
    };
  }

  const compact = normalizeLine(subsection);
  const firstTopicMatch = compact.match(/\b\d{1,3}\s*[.-]\s+[A-ZÀ-ÿ]/);
  if (!firstTopicMatch?.index) return null;

  const beforeFirstTopic = compact.slice(0, firstTopicMatch.index).trim();
  const titleMatch = beforeFirstTopic.match(/([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{3,80})$/);
  const title = normalizeLine(cleanCompactSubjectTitle(titleMatch?.[1] || ''));
  if (!isLikelySubjectHeading(title)) return null;

  const firstTopic = compact.slice(firstTopicMatch.index).trim();
  const nextMarker = compact.match(/\bCARGOS?\s*:/i)?.[0] || null;

  return {
    title,
    firstTopic,
    startAnchor: firstTopic ? `${title} ${firstWords(firstTopic, 9)}` : title,
    endHeading: nextMarker,
  };
}

export function recoverCesgranrioBasicSubjects(fullText: string, selectedCargo: string): CesgranrioSubjectAnchor[] {
  if (!/Cesgranrio/i.test(fullText)) return [];

  const basicSection = getBasicKnowledgeSection(fullText);
  const recovered: CesgranrioSubjectAnchor[] = [];
  const seenTitles = new Set<string>();

  if (basicSection) {
    for (const subsection of getCargoSubsections(basicSection)) {
      if (!subsectionIncludesCargo(subsection, selectedCargo)) continue;

      const subject = findSubjectInSubsection(subsection);
      if (!subject) continue;

      const titleKey = normalizeKey(subject.title);
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);

      recovered.push({
        chave: titleKey,
        titulo: subject.title,
        tipo_conhecimento: 'Conhecimentos Básicos',
        ordem: recovered.length + 1,
        startHeading: subject.startAnchor,
        startAnchor: subject.startAnchor,
        firstTopicAnchor: subject.firstTopic,
        endHeading: subject.endHeading,
        endAnchor: subject.endHeading,
        confidence: 'high',
      });
    }
  }

  for (const subject of recoverLevelScopedBasicSubjects(fullText, selectedCargo)) {
    const titleKey = normalizeKey(subject.titulo);
    if (seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);
    recovered.push({ ...subject, ordem: recovered.length + 1 });
  }

  return recovered;
}

export function mergeRecoveredCesgranrioBasicSubjects<T extends CesgranrioSubjectAnchor>(
  mappedSubjects: T[],
  fullText: string,
  selectedCargo: string,
): T[] {
  const recovered = recoverCesgranrioBasicSubjects(fullText, selectedCargo);
  if (!recovered.length) return mappedSubjects;

  const existingBasicsByTitle = new Map(
    mappedSubjects
      .filter((subject) => normalizeForMatch(subject.tipo_conhecimento).includes('basico'))
      .map((subject) => [normalizeKey(subject.titulo), subject]),
  );

  const recoveredTitleKeys = new Set(recovered.map((subject) => normalizeKey(subject.titulo)));
  const orderedRecoveredBasics = recovered.map((subject) => ({
    ...(existingBasicsByTitle.get(normalizeKey(subject.titulo)) || {}),
    ...subject,
  })) as T[];

  const remainingSubjects = mappedSubjects.filter((subject) => {
    const isBasic = normalizeForMatch(subject.tipo_conhecimento).includes('basico');
    return !isBasic || !recoveredTitleKeys.has(normalizeKey(subject.titulo));
  });

  return [...orderedRecoveredBasics, ...remainingSubjects]
    .map((subject, index) => ({ ...subject, ordem: index + 1 }));
}
