
export type StatusType = 'Hoje & Atrasadas' | 'Futuras' | 'Concluídas';

export interface StudyItem {
    id: string;
    topic: string;
    subject: string;
    difficulty: number; // 1-5
    revisionStep: number; // 1-4
    status: StatusType;
    overdueDays: number;
}

export interface FilterState {
    search: string;
    status: StatusType;
    groupBySubject: boolean;
    isAllCollapsed: boolean;
    revision: number | 'Todas';
    viewMode: 'Lista' | 'Grid';
}
