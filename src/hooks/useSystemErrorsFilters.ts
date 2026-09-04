import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SystemErrorFilters } from '@/services/adminSystemErrorsService';

export const useSystemErrorsFilters = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [filters, setFilters] = useState<SystemErrorFilters>({
        status: searchParams.get('status') || 'all',
        severity: searchParams.get('severity') || 'all',
        scope: searchParams.get('scope') || 'all',
        category: searchParams.get('category') || 'all',
        recoverability: searchParams.get('recoverability') || 'all',
        search: searchParams.get('search') || '',
        environment: searchParams.get('environment') || 'production',
    });

    useEffect(() => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== 'all') params.set(key, value);
        });
        setSearchParams(params, { replace: true });
    }, [filters, setSearchParams]);

    const activeFilters = useMemo(() => Object.entries(filters).filter(([key, value]) =>
        value && value !== 'all' && key !== 'search' && key !== 'environment'
    ), [filters]);

    const clearFilters = () => setFilters(prev => ({
        ...prev,
        status: 'all', severity: 'all', scope: 'all', category: 'all', recoverability: 'all', search: '',
    }));
    const removeFilter = (key: string) => setFilters(prev => ({ ...prev, [key]: 'all' }));

    return { activeFilters, clearFilters, filters, removeFilter, setFilters };
};
