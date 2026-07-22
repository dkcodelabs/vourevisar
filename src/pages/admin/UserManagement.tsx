/**
 * MODULE: UserManagement
 * 
 * RESPONSIBILITY:
 * - CRUD operations for users (List, View, simplistic Edit).
 * - Basic access control toggles (Activate/Deactivate).
 * - Viewing high-level user metadata (Roles, Auth Source).
 * - Soft Delete (Archive) and Restore functionality.
 * 
 * SCOPE STATUS: FROZEN ❄️
 * - This module is considered feature-complete for administrative purposes.
 * - No new features should be added here.
 * 
 * EXCLUSIONS (DO NOT ADD):
 * - Complex analytics or activity heatmaps (Use Statistics module).
 * - Granular permission editing (Use RolesManagement).
 * - Financial data/payment history (Use SubscriptionManagement).
 */
import React, { useState, useMemo } from 'react';
import {
    Search, Filter, MoreVertical,
    Eye, Edit, Power, RefreshCw, Trash2, Mail, Calendar, Shield, Zap, Archive, Undo2, UserX, Loader2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { invokeAdminRpc } from '@/services/adminRpcService';
import { formatLastAccess, formatJoinDate } from '@/utils/adminDateFormatter';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useAdminUsers, AdminUser } from '@/hooks/useAdminUsers';
import { toast } from '@/lib/toast';
import { supabase } from '@/integrations/supabase/client';
import { EditRoleModal } from '@/components/admin/EditRoleModal';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from '@/hooks/useUserRole';
import { UserActivityList } from '@/components/admin/UserActivityList';
import { errorService } from '@/lib/errors/errorService';
import { toastGate } from '@/lib/errors/toastGate';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { UserAvatar } from '@/components/ui/UserAvatar';

type AdminAiLimits = {
    limit: number;
    usage: number;
    plan: string;
    status: string;
    has_bypass: boolean;
};

const UserAiUsageBadge = ({ userId }: { userId: string }) => {
    const [limits, setLimits] = React.useState<AdminAiLimits | null>(null);
    const [loading, setLoading] = React.useState(false);

    const loadLimits = React.useCallback(async () => {
        setLoading(true);
        try {
            const parsed = await invokeAdminRpc<AdminAiLimits | null>('get_user_ai_limits_admin', {
                target_user_id: userId,
            });
            if (!parsed) throw new Error('Limite de IA não retornado pelo servidor.');
            setLimits(parsed);
        } catch (err) {
            console.error("Erro ao carregar limites IA do usuário:", err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        void loadLimits();

        const refresh = () => {
            if (!document.hidden) void loadLimits();
        };
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        window.addEventListener('editalUpdated', refresh);
        window.addEventListener('subjectUpdated', refresh);

        return () => {
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', refresh);
            window.removeEventListener('editalUpdated', refresh);
            window.removeEventListener('subjectUpdated', refresh);
        };
    }, [loadLimits]);

    const handleResetQuota = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const confirm = window.confirm(`Deseja zerar a cota de IA deste usuário liberando novas importações com IA para o mês corrente? (Isso não apagará nenhum edital ou progresso do estudante).`);
        if (!confirm) return;

        try {
            await invokeAdminRpc('reset_user_ai_quota', { target_user_id: userId });
            toast.success("Cota de IA liberada com sucesso!");
            await loadLimits();
        } catch (err) {
            console.error(err);
            toastGate.notifyError("Erro ao liberar cota.", "ADMIN-AI-LIMIT-RESET");
        }
    };

    if (loading) {
        return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
    }

    if (!limits) return <span className="text-xs text-slate-400">-</span>;

    if (limits.has_bypass) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800" title="Acesso ilimitado à IA">
                Ilimitado
            </span>
        );
    }

    const isExceeded = limits.usage >= limits.limit;
    const canResetQuota = limits.limit > 0 && isExceeded;

    return (
        <div className="flex items-center gap-2">
            <span 
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                    isExceeded 
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800' 
                        : limits.plan !== 'free_trial' 
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800' 
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800'
                }`}
                title={`Plano: ${limits.plan} | Consumido: ${limits.usage}/${limits.limit}`}
            >
                {limits.usage} / {limits.limit}
            </span>
            {canResetQuota && (
                <button
                    onClick={handleResetQuota}
                    className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded transition-all"
                    title="Zerar cota e liberar créditos IA de cortesia"
                >
                    <Zap size={11} />
                </button>
            )}
        </div>
    );
};

const UserManagement = () => {
    const { users: dbUsers, loading, error, refetch } = useAdminUsers();

    // Local state for optimistic updates
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

    // Role Modal State
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [userToEditRole, setUserToEditRole] = useState<AdminUser | null>(null);

    // Sync db users to local state when loaded
    React.useEffect(() => {
        if (dbUsers.length > 0) {
            setUsers(dbUsers);
        }
    }, [dbUsers]);

    // Role check
    const { isOwner } = useUserRole();

    const [userToObject, setUserToObject] = useState<{ id: string, name: string, email?: string, action: 'archive' | 'restore' | 'delete' | 'purge' } | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [purgeConfirmText, setPurgeConfirmText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter users based on viewMode and search
    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()));

        const isArchived = !!user.deleted_at;
        const matchesMode = viewMode === 'archived' ? isArchived : !isArchived;

        return matchesSearch && matchesMode;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Helper to render role badge
    const renderRoleBadge = (role: string) => {
        // Validation: Only owners see detailed roles. Others see only 'Admin' (if configured) or nothing.
        // For now, adhering to: "somente propietario ve essa flag"
        if (!isOwner && role !== 'admin') return null;

        switch (role) {
            case 'owner':
                return (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 border border-purple-200">
                        Proprietário
                    </span>
                );
            case 'admin':
                return (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-600 border border-blue-200">
                        Admin
                    </span>
                );
            case 'moderator':
                return (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-600 border border-indigo-200">
                        Moderador
                    </span>
                );
            default:
                return null;
        }
    };



    const handleArchiveUser = async () => {

        if (!userToObject || userToObject.action !== 'archive') return;

        // Hardcoded protection
        if (selectedUser?.email && PROTECTED_EMAILS.includes(selectedUser.email)) {
            toastGate.notifyError("Este usuário é protegido e não pode ser arquivado.", "USER-PROT-01", { severity: 'low' });
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', userToObject.id);

            if (error) throw error;

            // Optimistic Update
            setUsers(users.map(u => u.id === userToObject.id ? { ...u, deleted_at: new Date().toISOString(), status: 'Archived' } : u));
            toast.success(`Usuário arquivado com sucesso`);
        } catch (error: unknown) {
            console.error('Error archiving user:', error);
            await errorService.report(error, {
                module: 'users',
                action: 'archive_user',
                severity: 'medium',
                metadata: {
                    userId: userToObject.id,
                    userName: userToObject.name
                },
            });
        } finally {
            setUserToObject(null);
        }
    };

    const handleRestoreUser = async () => {
        if (!userToObject || userToObject.action !== 'restore') return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ deleted_at: null })
                .eq('id', userToObject.id);

            if (error) throw error;

            // Optimistic Update
            setUsers(users.map(u => u.id === userToObject.id ? { ...u, deleted_at: null, status: 'Active' } : u));
            toast.success(`Usuário restaurado com sucesso`);
        } catch (error: unknown) {
            console.error('Error restoring user:', error);
            await errorService.report(error, {
                module: 'users',
                action: 'restore_user',
                severity: 'medium',
                metadata: {
                    userId: userToObject.id,
                    userName: userToObject.name
                },
            });
        } finally {
            setUserToObject(null);
        }
    };

    const handleHardDeleteUser = async () => {
        if (!userToObject || userToObject.action !== 'delete') return;

        try {
            // Permanent deletion must remove auth.users and every dependent row.
            // Deleting only profiles leaves the JWT valid and the app can recreate the profile.
            await invokeAdminRpc('admin_purge_user', {
                p_target_user_id: userToObject.id
            });

            setUsers(users.filter(u => u.id !== userToObject.id));
            toast.success(`Usuário excluído permanentemente`);
        } catch (error: unknown) {
            console.error('Error deleting user:', error);
            await errorService.report(error, {
                module: 'users',
                action: 'delete_user',
                severity: 'high',
                metadata: {
                    userId: userToObject.id,
                    userName: userToObject.name
                },
            });
        } finally {
            setUserToObject(null);
        }
    };

    const handlePurgeUser = async () => {
        if (!userToObject || userToObject.action !== 'purge') return;
        if (purgeConfirmText !== 'EXCLUIR') return;

        try {
            await invokeAdminRpc('admin_purge_user', {
                p_target_user_id: userToObject.id
            });

            setUsers(users.filter(u => u.id !== userToObject.id));
            toast.success(`Usuário ${userToObject.name} excluído completamente do sistema.`);
        } catch (error: unknown) {
            console.error('Error purging user:', error);
            const message = error instanceof Error ? error.message : 'Erro desconhecido ao excluir usuário.';
            toastGate.notifyError(message, 'USER-PURGE-ERR', { severity: 'critical' });
            await errorService.report(error, {
                module: 'users',
                action: 'purge_user',
                severity: 'critical',
                metadata: {
                    userId: userToObject.id,
                    userName: userToObject.name,
                    userEmail: userToObject.email
                },
            });
        } finally {
            setUserToObject(null);
            setPurgeConfirmText('');
        }
    };

    const isPurgeConfirmed = useMemo(() => purgeConfirmText === 'EXCLUIR', [purgeConfirmText]);

    // List of emails that cannot be deleted, archived, or modified
    const PROTECTED_EMAILS = ['vourevisar@gmail.com', 'darciliok@gmail.com'];

    const handleToggleStatus = async (user: AdminUser) => {
        if (PROTECTED_EMAILS.includes(user.email || '')) {
            toastGate.notifyError("Este usuário é protegido e seu acesso não pode ser alterado.", "USER-PROT-02", { severity: 'low' });
            return;
        }

        // Determine current active state (default true if undefined/null)
        const isCurrentlyActive = user.is_active !== false;
        const newActiveState = !isCurrentlyActive;
        const rpcFunction = newActiveState ? 'admin_reactivate_user' : 'admin_deactivate_user';

        try {
            // 1. Call RPC to toggle access (Security Layer)
            await invokeAdminRpc(rpcFunction, { target_user_id: user.id });

            // 2. Update Subscription Status (Business Layer)
            const newSubStatus = newActiveState ? 'active' : 'canceled';
            const { error: subError } = await supabase
                .from('user_subscriptions')
                .update({ status: newSubStatus })
                .eq('user_id', user.id);

            if (subError) {
                console.error('Error updating subscription:', subError);
                // Non-blocking error, user access changed but sub failed
                toastGate.notifyError('Acesso alterado, mas houve erro ao atualizar assinatura.', "USER-SUB-ERR", { severity: 'medium' });
            }

            // 3. Optimistic Update
            setUsers(users.map(u => u.id === user.id ? {
                ...u,
                status: newActiveState ? 'Active' : 'Inactive',
                is_active: newActiveState
            } : u));

            toast.success(`Usuário ${newActiveState ? 'ativado' : 'desativado'} com sucesso`);

        } catch (error: unknown) {
            console.error('Error updating status:', error);
            await errorService.report(error, {
                module: 'users',
                action: 'toggle_user_status',
                severity: 'medium',
                metadata: {
                    userId: user.id,
                    userName: user.name,
                    targetStatus: newActiveState ? 'active' : 'inactive'
                },
            });
        }
    };

    const handleResetPassword = async (user: AdminUser) => {
        if (!user.email || user.email.includes('No email')) {
            toastGate.notifyError('Usuário sem email válido para recuperação.', "USER-NO-EMAIL", { severity: 'low' });
            return;
        }

        if (PROTECTED_EMAILS.includes(user.email)) {
            toastGate.notifyError("Este usuário é protegido e a senha não pode ser redefinida por aqui.", "USER-PROT-03", { severity: 'low' });
            return;
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;
            toast.success(`Email de redefinição de senha enviado para ${user.email}`);
        } catch (error: unknown) {
            console.error('Error sending reset email:', error);
            await errorService.report(error, {
                module: 'users',
                action: 'reset_password',
                severity: 'low',
                metadata: {
                    userId: user.id,
                    userName: user.name,
                    userEmail: user.email
                },
            });
        }
    };

    const handleEditPermissions = (user: AdminUser) => {
        setUserToEditRole(user);
        setIsRoleModalOpen(true);
    };



    if (loading) {
        return <LoadingSpinner size="large" showText fullPage />;
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-slate-900 dark:text-slate-100">

            {/* 2. Controls */}
            <div className="glow-card p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border border-black/5 dark:border-white/5">
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar usuário, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 focus:border-primary/30 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm shadow-sm text-slate-900 dark:text-slate-200"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'active' | 'archived')} className="w-full sm:w-auto">
                        <TabsList className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-lg p-1 text-slate-500 dark:text-slate-400">
                            <TabsTrigger value="active" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white text-sm data-[state=active]:shadow-sm transition-all px-4 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">Ativos ({users.filter(u => !u.deleted_at).length})</TabsTrigger>
                            <TabsTrigger value="archived" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 dark:data-[state=active]:text-white text-sm data-[state=active]:shadow-sm transition-all px-4 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">Arquivados ({users.filter(u => u.deleted_at).length})</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* 3. Table */}
            <div className="glass-card rounded-2xl overflow-hidden border border-black/5 dark:border-white/5">
                {error ? (
                    <div className="p-12 text-center text-rose-500 text-sm bg-rose-50 dark:bg-rose-500/10">
                        <span className="font-semibold block mb-1">Erro ao carregar usuários</span>
                        {error}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                                    <th className="px-6 py-4 w-[40px]">
                                        <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-primary focus:ring-primary w-4 h-4 opacity-50 cursor-not-allowed" disabled />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuário</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acesso</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Matrizes IA</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Último acesso</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Data de adição</th>
                                    <th className="px-6 py-4 w-[50px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`group hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors duration-150 ${user.status === 'Inactive' ? 'opacity-60 grayscale bg-slate-50/50 dark:bg-transparent' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-primary focus:ring-primary w-4 h-4 opacity-50 cursor-not-allowed" disabled />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar 
                                                    src={user.avatar_url} 
                                                    name={user.name} 
                                                    className="w-9 h-9 border-slate-200 dark:border-slate-700"
                                                    fallbackClassName="text-xs"
                                                />
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                            {user.name}
                                                        </span>
                                                        {renderRoleBadge(user.role)}
                                                        {user.status === 'Inactive' && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                                                Desativado
                                                            </span>
                                                        )}
                                                        {user.email_confirmed === false && !user.deleted_at && user.status !== 'Inactive' && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                Aguardando confirmação
                                                            </span>
                                                        )}
                                                        {user.deleted_at && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                                                Arquivado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                                                        {user.email || 'Sem email'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                {user.source?.includes('Email') && (
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm" title="Email">
                                                        <Mail className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                                    </div>
                                                )}
                                                {user.source?.includes('Google') && (
                                                    <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm" title="Google">
                                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <UserAiUsageBadge userId={user.id} />
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help decoration-dotted underline-offset-2 hover:underline">
                                                        {formatLastAccess(user.last_access_at).label}
                                                    </span>
                                                </TooltipTrigger>
                                                {formatLastAccess(user.last_access_at).tooltip && (
                                                    <TooltipContent>
                                                        <p>{formatLastAccess(user.last_access_at).tooltip}</p>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help decoration-dotted underline-offset-2 hover:underline">
                                                        {formatJoinDate(user.created_at).label}
                                                    </span>
                                                </TooltipTrigger>
                                                {formatJoinDate(user.created_at).tooltip && (
                                                    <TooltipContent>
                                                        <p>{formatJoinDate(user.created_at).tooltip}</p>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 outline-none transition-colors data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800 data-[state=open]:text-slate-600 dark:data-[state=open]:text-slate-200">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[180px] p-1 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg shadow-black/5 dark:shadow-black/20">
                                                        <DropdownMenuItem
                                                            onClick={() => setSelectedUser(user)}
                                                            className="gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300 text-xs py-2 px-3 focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-slate-900 dark:focus:text-white rounded-sm"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                                            Ver perfil
                                                        </DropdownMenuItem>

                                                        {viewMode === 'active' && (
                                                            <>
                                                                {PROTECTED_EMAILS.includes(user.email || '') ? (
                                                                    <DropdownMenuItem disabled className="gap-2.5 cursor-not-allowed opacity-70 text-slate-500 text-xs py-2 px-3 rounded-sm">
                                                                        <Shield className="w-3.5 h-3.5" />
                                                                        Usuário Protegido
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <>
                                                                        <DropdownMenuItem
                                                                            onClick={() => handleEditPermissions(user)}
                                                                            className="gap-2.5 cursor-pointer text-slate-700 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm"
                                                                        >
                                                                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                                                                            Editar permissões
                                                                        </DropdownMenuItem>

                                                                        <DropdownMenuSeparator className="bg-slate-50 my-1" />

                                                                        <DropdownMenuItem
                                                                            onClick={() => handleToggleStatus(user)}
                                                                            className="gap-2.5 cursor-pointer text-slate-600 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm"
                                                                        >
                                                                            <Power className="w-3.5 h-3.5 text-slate-400" />
                                                                            {user.status === 'Active' ? 'Desativar acesso' : 'Ativar acesso'}
                                                                        </DropdownMenuItem>

                                                                        <DropdownMenuItem
                                                                            onClick={() => handleResetPassword(user)}
                                                                            className="gap-2.5 cursor-pointer text-slate-600 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm"
                                                                        >
                                                                            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                                                                            Redefinir senha
                                                                        </DropdownMenuItem>

                                                                        <DropdownMenuSeparator className="bg-slate-50 my-1" />

                                                                        <DropdownMenuItem
                                                                            onSelect={() => setUserToObject({ id: user.id, name: user.name || 'Usuário', action: 'archive' })}
                                                                            className="gap-2.5 cursor-pointer text-rose-600 text-xs py-2 px-3 focus:bg-rose-50 focus:text-rose-700 rounded-sm"
                                                                        >
                                                                            <Archive className="w-3.5 h-3.5 opacity-70" />
                                                                            Arquivar usuário
                                                                        </DropdownMenuItem>

                                                                        <DropdownMenuItem
                                                                            onSelect={() => setUserToObject({ id: user.id, name: user.name || 'Usuário', email: user.email || '', action: 'purge' })}
                                                                            className="gap-2.5 cursor-pointer text-rose-600 text-xs py-2 px-3 focus:bg-rose-50 focus:text-rose-700 rounded-sm"
                                                                        >
                                                                            <UserX className="w-3.5 h-3.5 opacity-70" />
                                                                            Excluir usuário
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}

                                                        {viewMode === 'archived' && (
                                                            <>
                                                                <DropdownMenuSeparator className="bg-slate-50 dark:bg-slate-800 my-1" />
                                                                <DropdownMenuItem
                                                                    onSelect={() => setUserToObject({ id: user.id, name: user.name || 'Usuário', action: 'restore' })}
                                                                    className="gap-2.5 cursor-pointer text-emerald-600 dark:text-emerald-400 text-xs py-2 px-3 focus:bg-emerald-50 dark:focus:bg-emerald-900/30 focus:text-emerald-700 dark:focus:text-emerald-300 rounded-sm"
                                                                >
                                                                    <Undo2 className="w-3.5 h-3.5 opacity-70" />
                                                                    Restaurar usuário
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onSelect={() => setUserToObject({ id: user.id, name: user.name || 'Usuário', action: 'delete' })}
                                                                    className="gap-2.5 cursor-pointer text-rose-600 dark:text-rose-400 text-xs py-2 px-3 focus:bg-rose-50 dark:focus:bg-rose-900/30 focus:text-rose-700 dark:focus:text-rose-300 rounded-sm"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 opacity-70" />
                                                                    Excluir permanentemente
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {!loading && filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                                            Nenhum usuário encontrado {viewMode === 'archived' ? 'nos arquivos' : ''} para "{searchTerm}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination - Minimalist */}
                <div className="bg-transparent px-6 py-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        Página <span className="font-medium text-slate-900 dark:text-slate-100">1</span> de <span className="font-medium text-slate-900 dark:text-slate-100">1</span>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-transparent border border-slate-200 dark:border-slate-800 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>
                            Anterior
                        </button>
                        <button className="px-3 py-1.5 bg-transparent border border-slate-200 dark:border-slate-800 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>
                            Próxima
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Confirmation Dialog (Archive, Restore, Delete) */}
            <AlertDialog open={!!userToObject && userToObject.action !== 'purge'} onOpenChange={(open) => !open && setUserToObject(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {userToObject?.action === 'archive' && 'Arquivar usuário?'}
                            {userToObject?.action === 'restore' && 'Restaurar usuário?'}
                            {userToObject?.action === 'delete' && 'Excluir permanentemente?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {userToObject?.action === 'archive' && `O usuário ${userToObject.name} perderá o acesso, mas seus dados serão preservados. Você poderá restaurá-lo futuramente.`}
                            {userToObject?.action === 'restore' && `O usuário ${userToObject.name} recuperará o acesso imediato à plataforma.`}
                            {userToObject?.action === 'delete' && `ATENÇÃO: Esta ação é IRREVERSÍVEL. Todos os dados do usuário ${userToObject.name} serão apagados para sempre.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        {userToObject?.action === 'archive' && (
                            <AlertDialogAction onClick={handleArchiveUser} className="bg-amber-600 hover:bg-amber-700 text-white border-transparent">
                                Sim, arquivar
                            </AlertDialogAction>
                        )}
                        {userToObject?.action === 'restore' && (
                            <AlertDialogAction onClick={handleRestoreUser} className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">
                                Sim, restaurar
                            </AlertDialogAction>
                        )}
                        {userToObject?.action === 'delete' && (
                            <AlertDialogAction onClick={handleHardDeleteUser} className="bg-rose-600 hover:bg-rose-700 text-white border-transparent">
                                Sim, excluir permanentemente
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Purge User Confirmation Dialog - Requires typing EXCLUIR */}
            <AlertDialog 
                open={userToObject?.action === 'purge'} 
                onOpenChange={(open) => {
                    if (!open) {
                        setUserToObject(null);
                        setPurgeConfirmText('');
                    }
                }}
            >
                <AlertDialogContent className="border-rose-200 dark:border-rose-800/50">
                    <AlertDialogHeader>
                        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                            <UserX className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                        </div>
                        <AlertDialogTitle className="text-center text-lg">
                            Excluir usuário completamente?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                                    Você está prestes a excluir <strong className="text-slate-900 dark:text-slate-100">{userToObject?.name}</strong> ({userToObject?.email}) permanentemente.
                                </p>
                                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 p-3 text-xs text-rose-700 dark:text-rose-300 space-y-1.5">
                                    <p className="font-semibold">⚠️ Esta ação é IRREVERSÍVEL e irá:</p>
                                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                                        <li>Remover todas as matérias, tópicos e revisões</li>
                                        <li>Remover editais, ciclos e sessões de estudo</li>
                                        <li>Remover notas, lembretes e notificações</li>
                                        <li>Remover assinatura e histórico de pagamentos</li>
                                        <li>Excluir a conta de login (auth) completamente</li>
                                    </ul>
                                </div>
                                <div className="pt-1">
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                                        Digite <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">EXCLUIR</span> para confirmar:
                                    </label>
                                    <Input
                                        value={purgeConfirmText}
                                        onChange={(e) => setPurgeConfirmText(e.target.value)}
                                        placeholder="Digite EXCLUIR"
                                        className={`text-sm font-mono tracking-wider text-center transition-colors ${
                                            purgeConfirmText.length > 0 && !isPurgeConfirmed 
                                                ? 'border-rose-300 dark:border-rose-700 focus-visible:ring-rose-500' 
                                                : isPurgeConfirmed 
                                                    ? 'border-emerald-300 dark:border-emerald-700 focus-visible:ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                                                    : ''
                                        }`}
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-2">
                        <AlertDialogCancel onClick={() => setPurgeConfirmText('')}>Cancelar</AlertDialogCancel>
                        <button
                            onClick={handlePurgeUser}
                            disabled={!isPurgeConfirmed}
                            className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                                isPurgeConfirmed
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                            }`}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir permanentemente
                        </button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* View Profile Sheet */}
            <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader className="mb-6">
                        <SheetTitle>Perfil do Usuário</SheetTitle>
                        <SheetDescription>
                            Informações detalhadas sobre este usuário.
                        </SheetDescription>
                    </SheetHeader>

                    {selectedUser && (
                        <div className="space-y-6">
                            {/* Profile Header */}
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <UserAvatar 
                                    src={selectedUser.avatar_url} 
                                    name={selectedUser.name} 
                                    className="w-16 h-16 border-slate-200 shadow-sm"
                                    fallbackClassName="text-xl"
                                />
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{selectedUser.name}</h3>
                                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${selectedUser.role === 'admin'
                                            ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                            : 'border-slate-200 text-slate-600 bg-slate-100'
                                            }`}>
                                            {selectedUser.role === 'admin' ? 'Admin' : 'Usuário'}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${selectedUser.source?.includes('Google')
                                            ? 'border-blue-200 text-blue-700 bg-blue-50'
                                            : 'border-slate-200 text-slate-600 bg-slate-100'
                                            }`}>
                                            {selectedUser.source === 'Email, Google' ? 'Email & Google' : selectedUser.source || 'Email'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Details List */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Detalhes da Conta</h4>
                                <div className="grid gap-3">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Mail className="w-4 h-4" /> Email</span>
                                        <span className="text-sm font-medium text-slate-900">{selectedUser.email}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Data de adição</span>
                                        <span className="text-sm font-medium text-slate-900">{formatJoinDate(selectedUser.created_at).label}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Shield className="w-4 h-4" /> Nível de Permissão</span>
                                        <span className="text-sm font-medium text-slate-900 capitalize">{selectedUser.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Zap className="w-4 h-4" /> Status da Assinatura</span>
                                        <span className={`text-sm font-medium ${selectedUser.status === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {selectedUser.status === 'Active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Archive className="w-4 h-4" /> Status de Arquivamento</span>
                                        <span className={`text-sm font-medium ${selectedUser.deleted_at ? 'text-amber-600' : 'text-slate-600'}`}>
                                            {selectedUser.deleted_at ? `Arquivado em ${formatJoinDate(selectedUser.deleted_at).label}` : 'Ativo'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Section */}
                            <div className="pt-4 border-t border-slate-100">
                                <UserActivityList userId={selectedUser.id} />
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
            {/* Role Editor Modal */}
            <EditRoleModal
                isOpen={isRoleModalOpen}
                onClose={() => setIsRoleModalOpen(false)}
                user={userToEditRole}
                onRoleUpdated={() => {
                    refetch();
                }}
            />
        </div>
    );
};

export default UserManagement;
