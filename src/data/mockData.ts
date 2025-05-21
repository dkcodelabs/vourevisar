import { Subject, UserProfile, StudyProgress } from '../types';

export const mockSubjects: Subject[] = [
  {
    id: '1',
    name: 'Português',
    topics: [
      { id: '1-1', name: 'Concordância Verbal', completed: false, reviewCount: 0 },
      { id: '1-2', name: 'Crase', completed: false, reviewCount: 0 }
    ],
    status: 'Nova'
  },
  {
    id: '2',
    name: 'Matemática Financeira',
    topics: [
      { id: '2-1', name: 'Juros Compostos', completed: false, reviewCount: 0 },
      { id: '2-2', name: 'Desconto Simples', completed: true, reviewCount: 3 }
    ],
    status: 'Concluída'
  },
  {
    id: '3',
    name: 'Direito Constitucional',
    topics: [
      { id: '3-1', name: 'Artigos 1-5 da CF', completed: false, reviewCount: 1 },
      { id: '3-2', name: 'Direitos Fundamentais', completed: false, reviewCount: 0 },
      { id: '3-3', name: 'Controle de Constitucionalidade (Introdução)', completed: true, reviewCount: 2 }
    ],
    status: 'Em Estudo'
  },
  {
    id: '4',
    name: 'Direito Administrativo',
    topics: [
      { id: '4-1', name: 'Princípios da Administração Pública', completed: false, reviewCount: 0 },
      { id: '4-2', name: 'Atos Administrativos', completed: false, reviewCount: 0 }
    ],
    status: 'Nova'
  },
  {
    id: '5',
    name: 'Raciocínio Lógico',
    topics: [
      { id: '5-1', name: 'Proposições', completed: false, reviewCount: 0 },
      { id: '5-2', name: 'Silogismos', completed: false, reviewCount: 0 }
    ],
    status: 'Nova'
  }
];

export const mockUserProfile: UserProfile = {
  name: 'Darcilio',
  email: 'user@example.com',
  settings: {
    subjectsPerDay: 3,
    notificationsEnabled: true,
    notificationTime: '09:00'
  }
};

export const mockStudyProgress: StudyProgress = {
  totalSubjects: 5,
  completedSubjects: 2,
  totalTopics: 25,
  completedTopics: 10,
  delayedTopics: 3,
  todayTopics: 5,
  futureTopics: 7
};

export const upcomingReviews = [
  {
    id: '1',
    subject: 'Direito Constitucional',
    topic: 'Artigos 1-5',
    date: 'Amanhã',
    type: 'Estudo novo'
  },
  {
    id: '2',
    subject: 'Português',
    topic: 'Concordância Verbal',
    date: 'Depois de amanhã',
    type: 'Revisão 1'
  },
  {
    id: '3',
    subject: 'Matemática',
    topic: 'Juros Compostos',
    date: 'Em 3 dias',
    type: 'Estudo novo'
  }
];

export const revisionsCalendar = [
  { day: 5, hasRevision: true },
  { day: 12, hasRevision: true },
  { day: 19, hasRevision: true },
  { day: 28, hasRevision: true }
];
