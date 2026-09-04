import { useCallback, useState } from 'react';

export function useEditalSelection() {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(previous => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);
    return { selectedIds, setSelectedIds, toggleSelect };
}
