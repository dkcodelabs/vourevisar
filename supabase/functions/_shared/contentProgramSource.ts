export const MISSING_CONTENT_PROGRAM_CODE = "EDITAL_CONTENT_SOURCE_MISSING";

export interface MissingContentProgramDiagnostic {
  code: typeof MISSING_CONTENT_PROGRAM_CODE;
  missingDocumentLabel: string | null;
  publicMessage: string;
}

const foldText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\r\n?/g, "\n");

const SECTION_HEADING =
  /^(?:ANEXO\s+[IVXLCDM0-9]+\s*[-–—:]?\s*)?CONTEUDO PROGRAMATICO\s*:?$/i;
const NON_DISCIPLINE_HEADING =
  /^(?:ANEXO|PAGINA|EDITAL|CONCURSO|PROCESSO SELETIVO|PREFEITURA|INSTITUTO|ORGAO|UNIAO)\b/i;

const hasEnoughWords = (value: string, minimum: number) => (
  value.trim().split(/\s+/).filter(Boolean).length >= minimum
);

function isUppercaseHeading(value: string) {
  const letters = value.replace(/[^A-Za-z]/g, "");
  return letters.length >= 3 && letters === letters.toUpperCase();
}

function isDisciplineHeading(line: string) {
  const trimmed = line.replace(/\s+/g, " ").trim();
  if (
    !trimmed || trimmed.length > 150 || NON_DISCIPLINE_HEADING.test(trimmed)
  ) return false;

  const numbered = trimmed.match(/^\d+(?:\.\d+)*[.)]?\s+(.+?)\s*:?$/);
  if (
    numbered?.[1] && numbered[1].length <= 120 && hasEnoughWords(numbered[1], 1)
  ) {
    return true;
  }

  const withoutColon = trimmed.replace(/:\s*$/, "");
  return isUppercaseHeading(withoutColon) && hasEnoughWords(withoutColon, 1);
}

function hasTopicEvidence(line: string) {
  const trimmed = line.replace(/\s+/g, " ").trim();
  if (
    !trimmed || SECTION_HEADING.test(trimmed) ||
    NON_DISCIPLINE_HEADING.test(trimmed)
  ) return false;
  return /^\d+(?:\.\d+)*[.)]?\s+\S/.test(trimmed) ||
    (trimmed.length >= 35 && hasEnoughWords(trimmed, 6));
}

export function hasSubstantiveContentProgramSection(sourceText: string) {
  const lines = foldText(sourceText).split("\n").map((line) => line.trim());

  for (let sectionIndex = 0; sectionIndex < lines.length; sectionIndex++) {
    if (!SECTION_HEADING.test(lines[sectionIndex])) continue;

    const sectionLimit = Math.min(lines.length, sectionIndex + 140);
    for (
      let lineIndex = sectionIndex + 1;
      lineIndex < sectionLimit;
      lineIndex++
    ) {
      const line = lines[lineIndex];
      if (!line) continue;
      if (/^ANEXO\s+[IVXLCDM0-9]+\b/i.test(line)) break;

      const inlineHeading = line.match(/^(.{3,120}?):\s+(.{20,})$/);
      if (
        inlineHeading && isDisciplineHeading(`${inlineHeading[1]}:`) &&
        hasTopicEvidence(inlineHeading[2])
      ) {
        return true;
      }

      if (!isDisciplineHeading(line)) continue;

      for (
        let nextIndex = lineIndex + 1;
        nextIndex < Math.min(sectionLimit, lineIndex + 5);
        nextIndex++
      ) {
        if (!lines[nextIndex]) continue;
        if (hasTopicEvidence(lines[nextIndex])) return true;
        break;
      }
    }
  }

  return false;
}

function findReferencedContentDocument(sourceText: string) {
  const folded = foldText(sourceText).toLowerCase();
  const explicitReference = folded.match(
    /conteudo programatico.{0,160}?(?:consta|contid[oa]|encontra-se|encontra se|esta disponivel|sera apresentado)\s+(?:no|na|em)\s+(anexo\s+[ivxlcdm0-9]+)/,
  );
  if (explicitReference?.[1]) return explicitReference[1];

  const annexListing = folded.match(
    /(anexo\s+[ivxlcdm0-9]+)\s*[-–—:]\s*conteudo programatico/,
  );
  return annexListing?.[1] || null;
}

const formatDocumentLabel = (value: string) =>
  value
    .replace(/\banexo\b/i, "Anexo")
    .replace(
      /\b([ivxlcdm]+)\b/i,
      (_, numeral: string) => numeral.toUpperCase(),
    );

function isSupportingDocumentWithoutProgram(sourceText: string) {
  const folded = foldText(sourceText).toUpperCase();
  return /\b\d+\s*(?:[ªº]|A|O)?\s*RETIFICACAO\b/.test(folded) &&
    /\bONDE SE LE\b|\bLEIA-SE\b|\bLEIA SE\b/.test(folded);
}

function mentionsProgramWithoutProvidingTopics(sourceText: string) {
  const folded = foldText(sourceText).toLowerCase();
  return (
    /(?:prova|questoes?).{0,140}?elaborad[ao]s?\s+com\s+base\s+no\s+conteudo programatico\s+(?:deste|do)\s+edital/
      .test(folded) ||
    /conteudo\s+das\s+provas.{0,180}?\bdisciplinas?\b/.test(folded)
  );
}

export function detectMissingContentProgramSource(
  sourceText: string,
  extractedSubjectCount: number,
): MissingContentProgramDiagnostic | null {
  if (
    extractedSubjectCount > 0 || !sourceText.trim() ||
    hasSubstantiveContentProgramSection(sourceText)
  ) {
    return null;
  }

  const referencedDocument = findReferencedContentDocument(sourceText);
  if (referencedDocument) {
    const missingDocumentLabel = formatDocumentLabel(referencedDocument);
    return {
      code: MISSING_CONTENT_PROGRAM_CODE,
      missingDocumentLabel,
      publicMessage:
        `Este arquivo referencia o ${missingDocumentLabel} como fonte do conteúdo programático, mas essa seção não está presente no documento enviado. Anexe o ${missingDocumentLabel} ou o documento de conteúdo programático publicado separadamente e analise novamente.`,
    };
  }

  if (isSupportingDocumentWithoutProgram(sourceText)) {
    return {
      code: MISSING_CONTENT_PROGRAM_CODE,
      missingDocumentLabel: null,
      publicMessage:
        "Este arquivo é uma retificação e não contém o conteúdo programático. Envie o edital de abertura ou o anexo de conteúdo programático correspondente e analise novamente.",
    };
  }

  if (mentionsProgramWithoutProvidingTopics(sourceText)) {
    return {
      code: MISSING_CONTENT_PROGRAM_CODE,
      missingDocumentLabel: null,
      publicMessage:
        "Este arquivo apresenta a estrutura da prova, mas não contém os tópicos do conteúdo programático e não identifica um anexo específico. Envie o documento que contém os tópicos ou faça o preenchimento manual.",
    };
  }

  return null;
}
