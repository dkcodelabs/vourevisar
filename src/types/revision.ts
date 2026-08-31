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

export interface ReviewHistoryItem {
    id: string;
    topic_id: string;
    review_stage: string;
    reviewed_at: string;
    topic_name?: string;
    subject_id?: string;
}

export interface RevisionStats {
    today: number;
    overdue: number;
    future: number;
    completedTopicsCount: number;
    completedReviews: number;
    totalScheduledReviews: number;
    startedTopicsCount: number;
    focusCount: number;
    totalTopics: number;
    totalSubjects: number;
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
    originSummary?: string | null;
    originLabels?: string[];
    isMergedOrigin?: boolean;
    showOrigin?: boolean;
}

export interface GroupedData {
    title: string;
    color: string;
    items: RevisionItem[];
}
