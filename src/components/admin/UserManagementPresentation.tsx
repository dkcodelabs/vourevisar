import type { ReactNode } from 'react';
import type { AdminUser } from '@/hooks/useAdminUsers';

export const filterAdminUsers = (users: AdminUser[], viewMode: 'active' | 'archived', searchTerm: string) => {
    const query = searchTerm.toLowerCase();
    return users.filter(user => {
        const matchesSearch = user.name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query);
        return Boolean(matchesSearch) && (viewMode === 'archived' ? Boolean(user.deleted_at) : !user.deleted_at);
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getAdminRoleBadge = (role: string, isOwner: boolean): ReactNode => {
    if (!isOwner && role !== 'admin') return null;
    const roleConfig: Record<string, { label: string; className: string }> = {
        owner: { label: 'Proprietário', className: 'bg-purple-100 text-purple-700 border-purple-200' },
        admin: { label: 'Admin', className: 'bg-blue-100 text-blue-600 border-blue-200' },
        moderator: { label: 'Moderador', className: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
    };
    const config = roleConfig[role];
    return config ? <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.className}`}>{config.label}</span> : null;
};
