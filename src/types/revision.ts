export enum RevisionStatus {
    OVERDUE = 'OVERDUE',
    TODAY = 'TODAY',
    FUTURE = 'FUTURE',
    COMPLETED = 'COMPLETED'
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
    difficulty: number; // 1 to 5
    dueDate: string; // ISO Date string
    notes: string;
    status: RevisionStatus;
    ownerImage: string; // Placeholder for UI consistency
}

export interface GroupedData {
    title: string;
    color: string;
    items: RevisionItem[];
}
