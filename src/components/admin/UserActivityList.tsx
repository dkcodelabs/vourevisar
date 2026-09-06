import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserActivity } from '@/services/adminUserActivityService';
import {
    Activity, LogIn, LogOut, Slash,
    UserCog, KeyRound, Mail, UserCheck, ExternalLink,
    CheckCircle, XCircle, Clock
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserEvent {
    id: number;
    event_type: string;
    occurred_at: string;
    metadata: {
        admin_id?: string;
        old_role?: string;
        new_role?: string;
        [key: string]: unknown;
    } | null;
    source?: string;
    status?: string;
    actor_user_id?: string;
    target_user_id?: string;
}

interface ActorProfile {
    id: string;
    name: string;
    email: string;
}

interface UserActivityListProps {
    userId: string;
    showViewAllLink?: boolean;
}

// Event severity levels for styling
type Severity = 'neutral' | 'warning' | 'critical' | 'success';

const EVENT_CONFIG: Record<string, { label: string; severity: Severity; icon: React.ReactNode }> = {
    'LOGIN': { label: 'Login realizado', severity: 'success', icon: <LogIn className="w-4 h-4" /> },
    'LOGOUT': { label: 'Logout', severity: 'neutral', icon: <LogOut className="w-4 h-4" /> },
    'SESSION_START': { label: 'Sessão iniciada', severity: 'neutral', icon: <Activity className="w-4 h-4" /> },
    'ACCOUNT_DEACTIVATED': { label: 'Conta desativada', severity: 'critical', icon: <Slash className="w-4 h-4" /> },
    'ACCOUNT_REACTIVATED': { label: 'Conta reativada', severity: 'success', icon: <UserCheck className="w-4 h-4" /> },
    'ROLE_CHANGED': { label: 'Papel alterado', severity: 'warning', icon: <UserCog className="w-4 h-4" /> },
    'PASSWORD_RESET_REQUEST': { label: 'Redefinição de senha solicitada', severity: 'warning', icon: <KeyRound className="w-4 h-4" /> },
    'PASSWORD_RESET_SUCCESS': { label: 'Senha redefinida', severity: 'success', icon: <KeyRound className="w-4 h-4" /> },
    'EMAIL_CHANGED': { label: 'Email alterado', severity: 'warning', icon: <Mail className="w-4 h-4" /> },
    'PROFILE_UPDATED': { label: 'Perfil atualizado', severity: 'neutral', icon: <UserCog className="w-4 h-4" /> },
    'EMAIL_CONFIRMED': { label: 'Email confirmado', severity: 'success', icon: <Mail className="w-4 h-4" /> },
};

const SEVERITY_STYLES: Record<Severity, { bg: string; text: string; border: string }> = {
    neutral: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    critical: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
};

export const UserActivityList: React.FC<UserActivityListProps> = ({ userId, showViewAllLink = true }) => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<UserEvent[]>([]);
    const [actorProfiles, setActorProfiles] = useState<Record<string, ActorProfile>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);

            // Fetch events for this user (as target)
            try {
                const { events: data, profiles } = await fetchUserActivity(userId);
                setEvents(data);

                // Fetch actor profiles for events with different actors
                const actorIds = [...new Set(
                    data
                        .filter(e => e.actor_user_id && e.actor_user_id !== userId)
                        .map(e => e.actor_user_id)
                )];

                if (actorIds.length > 0) {
                    if (profiles.length) {
                        const profileMap: Record<string, ActorProfile> = {};
                        profiles.forEach(p => { profileMap[p.id] = p; });
                        setActorProfiles(profileMap);
                    }
                }
            } catch { /* activity is supplementary and may be unavailable */ }
            setLoading(false);
        };

        if (userId) {
            fetchEvents();
        }
    }, [userId]);

    const getEventConfig = (type: string) => {
        return EVENT_CONFIG[type] || {
            label: type.replace(/_/g, ' '),
            severity: 'neutral' as Severity,
            icon: <Activity className="w-4 h-4" />
        };
    };

    const getActorDisplay = (event: UserEvent): string | null => {
        if (!event.actor_user_id) return 'pelo sistema';
        if (event.actor_user_id === userId) return null; // Self-action, no need to show

        const actor = actorProfiles[event.actor_user_id];
        if (actor) {
            return `por ${actor.name || actor.email}`;
        }

        // Check metadata for admin_id (backward compatibility)
        if (event.metadata?.admin_id) {
            return 'por administrador';
        }

        return null;
    };

    const formatAbsoluteDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return format(date, "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm:ss (z)", { locale: ptBR });
    };

    const formatRelativeDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    };

    if (loading) {
        return (
            <div className="space-y-3 py-2" aria-busy="true" aria-label="Carregando atividade recente">
                <Skeleton className="h-4 w-36" />
                <div className="space-y-2 rounded-lg border border-slate-100 p-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                </div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-6">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nenhuma atividade recente encontrada.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                    Atividade Recente
                </h4>
                {showViewAllLink && (
                    <button
                        onClick={() => navigate(`/admin/audit?target=${userId}`)}
                        className="text-xs text-brand-blue hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                        Ver auditoria completa
                        <ExternalLink className="w-3 h-3" />
                    </button>
                )}
            </div>

            <div className="border border-slate-100 rounded-lg divide-y divide-slate-50 overflow-hidden">
                {events.map((event) => {
                    const config = getEventConfig(event.event_type);
                    const styles = SEVERITY_STYLES[config.severity];
                    const actorDisplay = getActorDisplay(event);
                    const isSuccess = event.status !== 'FAIL';

                    return (
                        <div
                            key={event.id}
                            className="p-3 flex items-start gap-3 hover:bg-slate-50/50 transition-colors"
                        >
                            {/* Icon with severity styling */}
                            <div className={`mt-0.5 p-1.5 rounded-full ${styles.bg} border ${styles.border}`}>
                                <span className={styles.text}>{config.icon}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                                {/* Event label and status */}
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-slate-900">
                                        {config.label}
                                    </p>
                                    {event.status && (
                                        <span className={`inline-flex items-center gap-0.5 text-xs ${isSuccess ? 'text-emerald-600' : 'text-red-600'
                                            }`}>
                                            {isSuccess ? (
                                                <CheckCircle className="w-3 h-3" />
                                            ) : (
                                                <XCircle className="w-3 h-3" />
                                            )}
                                        </span>
                                    )}
                                </div>

                                {/* Date with tooltip */}
                                <p
                                    className="text-xs text-slate-500 mt-0.5 cursor-help"
                                    title={formatAbsoluteDate(event.occurred_at)}
                                >
                                    {formatRelativeDate(event.occurred_at)}
                                    {actorDisplay && (
                                        <span className="text-slate-400"> • {actorDisplay}</span>
                                    )}
                                </p>

                                {/* Role change details */}
                                {event.event_type === 'ROLE_CHANGED' && event.metadata && (
                                    <div className="mt-1.5 text-xs bg-amber-50 px-2 py-1 rounded text-amber-700 inline-block">
                                        {event.metadata.old_role} → {event.metadata.new_role}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
