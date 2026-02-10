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
    environment: 'development' | 'staging' | 'production';

    // Taxonomy Fields
    category: import('./errorEvent.contract').ErrorCategory;
    recoverability: import('./errorEvent.contract').ErrorRecoverability;
    isUserVisible: boolean;
    recommendedAction?: string;
    fingerprintVersion: string;

    // Context Fields (Phase 4.2-A)
    route_path?: string;
    feature_area?: string;
    actor_email?: string;
    target_email?: string;
    session_id?: string;
    request_id?: string;
    context_label?: string;
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
    environment: 'development' | 'staging' | 'production';


    // Taxonomy Fields
    category: string;
    recoverability: string;
    is_user_visible: boolean;
    recommended_action?: string;
    classification_feedback?: boolean;
    severity_feedback?: boolean;
    suggested_category?: string;

    // Context Fields (Phase 4.2-A)
    route_path?: string;
    feature_area?: string;
    actor_email?: string;
    target_email?: string;
    session_id?: string;
    request_id?: string;
    context_label?: string;
}

export interface SLOMetrics {
    critical_within_4h_pct: number;
    high_within_24h_pct: number;
    recurrence_rate: number;
    total_critical: number;
    total_high: number;
}

export interface AlertEvent {
    id: string;
    alert_type: string;
    message: string;
    metadata: any;
    status: 'active' | 'acknowledged' | 'resolved';
    created_at: string;
}
