import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdminUser } from '@/hooks/useAdminUsers';
import { invokeAdminRpc } from '@/services/adminRpcService';
import { sendAdminPasswordReset } from '@/services/adminUserManagementService';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { errorService } from '@/lib/errors/errorService';

export const PROTECTED_ADMIN_EMAILS = ['vourevisar@gmail.com', 'darciliok@gmail.com'];

export const useUserAccountActions = ({ setUsers }: { setUsers: Dispatch<SetStateAction<AdminUser[]>> }) => {
    const handleToggleStatus = useCallback(async (user: AdminUser) => {
        if (PROTECTED_ADMIN_EMAILS.includes(user.email || '')) {
            toastGate.notifyError('Este usuário é protegido e seu acesso não pode ser alterado.', 'USER-PROT-02', { severity: 'low' });
            return;
        }
        const isActive = user.is_active !== false;
        const newActiveState = !isActive;
        const rpcFunction = newActiveState ? 'admin_reactivate_user' : 'admin_deactivate_user';
        const confirmed = window.confirm(newActiveState
            ? `Reativar a conta de ${user.email}? Isso restabelece o acesso à conta, mas não cria nem altera uma assinatura ou cobrança.`
            : `Suspender a conta de ${user.email}? O usuário perderá acesso ao produto. Esta ação não cancela nem altera assinatura Stripe, faturas ou concessões de cortesia.`);
        if (!confirmed) return;
        try {
            await invokeAdminRpc(rpcFunction, { target_user_id: user.id });
            setUsers(currentUsers => currentUsers.map(item => item.id === user.id ? { ...item, status: newActiveState ? 'Active' : 'Inactive', is_active: newActiveState } : item));
            toast.success(`Conta ${newActiveState ? 'reativada' : 'suspensa'} com sucesso`);
        } catch (error: unknown) {
            await errorService.report(error, { module: 'users', action: 'toggle_user_status', severity: 'medium', metadata: { userId: user.id, userName: user.name, targetStatus: newActiveState ? 'active' : 'inactive' } });
        }
    }, [setUsers]);

    const handleResetPassword = useCallback(async (user: AdminUser) => {
        if (!user.email || user.email.includes('No email')) return void toastGate.notifyError('Usuário sem email válido para recuperação.', 'USER-NO-EMAIL', { severity: 'low' });
        if (PROTECTED_ADMIN_EMAILS.includes(user.email)) return void toastGate.notifyError('Este usuário é protegido e a senha não pode ser redefinida por aqui.', 'USER-PROT-03', { severity: 'low' });
        if (!user.has_password) return void toastGate.notifyError('Esta conta não possui senha no vouRevisar. O acesso é gerenciado pelo provedor conectado.', 'USER-NO-PASSWORD', { severity: 'low' });
        try {
            await sendAdminPasswordReset(user.email);
            toast.success(`Email de redefinição de senha enviado para ${user.email}`);
        } catch (error: unknown) {
            await errorService.report(error, { module: 'users', action: 'reset_password', severity: 'low', metadata: { userId: user.id, userName: user.name, userEmail: user.email } });
        }
    }, []);

    return { handleResetPassword, handleToggleStatus };
};
