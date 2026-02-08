import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Activity, ShieldAlert, LogIn, LogOut, Slash } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserEvent {
    id: number;
    event_type: string;
    occurred_at: string;
    metadata: any;
    source?: string;
}

interface UserActivityListProps {
    userId: string;
}

export const UserActivityList: React.FC<UserActivityListProps> = ({ userId }) => {
    const [events, setEvents] = useState<UserEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_events')
                .select('*')
                .eq('user_id', userId)
                .order('occurred_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                setEvents(data);
            }
            setLoading(false);
        };

        if (userId) {
            fetchEvents();
        }
    }, [userId]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'LOGIN': return <LogIn className="w-4 h-4 text-emerald-500" />;
            case 'LOGOUT': return <LogOut className="w-4 h-4 text-slate-400" />;
            case 'ACCOUNT_DEACTIVATED': return <Slash className="w-4 h-4 text-red-500" />;
            case 'ACCOUNT_REACTIVATED': return <Activity className="w-4 h-4 text-emerald-500" />;
            case 'SESSION_START': return <Activity className="w-4 h-4 text-blue-400" />;
            default: return <Activity className="w-4 h-4 text-slate-400" />;
        }
    };

    const getLabel = (type: string) => {
        switch (type) {
            case 'LOGIN': return 'Login realizado';
            case 'LOGOUT': return 'Logout';
            case 'ACCOUNT_DEACTIVATED': return 'Conta desativada';
            case 'ACCOUNT_REACTIVATED': return 'Conta reativada';
            case 'SESSION_START': return 'Sessão iniciada';
            default: return type.replace(/_/g, ' ');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
        );
    }

    if (events.length === 0) {
        return <div className="text-sm text-slate-500 italic">Nenhuma atividade recente encontrada.</div>;
    }

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Atividade Recente</h4>
            <div className="border border-slate-100 rounded-lg divide-y divide-slate-50">
                {events.map((event) => (
                    <div key={event.id} className="p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                        <div className="mt-0.5 p-1.5 rounded-full bg-slate-50 border border-slate-100">
                            {getIcon(event.event_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                                {getLabel(event.event_type)}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {format(new Date(event.occurred_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                                <div className="mt-1.5 text-xs bg-slate-50 p-1.5 rounded text-slate-600 font-mono overflow-x-auto">
                                    {JSON.stringify(event.metadata)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
