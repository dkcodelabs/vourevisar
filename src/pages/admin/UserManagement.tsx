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
import React, { useState } from 'react';
import {
    Search, Filter, MoreVertical,
    Eye, Edit, Power, RefreshCw, Trash2, Mail, Calendar, Shield, Zap, Archive, Undo2
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

    const [userToObject, setUserToObject] = useState<{ id: string, name: string, action: 'archive' | 'restore' | 'delete' } | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
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
            toast.error("Este usuário é protegido e não pode ser arquivado.");
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
        } catch (error: any) {
            console.error('Error archiving user:', error);
            toast.error('Erro ao arquivar usuário: ' + (error.message || 'Erro desconhecido'));
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
        } catch (error: any) {
            console.error('Error restoring user:', error);
            toast.error('Erro ao restaurar usuário: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setUserToObject(null);
        }
    };

    const handleHardDeleteUser = async () => {
        if (!userToObject || userToObject.action !== 'delete') return;

        try {
            const { error } = await supabase.from('profiles').delete().eq('id', userToObject.id);

            if (error) throw error;

            setUsers(users.filter(u => u.id !== userToObject.id));
            toast.success(`Usuário excluído permanentemente`);
        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast.error('Erro ao excluir usuário: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setUserToObject(null);
        }
    };

    // List of emails that cannot be deleted, archived, or modified
    const PROTECTED_EMAILS = ['vourevisar@gmail.com', 'darciliok@gmail.com'];

    const handleToggleStatus = async (user: AdminUser) => {
        if (PROTECTED_EMAILS.includes(user.email || '')) {
            toast.error("Este usuário é protegido e seu acesso não pode ser alterado.");
            return;
        }

        // Determine current active state (default true if undefined/null)
        const isCurrentlyActive = user.is_active !== false;
        const newActiveState = !isCurrentlyActive;
        const rpcFunction = newActiveState ? 'admin_reactivate_user' : 'admin_deactivate_user';

        try {
            // 1. Call RPC to toggle access (Security Layer)
            const { error: rpcError } = await supabase.rpc(rpcFunction, { target_user_id: user.id });
            if (rpcError) throw rpcError;

            // 2. Update Subscription Status (Business Layer)
            const newSubStatus = newActiveState ? 'active' : 'canceled';
            const { error: subError } = await supabase
                .from('user_subscriptions')
                .update({ status: newSubStatus })
                .eq('user_id', user.id);

            if (subError) {
                console.error('Error updating subscription:', subError);
                toast.error('Acesso alterado, mas houve erro ao atualizar assinatura.');
            }

            // 3. Optimistic Update
            setUsers(users.map(u => u.id === user.id ? {
                ...u,
                status: newActiveState ? 'Active' : 'Inactive',
                is_active: newActiveState
            } : u));

            toast.success(`Usuário ${newActiveState ? 'ativado' : 'desativado'} com sucesso`);

        } catch (error: any) {
            console.error('Error updating status:', error);
            toast.error('Erro ao atualizar status: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleResetPassword = async (user: AdminUser) => {
        if (!user.email || user.email.includes('No email')) {
            toast.error('Usuário sem email válido para recuperação.');
            return;
        }

        if (PROTECTED_EMAILS.includes(user.email)) {
            toast.error("Este usuário é protegido e a senha não pode ser redefinida por aqui.");
            return;
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
            });

            if (error) throw error;
            toast.success(`Email de redefinição de senha enviado para ${user.email}`);
        } catch (error: any) {
            console.error('Error sending reset email:', error);
            toast.error('Erro ao enviar email: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const handleEditPermissions = (user: AdminUser) => {
        setUserToEditRole(user);
        setIsRoleModalOpen(true);
    };



    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-slate-900">

            {/* 1. Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de usuários</h1>
                <p className="text-slate-500 mt-1.5 text-sm">Gerencie os membros da sua equipe e suas permissões de conta aqui.</p>
            </div>

            {/* 2. Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'active' | 'archived')} className="w-[400px]">
                        <TabsList>
                            <TabsTrigger value="active">Ativos ({users.filter(u => !u.deleted_at).length})</TabsTrigger>
                            <TabsTrigger value="archived">Arquivados ({users.filter(u => u.deleted_at).length})</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative group w-full sm:w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-400 text-sm shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* 3. Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
                        <span className="text-sm">Carregando usuários...</span>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-rose-500 text-sm bg-rose-50">
                        <span className="font-semibold block mb-1">Erro ao carregar usuários</span>
                        {error}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-3 w-[40px]">
                                        <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4" />
                                    </th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500">Usuário</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500">Acesso</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">Último acesso</th>
                                    <th className="px-6 py-3 text-xs font-medium text-slate-500 whitespace-nowrap">Data de adição</th>
                                    <th className="px-6 py-3 w-[50px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`group hover:bg-slate-50/60 transition-colors duration-150 ${user.status === 'Inactive' ? 'opacity-60 grayscale bg-slate-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input type="checkbox" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-medium text-xs overflow-hidden shrink-0">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        user.name ? user.name.charAt(0).toUpperCase() : 'U'
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-slate-900">
                                                            {user.name}
                                                        </span>
                                                        {renderRoleBadge(user.role)}
                                                        {user.status === 'Inactive' && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                                                Desativado
                                                            </span>
                                                        )}
                                                        {user.deleted_at && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-600 border border-rose-200">
                                                                Arquivado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-slate-500 font-normal">
                                                        {user.email || 'Sem email'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                {user.source?.includes('Email') && (
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm" title="Email">
                                                        <Mail className="w-3 h-3 text-slate-500" />
                                                    </div>
                                                )}
                                                {user.source?.includes('Google') && (
                                                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm" title="Google">
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
                                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap tabular-nums">
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
                                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap tabular-nums">
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
                                                    <DropdownMenuTrigger className="p-2 rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 outline-none transition-colors data-[state=open]:bg-slate-100 data-[state=open]:text-slate-600">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[180px] p-1 border-slate-100 shadow-lg/5">
                                                        <DropdownMenuItem
                                                            onClick={() => setSelectedUser(user)}
                                                            className="gap-2.5 cursor-pointer text-slate-700 text-xs py-2 px-3 focus:bg-slate-50 focus:text-slate-900 rounded-sm"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-slate-500" />
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
                                                                    </>
                                                                )}
                                                            </>
                                                        )}

                                                        {viewMode === 'archived' && (
                                                            <>
                                                                <DropdownMenuSeparator className="bg-slate-50 my-1" />
                                                                <DropdownMenuItem
                                                                    onSelect={() => setUserToObject({ id: user.id, name: user.name || 'Usuário', action: 'restore' })}
                                                                    className="gap-2.5 cursor-pointer text-emerald-600 text-xs py-2 px-3 focus:bg-emerald-50 focus:text-emerald-700 rounded-sm"
                                                                >
                                                                    <Undo2 className="w-3.5 h-3.5 opacity-70" />
                                                                    Restaurar usuário
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onSelect={() => setUserToObject({ id: user.id, name: user.name || 'Usuário', action: 'delete' })}
                                                                    className="gap-2.5 cursor-pointer text-rose-600 text-xs py-2 px-3 focus:bg-rose-50 focus:text-rose-700 rounded-sm"
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
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                                            Nenhum usuário encontrado {viewMode === 'archived' ? 'nos arquivos' : ''} para "{searchTerm}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination - Minimalist */}
                <div className="bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Página <span className="font-medium text-slate-900">1</span> de <span className="font-medium text-slate-900">1</span>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>
                            Anterior
                        </button>
                        <button className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>
                            Próxima
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Confirmation Dialog */}
            <AlertDialog open={!!userToObject} onOpenChange={(open) => !open && setUserToObject(null)}>
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
                                <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 text-xl font-medium shadow-sm overflow-hidden">
                                    {selectedUser.avatar_url ? (
                                        <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'
                                    )}
                                </div>
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

                            {/* Activity Section Placeholder */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">Atividade Recente</h4>
                                <div className="text-sm text-slate-500 italic">Nenhuma atividade recente registrada.</div>
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
