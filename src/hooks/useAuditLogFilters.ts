import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { endOfDay, startOfDay, subDays } from 'date-fns';

export const useAuditLogFilters = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [period, setPeriod] = useState(searchParams.get('period') || '7days');
    const [eventType, setEventType] = useState(searchParams.get('type') || '');
    const [targetUserId, setTargetUserId] = useState(searchParams.get('target') || '');
    const [actorUserId, setActorUserId] = useState(searchParams.get('actor') || '');
    const [status, setStatus] = useState(searchParams.get('status') || '');
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const getDateRange = useCallback(() => {
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = endOfDay(now);
        switch (period) {
            case 'today': startDate = startOfDay(now); break;
            case '7days': startDate = startOfDay(subDays(now, 7)); break;
            case '30days': startDate = startOfDay(subDays(now, 30)); break;
            case '90days': startDate = startOfDay(subDays(now, 90)); break;
            case 'custom':
                startDate = customStartDate ? new Date(customStartDate) : null;
                endDate = customEndDate ? endOfDay(new Date(customEndDate)) : null;
                break;
        }
        return { startDate, endDate };
    }, [period, customStartDate, customEndDate]);

    useEffect(() => {
        const params: Record<string, string> = {};
        if (period !== '7days') params.period = period;
        if (eventType) params.type = eventType;
        if (targetUserId) params.target = targetUserId;
        if (actorUserId) params.actor = actorUserId;
        if (status) params.status = status;
        if (searchQuery) params.q = searchQuery;
        setSearchParams(params, { replace: true });
    }, [period, eventType, targetUserId, actorUserId, status, searchQuery, setSearchParams]);

    const resetFilters = () => {
        setPeriod('7days'); setEventType(''); setTargetUserId(''); setActorUserId(''); setStatus(''); setSearchQuery('');
    };

    return {
        actorUserId, customEndDate, customStartDate, eventType, getDateRange, period, resetFilters, searchQuery, setActorUserId,
        setCustomEndDate, setCustomStartDate, setEventType, setPeriod, setSearchQuery, setStatus, setTargetUserId,
        status, targetUserId,
    };
};
