import type { ReactNode } from 'react';
import { Activity, KeyRound, LogIn, LogOut, Mail, Slash, UserCheck, UserCog } from 'lucide-react';

export const PAGE_SIZE = 25;
export const EVENT_TYPES = ['LOGIN', 'LOGOUT', 'SESSION_START', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_REACTIVATED', 'ROLE_CHANGED', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS', 'EMAIL_CHANGED', 'PROFILE_UPDATED', 'EMAIL_CONFIRMED'];
export const PERIOD_OPTIONS = [
    { label: 'Hoje', value: 'today' }, { label: '7 dias', value: '7days' }, { label: '30 dias', value: '30days' },
    { label: '90 dias', value: '90days' }, { label: 'Personalizado', value: 'custom' },
];
export const EVENT_ICONS: Record<string, ReactNode> = {
    LOGIN: <LogIn className="w-4 h-4" />, LOGOUT: <LogOut className="w-4 h-4" />, SESSION_START: <Activity className="w-4 h-4" />,
    ACCOUNT_DEACTIVATED: <Slash className="w-4 h-4" />, ACCOUNT_REACTIVATED: <UserCheck className="w-4 h-4" />, ROLE_CHANGED: <UserCog className="w-4 h-4" />,
    PASSWORD_RESET_REQUEST: <KeyRound className="w-4 h-4" />, PASSWORD_RESET_SUCCESS: <KeyRound className="w-4 h-4" />,
    EMAIL_CHANGED: <Mail className="w-4 h-4" />, PROFILE_UPDATED: <UserCog className="w-4 h-4" />, EMAIL_CONFIRMED: <Mail className="w-4 h-4" />,
};
export const EVENT_LABELS: Record<string, string> = {
    LOGIN: 'Login', LOGOUT: 'Logout', SESSION_START: 'Sessão iniciada', ACCOUNT_DEACTIVATED: 'Conta desativada',
    ACCOUNT_REACTIVATED: 'Conta reativada', ROLE_CHANGED: 'Papel alterado', PASSWORD_RESET_REQUEST: 'Solicitação reset senha',
    PASSWORD_RESET_SUCCESS: 'Senha redefinida', EMAIL_CHANGED: 'Email alterado', PROFILE_UPDATED: 'Perfil atualizado', EMAIL_CONFIRMED: 'Email confirmado',
};
export const SEVERITY_COLORS: Record<string, string> = {
    LOGIN: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10', LOGOUT: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10',
    SESSION_START: 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10', ACCOUNT_DEACTIVATED: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
    ACCOUNT_REACTIVATED: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10', ROLE_CHANGED: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
    PASSWORD_RESET_REQUEST: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10', PASSWORD_RESET_SUCCESS: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
    EMAIL_CHANGED: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10', PROFILE_UPDATED: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10',
    EMAIL_CONFIRMED: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
};
