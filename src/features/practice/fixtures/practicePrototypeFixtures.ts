import type { PracticeQuestionPrototype } from '@/features/practice/types/practice';

export const prototypeQuestion: PracticeQuestionPrototype = {
  id: 'prototype-atos-administrativos-01',
  subject: 'Direito Administrativo',
  topic: 'Atos administrativos',
  bank: 'CEBRASPE',
  statement:
    'A revogação de um ato administrativo produz efeitos retroativos, alcançando as consequências jurídicas validamente constituídas antes da decisão da Administração.',
  options: [
    { id: 'certo', label: 'Certo' },
    { id: 'errado', label: 'Errado' },
  ],
  correctOptionId: 'errado',
  explanation:
    'A revogação atinge um ato válido por razões de conveniência e oportunidade e, em regra, produz efeitos prospectivos. A anulação é que decorre de ilegalidade e pode produzir efeitos retroativos.',
  trap: 'A banca troca os efeitos da revogação pelos efeitos normalmente associados à anulação.',
};

export const prototypeQuestions: PracticeQuestionPrototype[] = [
  prototypeQuestion,
  {
    ...prototypeQuestion,
    id: 'prototype-atos-administrativos-02',
    statement: 'A Administração pode revogar ato administrativo válido por razões de conveniência e oportunidade, respeitados os limites legais.',
    correctOptionId: 'certo',
    explanation: 'A revogação recai sobre ato válido por razões de mérito administrativo e deve respeitar os limites impostos pela lei.',
    trap: 'A validade do ato não impede a revogação; o que importa é a conveniência e a oportunidade dentro dos limites legais.',
  },
  {
    ...prototypeQuestion,
    id: 'prototype-atos-administrativos-03',
    statement: 'A anulação de ato administrativo decorre de ilegalidade e pode produzir efeitos retroativos, conforme o caso.',
    correctOptionId: 'certo',
    explanation: 'A anulação corrige um vício de legalidade e pode alcançar efeitos anteriores, observadas a segurança jurídica e as situações consolidadas.',
    trap: 'O enunciado troca anulação por revogação ao tratar dos efeitos retroativos.',
  },
];

export const prototypeTopics = [
  'Atos administrativos',
  'Poderes da Administração',
  'Responsabilidade civil do Estado',
  'Controle da Administração Pública: controle interno, externo, judicial e responsabilização dos agentes públicos',
] as const;

export const prototypeFlashcard = {
  id: 'prototype-flashcard-atos-01',
  subject: 'Direito Administrativo',
  topic: 'Atos administrativos',
  front: 'Qual é a diferença essencial entre anulação e revogação de um ato administrativo?',
  back: 'A anulação retira um ato ilegal e pode produzir efeitos retroativos. A revogação retira um ato válido por conveniência e oportunidade, com efeitos normalmente prospectivos.',
  memoryHook: 'Primeiro pergunte: o problema é legalidade ou mérito?',
};

export const prototypeFlashcards = [
  prototypeFlashcard,
  { ...prototypeFlashcard, id: 'prototype-flashcard-atos-02', front: 'Qual é o fundamento da revogação?', back: 'A revogação se baseia em conveniência e oportunidade, atingindo ato válido com efeitos normalmente prospectivos.', memoryHook: 'Revogar é retirar por mérito, não por ilegalidade.' },
  { ...prototypeFlashcard, id: 'prototype-flashcard-atos-03', front: 'Qual é o fundamento da anulação?', back: 'A anulação se baseia na ilegalidade do ato e pode produzir efeitos retroativos.', memoryHook: 'Anular corrige ilegalidade.' },
  { ...prototypeFlashcard, id: 'prototype-flashcard-atos-04', front: 'A Administração pode revogar atos vinculados?', back: 'A revogação não alcança atos vinculados nos aspectos em que a lei retirou a margem de conveniência e oportunidade.', memoryHook: 'Sem mérito disponível, não há revogação por mérito.' },
  { ...prototypeFlashcard, id: 'prototype-flashcard-atos-05', front: 'O Judiciário pode revogar ato administrativo?', back: 'O Judiciário controla a legalidade e pode anular atos ilegais, mas não substitui a Administração no juízo de conveniência e oportunidade.', memoryHook: 'Judiciário anula por legalidade; Administração revoga por mérito.' },
  { ...prototypeFlashcard, id: 'prototype-flashcard-atos-06', front: 'Qual pergunta ajuda a diferenciar anulação e revogação?', back: 'Pergunte primeiro se o problema é de legalidade ou de mérito administrativo.', memoryHook: 'Legalidade aponta para anulação; mérito aponta para revogação.' },
];
