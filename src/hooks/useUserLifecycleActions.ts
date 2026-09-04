import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdminUser } from '@/hooks/useAdminUsers';
import { invokeAdminRpc } from '@/services/adminRpcService';
import { restoreAdminUser, softDeleteAdminUser } from '@/services/adminUserManagementService';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { errorService } from '@/lib/errors/errorService';

export type UserLifecycleRequest = {
    id: string;
    name: string;
    email?: string;
    action: 'archive' | 'restore' | 'delete' | 'purge';
};

type UserLifecycleOptions = {
    request: UserLifecycleRequest | null;
    selectedUser: AdminUser | null;
    purgeConfirmText: string;
    setUsers: Dispatch<SetStateAction<AdminUser[]>>;
    setRequest: Dispatch<SetStateAction<UserLifecycleRequest | null>>;
    setPurgeConfirmText: Dispatch<SetStateAction<string>>;
    protectedEmails: string[];
};

export const useUserLifecycleActions = ({
    request,
    selectedUser,
    purgeConfirmText,
    setUsers,
    setRequest,
    setPurgeConfirmText,
    protectedEmails,
}: UserLifecycleOptions) => {
    const handleArchiveUser = useCallback(async () => {
        if (!request || request.action !== 'archive') return;
        if (selectedUser?.email && protectedEmails.includes(selectedUser.email)) {
            toastGate.notifyError('Este usuário é protegido e não pode ser arquivado.', 'USER-PROT-01', { severity: 'low' });
            return;
        }
        try {
            await softDeleteAdminUser(request.id);
            setUsers(users => users.map(user => user.id === request.id
                ? { ...user, deleted_at: new Date().toISOString(), status: 'Archived' }
                : user));
            toast.success('Usuário arquivado com sucesso');
        } catch (error: unknown) {
            await errorService.report(error, {
                module: 'users',
                action: 'archive_user',
                severity: 'medium',
                metadata: { userId: request.id, userName: request.name },
            });
        } finally {
            setRequest(null);
        }
    }, [protectedEmails, request, selectedUser?.email, setRequest, setUsers]);

    const handleRestoreUser = useCallback(async () => {
        if (!request || request.action !== 'restore') return;
        try {
            await restoreAdminUser(request.id);
            setUsers(users => users.map(user => user.id === request.id
                ? { ...user, deleted_at: null, status: 'Active' }
                : user));
            toast.success('Usuário restaurado com sucesso');
        } catch (error: unknown) {
            await errorService.report(error, {
                module: 'users',
                action: 'restore_user',
                severity: 'medium',
                metadata: { userId: request.id, userName: request.name },
            });
        } finally {
            setRequest(null);
        }
    }, [request, setRequest, setUsers]);

    const deleteUser = useCallback(async (action: 'delete' | 'purge') => {
        if (!request || request.action !== action) return;
        if (action === 'purge' && purgeConfirmText !== 'EXCLUIR') return;
        try {
            await invokeAdminRpc('admin_purge_user', { p_target_user_id: request.id });
            setUsers(users => users.filter(user => user.id !== request.id));
            toast.success(action === 'purge'
                ? `Usuário ${request.name} excluído completamente do sistema.`
                : 'Usuário excluído permanentemente');
        } catch (error: unknown) {
            if (action === 'purge') {
                const message = error instanceof Error ? error.message : 'Erro desconhecido ao excluir usuário.';
                toastGate.notifyError(message, 'USER-PURGE-ERR', { severity: 'critical' });
            }
            await errorService.report(error, {
                module: 'users',
                action: action === 'purge' ? 'purge_user' : 'delete_user',
                severity: action === 'purge' ? 'critical' : 'high',
                metadata: { userId: request.id, userName: request.name, userEmail: request.email },
            });
        } finally {
            setRequest(null);
            if (action === 'purge') setPurgeConfirmText('');
        }
    }, [purgeConfirmText, request, setPurgeConfirmText, setRequest, setUsers]);

    return {
        handleArchiveUser,
        handleRestoreUser,
        handleHardDeleteUser: () => deleteUser('delete'),
        handlePurgeUser: () => deleteUser('purge'),
    };
};
