import { describe, expect, it } from 'vitest';
import { sliceTextForSubject, sliceTextForSubjects, type SubjectAnchor } from './editalTextSlicer';

const subjects: SubjectAnchor[] = [
  {
    chave: 'direito_notarial',
    titulo: 'Direito Notarial e Registral',
    tipo_conhecimento: 'Conhecimentos Específicos',
    ordem: 1,
    startHeading: 'DIREITO NOTARIAL E REGISTRAL:',
    endHeading: 'DIREITO CONSTITUCIONAL:',
  },
  {
    chave: 'direito_constitucional',
    titulo: 'Direito Constitucional',
    tipo_conhecimento: 'Conhecimentos Específicos',
    ordem: 2,
    startHeading: 'DIREITO CONSTITUCIONAL:',
    endHeading: 'DIREITO ADMINISTRATIVO:',
  },
  {
    chave: 'direito_administrativo',
    titulo: 'Direito Administrativo',
    tipo_conhecimento: 'Conhecimentos Específicos',
    ordem: 3,
    startHeading: 'DIREITO ADMINISTRATIVO:',
  },
];

describe('editalTextSlicer', () => {
  it('slices a subject between normalized headings', () => {
    const fullText = [
      'CONHECIMENTOS',
      'DIREITO NOTARIAL E REGISTRAL: 1 Regime jurídico dos serviços notariais.',
      '9.8 Do Cancelamento. 10 Súmulas, Temas e Teses do STF e STJ.',
      '11 Legislação. 11.1 Lei Complementar nº 123/2006, Lei nº 4.380/1964.',
      'DIREITO CONSTITUCIONAL: 1 Constitucionalismo. 2 Neoconstitucionalismo.',
      'DIREITO ADMINISTRATIVO: 1 Estado, governo e administração pública.',
    ].join('\n');

    const result = sliceTextForSubject(fullText, subjects[0], subjects);

    expect(result.confidence).toBe('high');
    expect(result.sourceExcerpt).toContain('DIREITO NOTARIAL E REGISTRAL');
    expect(result.sourceExcerpt).toContain('11.1 Lei Complementar nº 123/2006');
    expect(result.sourceExcerpt).not.toContain('DIREITO CONSTITUCIONAL');
  });

  it('falls back to the next mapped subject when end heading is missing', () => {
    const subjectWithBadEnd = {
      ...subjects[0],
      endHeading: 'DIREITO CONSTITUCIONAL INEXISTENTE:',
    };
    const fullText = [
      'DIREITO NOTARIAL E REGISTRAL: 1 Tabelionato de notas.',
      'DIREITO CONSTITUCIONAL: 1 Constituição.',
    ].join('\n');

    const result = sliceTextForSubject(fullText, subjectWithBadEnd, subjects);

    expect(result.confidence).toBe('medium');
    expect(result.endMatchedBy).toBe('nextSubject:direito_constitucional:startHeading');
    expect(result.sourceExcerpt).not.toContain('DIREITO CONSTITUCIONAL');
  });

  it('keeps processing other subjects when one anchor fails', () => {
    const fullText = [
      'DIREITO NOTARIAL E REGISTRAL: 1 Tabelionato de notas.',
      'DIREITO CONSTITUCIONAL: 1 Constituição.',
    ].join('\n');
    const brokenSubjects = [
      { ...subjects[0], titulo: 'Materia inexistente', startHeading: 'NAO EXISTE:' },
      subjects[1],
    ];

    const results = sliceTextForSubjects(fullText, brokenSubjects);

    expect(results[0].confidence).toBe('failed');
    expect(results[1].confidence).toBe('low');
    expect(results[1].sourceExcerpt).toContain('DIREITO CONSTITUCIONAL');
  });
});
