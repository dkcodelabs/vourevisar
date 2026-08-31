type OrderableTopic = {
  name: string;
  position?: number | null;
  created_at?: string | null;
  createdAt?: string | null;
};

const numericPrefix = (name: string) => {
  const match = name.trim().match(/^(\d+(?:\.\d+)*)\.?\s/);
  return match?.[1]?.split('.').map(Number) ?? null;
};

const compareNumbering = (left: number[], right: number[]) => {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? -1) - (right[index] ?? -1);
    if (difference !== 0) return difference;
  }
  return 0;
};

const validPosition = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Keeps an edital's explicit numeric hierarchy stable (1, 1.1, 2, 11).
 * Topics without that hierarchy still honor the persisted manual position.
 */
export const compareTopicsInStudyOrder = (left: OrderableTopic, right: OrderableTopic) => {
  const leftNumbering = numericPrefix(left.name);
  const rightNumbering = numericPrefix(right.name);
  if (leftNumbering && rightNumbering) {
    const numberingDifference = compareNumbering(leftNumbering, rightNumbering);
    if (numberingDifference !== 0) return numberingDifference;
  }

  const leftPosition = validPosition(left.position) ? left.position : null;
  const rightPosition = validPosition(right.position) ? right.position : null;
  if (leftPosition !== null && rightPosition !== null && leftPosition !== rightPosition) return leftPosition - rightPosition;
  if (leftPosition !== null && rightPosition === null) return -1;
  if (leftPosition === null && rightPosition !== null) return 1;

  const leftCreatedAt = left.created_at ?? left.createdAt;
  const rightCreatedAt = right.created_at ?? right.createdAt;
  if (leftCreatedAt && rightCreatedAt && leftCreatedAt !== rightCreatedAt) {
    return new Date(leftCreatedAt).getTime() - new Date(rightCreatedAt).getTime();
  }
  if (leftCreatedAt && !rightCreatedAt) return -1;
  if (!leftCreatedAt && rightCreatedAt) return 1;

  return left.name.localeCompare(right.name, 'pt-BR', { numeric: true, sensitivity: 'base' });
};

export const sortTopicsInStudyOrder = <T extends OrderableTopic>(topics: readonly T[]) =>
  [...topics].sort(compareTopicsInStudyOrder);
