export interface ReviewOriginEdital {
  id: string;
  name: string;
  organ?: string | null;
  position?: string | null;
}

export interface ReviewFallbackOrigin {
  name: string;
  organ?: string;
}

export interface ReviewOriginMetadata {
  labels: string[];
  summary: string | null;
  isMergedOrigin: boolean;
  shouldShow: boolean;
}

const normalizeText = (value: string) =>
  value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

const unique = <T,>(items: T[]): T[] => [...new Set(items)];

export const formatReviewOriginLabel = (edital: ReviewOriginEdital): string => {
  const name = edital.name.trim();
  const position = edital.position?.trim();
  const organ = edital.organ?.trim();

  if (position && !normalizeText(name).includes(normalizeText(position))) {
    return `${name} - ${position}`;
  }

  if (organ && !normalizeText(name).includes(normalizeText(organ))) {
    return `${name} - ${organ}`;
  }

  return name;
};

const summarizeOriginLabels = (labels: string[]): string | null => {
  if (labels.length === 0) return null;
  if (labels.length <= 2) return labels.join(' + ');
  return `${labels.slice(0, 2).join(' + ')} +${labels.length - 2}`;
};

export const buildReviewOriginMetadata = ({
  editais,
  sourceEditalIds = [],
  fallbackOrigins = [],
  showInCompositeCycle,
}: {
  editais: ReviewOriginEdital[];
  sourceEditalIds?: string[] | null;
  fallbackOrigins?: ReviewFallbackOrigin[];
  showInCompositeCycle: boolean;
}): ReviewOriginMetadata => {
  const labelsFromIds = unique(sourceEditalIds || [])
    .map(editalId => editais.find(edital => edital.id === editalId))
    .filter((edital): edital is ReviewOriginEdital => Boolean(edital))
    .map(formatReviewOriginLabel);

  const fallbackLabels = fallbackOrigins.map(origin => {
    const name = origin.name.trim();
    const organ = origin.organ?.trim();
    return organ && !normalizeText(name).includes(normalizeText(organ))
      ? `${name} - ${organ}`
      : name;
  });

  const labels = unique(labelsFromIds.length > 0 ? labelsFromIds : fallbackLabels)
    .filter(label => label.length > 0);

  const isMergedOrigin = labels.length > 1;

  return {
    labels,
    summary: summarizeOriginLabels(labels),
    isMergedOrigin,
    shouldShow: showInCompositeCycle && labels.length > 0,
  };
};
