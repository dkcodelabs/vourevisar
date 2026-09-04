import { useEffect, useState } from 'react';
import type { ErrorLogRecord } from '@/lib/errors/types';

export const useSystemErrorsSelection = (errors: ErrorLogRecord[], resetKey: unknown) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        setSelectedIds(new Set());
    }, [resetKey]);

    const toggleSelectAll = () => {
        setSelectedIds(current => current.size === errors.length && errors.length > 0
            ? new Set()
            : new Set(errors.map(error => error.id)));
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds(current => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return { selectedIds, setSelectedIds, toggleSelectAll, toggleSelectOne };
};
