
import { StudyItem } from './types';

export const MOCK_DATA: StudyItem[] = [
    {
        id: '1',
        topic: 'Administração Financeira E Orçamentária',
        subject: 'AFO',
        difficulty: 3,
        revisionStep: 1,
        status: 'Hoje & Atrasadas',
        overdueDays: 28,
    },
    {
        id: '2',
        topic: 'Noções De Saúde Pública E Legislação Do SUS',
        subject: 'Saúde Pública',
        difficulty: 3,
        revisionStep: 1,
        status: 'Hoje & Atrasadas',
        overdueDays: 28,
    },
    {
        id: '3',
        topic: 'Teste De Tamanho De Texto Do Nome Da Materia',
        subject: 'Geral',
        difficulty: 2,
        revisionStep: 1,
        status: 'Hoje & Atrasadas',
        overdueDays: 27,
    },
    {
        id: '4',
        topic: 'Remoção de botões de ação redundantes',
        subject: 'Direito Processual Penal',
        difficulty: 3,
        revisionStep: 1,
        status: 'Hoje & Atrasadas',
        overdueDays: 27,
    },
    {
        id: '5',
        topic: 'Lei de Drogas e Crimes Hediondos',
        subject: 'Legislação Penal',
        difficulty: 5,
        revisionStep: 1,
        status: 'Hoje & Atrasadas',
        overdueDays: 27,
    },
    {
        id: '6',
        topic: 'Controle de Constitucionalidade',
        subject: 'Direito Constitucional',
        difficulty: 4,
        revisionStep: 2,
        status: 'Futuras',
        overdueDays: 0,
    },
    {
        id: '7',
        topic: 'Atos Administrativos',
        subject: 'Direito Administrativo',
        difficulty: 4,
        revisionStep: 4,
        status: 'Concluídas',
        overdueDays: 0,
    }
];

export const SUBJECTS = Array.from(new Set(MOCK_DATA.map(item => item.subject)));
