type SubjectExamWeight = {
  exam_weight_points?: number | null;
  exam_weight_questions?: number | null;
  exam_weight_percentage?: number | null;
  exam_weight_raw?: string | null;
};

export type ExamWeightTotals = {
  totalPoints: number | null;
  totalQuestions: number | null;
};

export type EffectiveExamWeight =
  | { value: number; source: 'points'; label: string }
  | { value: number; source: 'percentage'; label: string }
  | { value: number; source: 'questions'; label: string }
  | { value: 0; source: 'none'; label: string };

const hasNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(value);

const formatPercentage = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }).format(value);

export const formatExamWeightInputValue = (value?: number | null) =>
  hasNumber(value) ? formatNumber(value) : '';

const plural = (value: number, singular: string, pluralText: string) =>
  Math.abs(value) === 1 ? singular : pluralText;

const pluralPoint = (value: number) =>
  Math.abs(value) <= 1 ? 'ponto' : 'pontos';

export const parseOptionalExamWeightNumber = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const hasSubjectExamWeight = (subject: SubjectExamWeight) =>
  hasNumber(subject.exam_weight_questions) ||
  hasNumber(subject.exam_weight_points) ||
  hasNumber(subject.exam_weight_percentage);

export const getEffectiveSubjectExamWeight = (subject: SubjectExamWeight): EffectiveExamWeight => {
  if (hasNumber(subject.exam_weight_points)) {
    return {
      value: subject.exam_weight_points,
      source: 'points',
      label: 'pontos',
    };
  }

  if (hasNumber(subject.exam_weight_percentage)) {
    return {
      value: subject.exam_weight_percentage,
      source: 'percentage',
      label: 'percentual da prova',
    };
  }

  if (hasNumber(subject.exam_weight_questions)) {
    return {
      value: subject.exam_weight_questions,
      source: 'questions',
      label: 'questões',
    };
  }

  return {
    value: 0,
    source: 'none',
    label: 'sem peso informado',
  };
};

export const getSubjectExamWeightLabel = (subject: SubjectExamWeight) => {
  const parts: string[] = [];

  if (hasNumber(subject.exam_weight_questions)) {
    parts.push(`${formatNumber(subject.exam_weight_questions)} ${plural(subject.exam_weight_questions, 'questão', 'questões')}`);
  }

  if (hasNumber(subject.exam_weight_points)) {
    parts.push(`${formatNumber(subject.exam_weight_points)} ${pluralPoint(subject.exam_weight_points)}`);
  }

  if (hasNumber(subject.exam_weight_percentage)) {
    parts.push(`${formatPercentage(subject.exam_weight_percentage)}% da prova`);
  }

  return parts.length ? parts.join(' · ') : 'Sem peso informado';
};

export const getExamWeightTotals = (subjects: SubjectExamWeight[]): ExamWeightTotals => {
  const totalPoints = subjects.reduce(
    (sum, subject) => sum + (hasNumber(subject.exam_weight_points) ? subject.exam_weight_points : 0),
    0,
  );
  const totalQuestions = subjects.reduce(
    (sum, subject) => sum + (hasNumber(subject.exam_weight_questions) ? subject.exam_weight_questions : 0),
    0,
  );

  return {
    totalPoints: totalPoints > 0 ? totalPoints : null,
    totalQuestions: totalQuestions > 0 ? totalQuestions : null,
  };
};

export const getSubjectExamWeightPercentage = (
  subject: SubjectExamWeight,
  totals?: ExamWeightTotals,
) => {
  if (hasNumber(subject.exam_weight_percentage)) {
    return subject.exam_weight_percentage;
  }

  if (hasNumber(subject.exam_weight_points) && totals?.totalPoints) {
    return (subject.exam_weight_points / totals.totalPoints) * 100;
  }

  if (hasNumber(subject.exam_weight_questions) && totals?.totalQuestions) {
    return (subject.exam_weight_questions / totals.totalQuestions) * 100;
  }

  return null;
};

export const getSubjectExamWeightLine = (
  subject: SubjectExamWeight,
  totals?: ExamWeightTotals,
  options: { derivePercentageFromQuestions?: boolean; derivePercentageFromPoints?: boolean } = {},
) => {
  if (!hasSubjectExamWeight(subject)) return null;

  const baseLabel = getSubjectExamWeightLabel({
    ...subject,
    exam_weight_percentage: null,
  });
  const shouldDeriveFromQuestions = options.derivePercentageFromQuestions ?? true;
  const shouldDeriveFromPoints = options.derivePercentageFromPoints ?? true;
  const hasExplicitPercentage = hasNumber(subject.exam_weight_percentage);
  const canDerivePercentage =
    hasExplicitPercentage ||
    (hasNumber(subject.exam_weight_points) && shouldDeriveFromPoints) ||
    (hasNumber(subject.exam_weight_questions) && shouldDeriveFromQuestions);
  const percentage = canDerivePercentage ? getSubjectExamWeightPercentage(subject, totals) : null;

  if (!hasNumber(percentage)) {
    return baseLabel;
  }

  return `${baseLabel} · ${formatPercentage(percentage)}% da prova`;
};

export const getSubjectExamWeightReviewMessage = (subject: SubjectExamWeight) => {
  if (!hasSubjectExamWeight(subject)) {
    return 'Peso não identificado. Preencha apenas se constar no edital.';
  }

  const effective = getEffectiveSubjectExamWeight(subject);
  const base = `Usado para priorização: ${formatNumber(effective.value)} (${effective.label}).`;
  return `${base} Confira o peso no edital antes de salvar.`;
};
