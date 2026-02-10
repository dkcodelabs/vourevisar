export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorStatus = 'new' | 'investigating' | 'resolved' | 'ignored';

export interface AppErrorNormalized {
    errorId: string;
    module: string;
    action: string;
    userMessage: string;
    technicalMessage: string;
    code?: string;
    severity: ErrorSeverity;
    retryable: boolean;
    actorUserId?: string;
    targetUserId?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    scope: 'admin' | 'core';
}

export interface ErrorLogRecord {
    id: string;
    error_id: string;
    module: string;
    action: string;
    user_message: string;
    technical_message: string;
    code?: string;
    severity: ErrorSeverity;
    retryable: boolean;
    status: ErrorStatus;
    actor_user_id?: string;
    target_user_id?: string;
    metadata: any;
    occurrence_count: number;
    first_seen_at: string;
    last_seen_at: string;
    created_at: string;
    updated_at: string;
    scope: 'admin' | 'core';
}
