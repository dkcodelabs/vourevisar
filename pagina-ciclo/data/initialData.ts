import type { Subject } from '../types';
import { SubjectStatus, ReviewInterval, Difficulty } from '../types';

export const initialSubjects: Subject[] = [
  {
    id: 'mat-1',
    name: 'Matemática',
    status: SubjectStatus.ACTIVE,
    topics: [
      { id: 'mat-1-1', name: 'Álgebra Linear', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'mat-1-2', name: 'Cálculo Diferencial', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'mat-1-3', name: 'Geometria Analítica', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'mat-1-4', name: 'Trigonometria', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
    ],
  },
  {
    id: 'port-1',
    name: 'Português',
    status: SubjectStatus.ACTIVE,
    topics: [
      { id: 'port-1-1', name: 'Concordância Verbal', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'port-1-2', name: 'Regência Nominal', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'port-1-3', name: 'Crase', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'port-1-4', name: 'Pontuação', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
    ],
  },
  {
    id: 'hist-1',
    name: 'História',
    status: SubjectStatus.ACTIVE,
    topics: [
      { id: 'hist-1-1', name: 'Brasil Colônia', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'hist-1-2', name: 'Primeira Guerra Mundial', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'hist-1-3', name: 'Revolução Francesa', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
    ],
  },
  {
    id: 'geo-1',
    name: 'Geografia',
    status: SubjectStatus.ACTIVE,
    topics: [
      { id: 'geo-1-1', name: 'Relevo e Hidrografia', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'geo-1-2', name: 'Globalização', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'geo-1-3', name: 'Fontes de Energia', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
    ],
  },
    {
    id: 'fis-1',
    name: 'Física',
    status: SubjectStatus.ACTIVE,
    topics: [
      { id: 'fis-1-1', name: 'Leis de Newton', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'fis-1-2', name: 'Termodinâmica', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
      { id: 'fis-1-3', name: 'Eletromagnetismo', reviewStatus: ReviewInterval.NOT_STARTED, notes: '', difficulty: Difficulty.MEDIUM, subTopics: [] },
    ],
  },
];