import { describe, expect, it } from 'vitest';
import {
  getExamWeightTotals,
  getEffectiveSubjectExamWeight,
  getSubjectExamWeightLabel,
  getSubjectExamWeightLine,
  getSubjectExamWeightReviewMessage,
  hasSubjectExamWeight,
  parseOptionalExamWeightNumber,
} from './examWeight';

describe('examWeight', () => {
  it('formats questions and total points without implying points per question', () => {
    const label = getSubjectExamWeightLabel({
      exam_weight_questions: 6,
      exam_weight_points: 0.75,
      exam_weight_percentage: null,
    });

    expect(label).toBe('6 questões · 0,75 ponto');
  });

  it('adds derived percentage when totals are reliable', () => {
    const totals = getExamWeightTotals([
      { exam_weight_questions: 6, exam_weight_points: 0.75 },
      { exam_weight_questions: 8, exam_weight_points: 1 },
      { exam_weight_questions: 66, exam_weight_points: 8.25 },
    ]);

    const label = getSubjectExamWeightLine({
      exam_weight_questions: 6,
      exam_weight_points: 0.75,
    }, totals);

    expect(label).toBe('6 questões · 0,75 ponto · 8% da prova');
  });

  it('displays the percentage as a rounded whole number', () => {
    const label = getSubjectExamWeightLine({
      exam_weight_questions: 10,
      exam_weight_points: 20,
      exam_weight_percentage: 33.333333,
    });

    expect(label).toBe('10 questões · 20 pontos · 33% da prova');
  });

  it('can avoid derived percentage when only question count is available', () => {
    const totals = getExamWeightTotals([
      { exam_weight_questions: 10 },
      { exam_weight_questions: 150 },
    ]);

    const label = getSubjectExamWeightLine({
      exam_weight_questions: 10,
    }, totals, { derivePercentageFromQuestions: false });

    expect(label).toBe('10 questões');
  });

  it('can avoid derived percentage when points are calculated but percentage was not explicit', () => {
    const totals = getExamWeightTotals([
      { exam_weight_questions: 10, exam_weight_points: 10 },
      { exam_weight_questions: 55, exam_weight_points: 110 },
    ]);

    const label = getSubjectExamWeightLine({
      exam_weight_questions: 10,
      exam_weight_points: 10,
    }, totals, { derivePercentageFromQuestions: false, derivePercentageFromPoints: false });

    expect(label).toBe('10 questões · 10 pontos');
  });

  it('keeps explicit percentage even when derived percentages are disabled', () => {
    const label = getSubjectExamWeightLine({
      exam_weight_questions: 10,
      exam_weight_points: 10,
      exam_weight_percentage: 12.5,
    }, undefined, { derivePercentageFromQuestions: false, derivePercentageFromPoints: false });

    expect(label).toBe('10 questões · 10 pontos · 13% da prova');
  });

  it('prefers total points for effective ordering weight', () => {
    const effective = getEffectiveSubjectExamWeight({
      exam_weight_questions: 6,
      exam_weight_points: 0.75,
      exam_weight_percentage: 7.5,
    });

    expect(effective).toEqual({
      value: 0.75,
      source: 'points',
      label: 'pontos',
    });
  });

  it('falls back to percentage and then questions', () => {
    expect(getEffectiveSubjectExamWeight({ exam_weight_percentage: 20 }).source).toBe('percentage');
    expect(getEffectiveSubjectExamWeight({ exam_weight_questions: 5 }).source).toBe('questions');
  });

  it('rejects negative or invalid manual inputs', () => {
    expect(parseOptionalExamWeightNumber('0,75')).toBe(0.75);
    expect(parseOptionalExamWeightNumber('-1')).toBeNull();
    expect(parseOptionalExamWeightNumber('abc')).toBeNull();
  });

  it('always includes review guidance when there is a weight', () => {
    const message = getSubjectExamWeightReviewMessage({ exam_weight_points: 0.75 });

    expect(hasSubjectExamWeight({ exam_weight_points: 0.75 })).toBe(true);
    expect(message).toContain('Confira o peso no edital antes de salvar.');
  });
});
