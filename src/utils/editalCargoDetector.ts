export interface DetectedCargoOption {
  id: string;
  nome_cargo: string;
  area_codigo: string | null;
  area_enfase: string | null;
  label_exibicao: string;
  rawLabel: string;
  evidence: string;
  confidence: 'high' | 'medium';
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeForKey(value: string) {
  return normalizeSpaces(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function findCargoSectionText(text: string) {
  const firstCargo = text.search(/\bcargo\s*0*1\s*:/i);
  if (firstCargo < 0) return '';

  const afterFirstCargo = text.slice(firstCargo);
  const nextMajorSection = afterFirstCargo.search(/\s(?:3|4|5|6|7|8|9)\s+(?:d[ao]s?|da|do)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/i);
  if (nextMajorSection > 0) {
    return afterFirstCargo.slice(0, nextMajorSection);
  }

  return afterFirstCargo;
}

function cleanCargoLabel(rawValue: string) {
  const [beforeTerminator] = rawValue.split(
    /\b(?:REQUISITO|REQUISITOS|DESCRI[CÇ][AÃ]O\s+SUM[AÁ]RIA|DESCRI[CÇ][AÃ]O|REMUNERA[CÇ][AÃ]O|JORNADA\s+DE\s+TRABALHO|VAGAS?)\b/i,
  );

  return normalizeSpaces(beforeTerminator)
    .replace(/[.;,:\-\s]+$/g, '')
    .trim();
}

function isLikelyCargoLabel(value: string) {
  const normalized = normalizeForKey(value);
  if (normalized.length < 8 || normalized.length > 180) return false;
  if (!/[a-z]/i.test(normalized)) return false;
  if (/\b(?:requisito|remuneracao|jornada|descricao|vagas|lotacao)\b/.test(normalized)) return false;
  return true;
}

export function detectCargoOptionsFromEditalText(text: string): DetectedCargoOption[] {
  const sectionText = findCargoSectionText(text);
  if (!sectionText) return [];

  const matches = Array.from(sectionText.matchAll(/\bcargo\s*0*(\d{1,3})\s*:/gi));
  if (matches.length < 2) return [];

  const byNumber = new Map<number, DetectedCargoOption>();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const cargoNumber = Number(match[1]);
    if (!Number.isFinite(cargoNumber) || cargoNumber <= 0 || byNumber.has(cargoNumber)) continue;

    const start = (match.index || 0) + match[0].length;
    const end = matches[index + 1]?.index ?? sectionText.length;
    const rawLabel = cleanCargoLabel(sectionText.slice(start, end));
    if (!isLikelyCargoLabel(rawLabel)) continue;

    const label = `Cargo ${cargoNumber}: ${rawLabel}`;
    byNumber.set(cargoNumber, {
      id: `cargo-${cargoNumber}`,
      nome_cargo: rawLabel,
      area_codigo: null,
      area_enfase: null,
      label_exibicao: label,
      rawLabel: label,
      evidence: normalizeSpaces(sectionText.slice(match.index || 0, Math.min(end, (match.index || 0) + 260))),
      confidence: 'medium',
    });
  }

  const sorted = Array.from(byNumber.entries()).sort(([a], [b]) => a - b);
  if (sorted.length < 2 || sorted[0][0] !== 1) return [];

  const lastNumber = sorted[sorted.length - 1][0];
  const contiguousCount = sorted.filter(([number], index) => number === index + 1).length;
  const isStrongSequence = contiguousCount === sorted.length && lastNumber === sorted.length;
  const hasEnoughCoverage = sorted.length >= 5 && contiguousCount / lastNumber >= 0.8;

  if (!isStrongSequence && !hasEnoughCoverage) return [];

  const confidence: DetectedCargoOption['confidence'] = isStrongSequence ? 'high' : 'medium';
  return sorted.map(([, cargo]) => ({ ...cargo, confidence }));
}
