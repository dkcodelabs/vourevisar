export enum RevisionStatus {
    OVERDUE = 'OVERDUE',
    TODAY = 'TODAY',
    FUTURE = 'FUTURE',
    COMPLETED = 'COMPLETED',
    UNSTARTED = 'UNSTARTED',
    CONSOLIDATED = 'CONSOLIDATED'
}

export enum GroupingMode {
    STATUS = 'STATUS',
    SUBJECT = 'SUBJECT'
}

export interface RevisionItem {
    id: string;
    topic: string;
    subject: string;
    subjectId: string;
    difficulty: number; // 1 = Fácil, 2 = Médio, 3 = Difícil
    dueDate: string; // ISO Date string
    notes: string;
    status: RevisionStatus;
    ownerImage: string; // Placeholder for UI consistency
    reviewCount?: number; // Number of reviews completed
    maxReviews?: number; // Maximum reviews for user profile
    learningStatus?: 'Aprendendo' | 'Fixando' | 'Dominando';
    memoryStability?: number;
}

export interface GroupedData {
    title: string;
    color: string;
    items: RevisionItem[];
}
