import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReadyEdital } from './ReadyEditalCatalog';

export function useCatalogEditais(isOpen: boolean) {
    const [editais, setEditais] = useState<ReadyEdital[]>([]);
    const [loadingEditais, setLoadingEditais] = useState(true);
    const [importingReadyEditalId, setImportingReadyEditalId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [expandedCatalogEditalId, setExpandedCatalogEditalId] = useState<string | null>(null);
    const [expandedCatalogSubjectKeys, setExpandedCatalogSubjectKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchPublicEditais = async () => {
            try {
                const { data, error } = await supabase
                    .from('public_editais')
                    .select('*')
                    .eq('is_public', true)
                    .order('created_at', { ascending: false });
                
                if (!error && data) {
                    setEditais(data as ReadyEdital[]);
                }
            } catch (err) {
                console.error('Error fetching global editais:', err);
            } finally {
                setLoadingEditais(false);
            }
        };

        if (isOpen) {
            fetchPublicEditais();
        }
    }, [isOpen]);

    const filteredEditais = useMemo(() => {
        return editais.filter(e => {
            const matchesSearch = `${e.organ} ${e.position}`.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'Todos' || e.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [editais, searchQuery, selectedCategory]);

    const handleToggleCatalogEdital = (editalId: string) => {
        setExpandedCatalogEditalId(prev => prev === editalId ? null : editalId);
    };

    const handleToggleCatalogSubject = (subjectKey: string) => {
        setExpandedCatalogSubjectKeys(prev => {
            const next = new Set(prev);
            if (next.has(subjectKey)) {
                next.delete(subjectKey);
            } else {
                next.add(subjectKey);
            }
            return next;
        });
    };

    return {
        editais,
        filteredEditais,
        loadingEditais,
        importingReadyEditalId,
        setImportingReadyEditalId,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        expandedCatalogEditalId,
        handleToggleCatalogEdital,
        expandedCatalogSubjectKeys,
        handleToggleCatalogSubject,
    };
}
