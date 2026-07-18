/**
 * MODULE: SubscriptionManagement
 *
 * RESPONSIBILITY:
 * - Assigning and modifying user subscription plans.
 * - Visualizing subscription status (Active, Trial, Expired).
 * - Manual overrides for customer support.
 *
 * SCOPE STATUS: FROZEN ❄️
 * - This module is considered feature-complete.
 *
 * EXCLUSIONS (DO NOT ADD):
 * - Payment gateway integration logic or checkout flows.
 * - Coupon generation engines.
 * - Product/Pricing management (Use a dedicated localized config or billing provider dashboard).
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UserCheck, User, Crown, Shield, Users, Calendar, DollarSign, XCircle, ArrowLeft, RefreshCw, Smartphone, Search, CreditCard, ExternalLink } from 'lucide-react';
import { useSubscriptionStats } from '@/hooks/useSubscriptionStats';
import { useNavigate } from 'react-router-dom';
import { asaasAdminService, AsaasSubscription, AsaasPayment } from '@/services/asaasAdminService';
import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { invokeAdminRpc } from '@/services/adminRpcService';
import { toastGate } from '@/lib/errors/toastGate';
import { getSubscriptionEntitlement } from '@/utils/subscriptionEntitlement';

interface UserWithSubscription {
    id: string;
    email: string;
    name: string | null;
    role: 'owner' | 'admin' | 'moderator' | 'user' | null;
    subscription_plan: 'free_trial' | 'monthly' | 'annual' | null;
    subscription_status: 'trial' | 'active' | 'expired' | 'canceled' | 'suspended' | null;
    is_active: boolean;
    days_remaining: number | null;
    subscription_ends_at: string | null;
    subscription_date_label: string | null;
    avatar_url?: string | null;
    asaas_subscription_id?: string | null;
    billing_type?: string | null;
}

const SubscriptionManagement = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserWithSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingUserId, setProcessingUserId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const stats = useSubscriptionStats();

    // Asaas Integration State
    const [selectedAsaasUser, setSelectedAsaasUser] = useState<UserWithSubscription | null>(null);
    const [asaasDetails, setAsaasDetails] = useState<{ subscription: AsaasSubscription | null, payments: AsaasPayment[] } | null>(null);
    const [loadingAsaas, setLoadingAsaas] = useState(false);

    // Fetch users and subscriptions
    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, email, name, avatar_url')
                .order('email');

            if (profilesError) throw profilesError;

            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role');

            if (rolesError) throw rolesError;

            const { data: subscriptions, error: subscriptionsError } = await supabase
                .from('user_subscriptions')
                .select('user_id, plan, status, trial_ends_at, subscription_ends_at, next_billing_date, trial_started_at, subscription_started_at, asaas_subscription_id, billing_type');

            if (subscriptionsError) throw subscriptionsError;

            const processedUsers: UserWithSubscription[] = profiles.map(user => {
                const userRole = roles?.find(r => r.user_id === user.id);
                const subscription = subscriptions?.find(s => s.user_id === user.id) as {
                    plan?: 'free_trial' | 'monthly' | 'annual';
                    status?: 'trial' | 'active' | 'expired' | 'canceled' | 'suspended';
                    trial_ends_at?: string;
                    subscription_ends_at?: string;
                    next_billing_date?: string;
                    asaas_subscription_id?: string;
                    billing_type?: string;
                } | undefined;
                const role = userRole?.role || 'user';

                let daysRemaining = null;
                let isActive = false;
                let effectiveStatus: UserWithSubscription['subscription_status'] = subscription?.status || null;

                if (subscription) {
                    const entitlement = getSubscriptionEntitlement({
                        plan: subscription.plan,
                        status: subscription.status,
                        trialEndsAt: subscription.trial_ends_at,
                        subscriptionEndsAt: subscription.subscription_ends_at,
                        nextBillingAt: subscription.next_billing_date,
                    });
                    isActive = entitlement.isActive;
                    daysRemaining = entitlement.daysRemaining || null;
                    effectiveStatus = entitlement.status;
                }

                const displayDate = isActive
                    ? subscription?.next_billing_date || subscription?.subscription_ends_at || subscription?.trial_ends_at || null
                    : subscription?.subscription_ends_at || subscription?.trial_ends_at || subscription?.next_billing_date || null;
                const displayDateLabel = isActive && subscription?.status === 'active'
                    ? 'Próxima cobrança:'
                    : 'Vence em:';

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name || user.email?.split('@')[0] || 'Sem nome',
                    role: role as UserWithSubscription['role'],
                    subscription_plan: subscription?.plan || null,
                    subscription_status: effectiveStatus,
                    is_active: isActive,
                    days_remaining: daysRemaining,
                    subscription_ends_at: displayDate,
                    subscription_date_label: displayDate ? displayDateLabel : null,
                    avatar_url: user.avatar_url || null,
                    asaas_subscription_id: subscription?.asaas_subscription_id || null,
                    billing_type: subscription?.billing_type || null
                };
            });

            setUsers(processedUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
            // Reportar erro silencioso (sem toast), apenas log
            errorService.report(err, {
                module: 'subscriptions',
                action: 'fetch_users_list',
                severity: 'low', // Erro de leitura
                showToast: false
            });
            setError('Erro ao carregar usuários. Tente recarregar a página.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleViewAsaas = async (user: UserWithSubscription) => {
        if (!user.asaas_subscription_id) return;
        setSelectedAsaasUser(user);
        setLoadingAsaas(true);
        try {
            const [subscription, payments] = await Promise.all([
                asaasAdminService.getSubscription(user.asaas_subscription_id),
                asaasAdminService.getSubscriptionPayments(user.asaas_subscription_id)
            ]);
            setAsaasDetails({ subscription, payments });
        } catch (e) {
            errorService.report(e as Error, {
                module: 'subscriptions',
                action: 'fetch_asaas_data'
            });
        } finally {
            setLoadingAsaas(false);
        }
    };

    const changeSubscription = async (userId: string, action: 'activate_monthly' | 'activate_annual' | 'activate_trial' | 'deactivate') => {
        try {
            const targetUser = users.find(user => user.id === userId);
            if (targetUser?.asaas_subscription_id) {
                toastGate.notifyError('Esta assinatura é gerenciada pelo Asaas. Altere o plano no Asaas e sincronize o cadastro.', 'ASAAS-SUB-MANAGED', { severity: 'low' });
                return;
            }

            const actionLabel = {
                activate_trial: 'conceder um trial manual de 7 dias',
                activate_monthly: 'conceder acesso manual mensal',
                activate_annual: 'conceder acesso manual anual',
                deactivate: 'remover o acesso manual',
            }[action];
            if (!window.confirm(`Você vai ${actionLabel}. Esta ação não cria nem altera uma cobrança no Asaas. Continuar?`)) {
                return;
            }

            setProcessingUserId(userId);
            setError(null);

            if (action === 'deactivate') {
                await invokeAdminRpc('deactivate_subscription', { target_user_id: userId });
            } else if (action === 'activate_trial') {
                await invokeAdminRpc('activate_trial_subscription', {
                    target_user_id: userId,
                    trial_days: 7
                });
            } else {
                const planMap = { 'activate_monthly': 'monthly', 'activate_annual': 'annual' };
                const plan = planMap[action];

                await invokeAdminRpc('activate_paid_subscription', {
                    target_user_id: userId,
                    plan_type: plan
                });
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            await fetchUsers();
            stats.refresh();
            toast.success('Assinatura atualizada com sucesso'); // Feedback positivo explícito

        } catch (err) {
            // Error Service Integration
            const normalized = await errorService.report(err, {
                module: 'subscriptions',
                action: 'confirm_change_subscription', // Ação específica
                severity: 'medium', // Falha de negócio/financeira é média/alta
                metadata: {
                    userId: userId,
                    requestedAction: action
                }
            });
            // Não precisamos setar o erro manualmente pq o Toast do errorService já avisa
            // setError(normalized.userMessage);
        } finally {
            setProcessingUserId(null);
        }
    };

    const getSubscriptionBadge = (user: UserWithSubscription) => {
        if (user.role === 'owner') return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/30 shadow-none"><Crown className="w-3 h-3 mr-1" />Proprietário</Badge>;
        if (user.role === 'admin') return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30 shadow-none"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;

        if (user.subscription_status === 'expired' || (user.subscription_ends_at && new Date(user.subscription_ends_at) < new Date())) {
            return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 shadow-none"><XCircle className="w-3 h-3 mr-1" />Expirado</Badge>;
        }
        if (user.is_active && user.subscription_status === 'trial') {
            return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/30 shadow-none"><UserCheck className="w-3 h-3 mr-1" />Trial ({user.days_remaining}d)</Badge>;
        }
        if (user.is_active && user.subscription_plan === 'monthly') {
            return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30 shadow-none"><UserCheck className="w-3 h-3 mr-1" />Mensal</Badge>;
        }
        if (user.is_active && user.subscription_plan === 'annual') {
            return <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:border-primary/30 shadow-none"><UserCheck className="w-3 h-3 mr-1" />Anual</Badge>;
        }
        return <Badge className="bg-foreground/5 text-foreground/60 border-foreground/10 hover:bg-foreground/10 hover:border-foreground/20 shadow-none"><User className="w-3 h-3 mr-1" />Free</Badge>;
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <LoadingSpinner size="large" showText fullPage />;
    }

    return (
        <div className="max-w-[1600px] w-full animate-fade-in font-sans">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="glow-card p-5 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <span className="data-label mb-2 relative z-10">Total de Usuários</span>
                    <span className="text-3xl font-black text-foreground relative z-10">{users.length}</span>
                </div>
                <div className="glow-card p-5 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:opacity-100 transition-opacity"></div>
                    <span className="data-label !text-amber-500 mb-2 relative z-10">Trial Ativo</span>
                    <span className="text-3xl font-black text-amber-600 dark:text-amber-400 relative z-10">{stats.loading ? '-' : stats.freeActiveUsers}</span>
                </div>
                <div className="glow-card p-5 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:opacity-100 transition-opacity"></div>
                    <span className="data-label !text-blue-500 mb-2 relative z-10">Planos Mensais</span>
                    <span className="text-3xl font-black text-blue-600 dark:text-blue-400 relative z-10">{stats.loading ? '-' : stats.monthlyUsers}</span>
                </div>
                <div className="glow-card p-5 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:opacity-100 transition-opacity"></div>
                    <span className="data-label !text-primary mb-2 relative z-10">Planos Anuais</span>
                    <span className="text-3xl font-black text-primary relative z-10">{stats.loading ? '-' : stats.annualUsers}</span>
                </div>
                <div className="glow-card p-5 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:opacity-100 transition-opacity"></div>
                    <span className="data-label !text-red-500 mb-2 relative z-10">Expirados</span>
                    <span className="text-3xl font-black text-red-600 dark:text-red-400 relative z-10">{stats.loading ? '-' : stats.expiredUsers}</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="glass-card rounded-3xl overflow-hidden py-4 px-2">
                <div className="px-6 pb-6 pt-2 flex justify-between items-center flex-wrap gap-4 border-b border-black/5 dark:border-white/5">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 pr-4 py-2.5 w-full text-sm bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground rounded-2xl transition-all outline-none border-transparent focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { fetchUsers(); stats.refresh(); }} disabled={loading} className="gap-2 bg-transparent rounded-xl shrink-0 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 h-10 px-4">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 text-red-500 m-4 p-4 text-sm rounded-2xl border border-red-500/20">
                        {error}
                    </div>
                )}

                <div className="divide-y divide-black/5 dark:divide-white/5 px-4 pb-2">
                    {filteredUsers.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground font-medium">Nenhum usuário encontrado na sua busca.</div>
                    ) : (
                        filteredUsers.map(user => (
                            <div key={user.id} className="p-3 my-1 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors group">
                                <div className="flex items-center gap-4 px-2">
                                    {user.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt={user.name || 'User'}
                                            className="w-12 h-12 rounded-full object-cover border border-black/10 dark:border-white/10"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-foreground font-bold border border-black/10 dark:border-white/10">
                                            {user.name && user.name !== 'Sem nome'
                                                ? user.name.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                                : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-foreground flex items-center gap-2">
                                            {user.name}
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider opacity-60">({user.role})</span>
                                        </div>
                                        <div className="text-sm font-medium text-muted-foreground">{user.email}</div>
                                        {user.role === 'owner' || user.role === 'admin' ? (
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                                                <Crown className="w-3 h-3 text-emerald-500" />
                                                Acesso Vitalício (Sem Expiração)
                                            </div>
                                        ) : user.subscription_ends_at && (
                                            <div className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1 font-medium">
                                                <Calendar className="w-3 h-3" />
                                                {user.subscription_date_label} {new Date(user.subscription_ends_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pr-2">
                                    {user.asaas_subscription_id && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 shadow-none rounded-lg shrink-0 px-3 flex items-center"
                                            onClick={() => handleViewAsaas(user)}
                                        >
                                            <DollarSign className="w-3.5 h-3.5" />
                                            <span className="text-xs font-semibold">Asaas</span>
                                        </Button>
                                    )}
                                    {getSubscriptionBadge(user)}

                                    <div className="w-px h-8 bg-black/10 dark:bg-white/10 mx-2 hidden sm:block"></div>

                                    <div className="relative min-w-[180px] h-10 rounded-xl overflow-hidden flex items-center justify-end">
                                        {processingUserId === user.id ? (
                                            <div className="flex items-center gap-2 pr-4 pl-8 h-full rounded-xl bg-black/5 dark:bg-white/5 text-muted-foreground w-full justify-end border border-black/5 dark:border-white/5">
                                                <span className="text-xs font-bold uppercase tracking-wider">Processando</span>
                                                <LoadingSpinner size="small" />
                                            </div>
                                        ) : (
                                            <Select
                                                disabled={user.role === 'owner' || Boolean(user.asaas_subscription_id)}
                                                onValueChange={(value) => changeSubscription(user.id, value as 'activate_monthly' | 'activate_annual' | 'activate_trial' | 'deactivate')}
                                            >
                                                <SelectTrigger className="w-full h-full text-xs font-semibold bg-black/5 dark:bg-white/5 border-transparent outline-none ring-0 hover:bg-black/10 dark:hover:bg-white/10 transition-colors rounded-xl focus:ring-0">
                                                    <SelectValue placeholder={user.asaas_subscription_id ? 'Gerenciado pelo Asaas' : 'Ações manuais'} />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl shadow-xl overflow-hidden glass-card p-1 border border-black/10 dark:border-white/10">
                                                    <SelectItem value="activate_trial" className="rounded-xl font-medium m-0.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">Conceder trial manual (7 dias)</SelectItem>
                                                    <SelectItem value="activate_monthly" className="rounded-xl font-medium m-0.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">Conceder acesso manual mensal</SelectItem>
                                                    <SelectItem value="activate_annual" className="rounded-xl font-medium m-0.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">Conceder acesso manual anual</SelectItem>
                                                    <SelectItem value="deactivate" className="rounded-xl font-bold m-0.5 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10 hover:bg-red-500/10">Remover acesso manual</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Asaas Modal */}
            {selectedAsaasUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedAsaasUser(null)}>
                    <div className="bg-background border border-black/10 dark:border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-black/5 dark:bg-white/5">
                            <div>
                                <h2 className="text-xl font-black text-foreground flex items-center gap-2">Detalhes Asaas</h2>
                                <p className="text-sm text-muted-foreground mt-1 font-medium">{selectedAsaasUser.name || selectedAsaasUser.email}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/10 dark:hover:bg-white/10" onClick={() => setSelectedAsaasUser(null)}>
                                <XCircle className="w-6 h-6 text-muted-foreground" />
                            </Button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingAsaas ? (
                                <div className="py-12 flex flex-col items-center justify-center">
                                    <LoadingSpinner size="large" />
                                    <p className="text-muted-foreground mt-4 font-medium text-sm">Buscando dados no Asaas...</p>
                                </div>
                            ) : asaasDetails ? (
                                <div className="space-y-6">
                                    <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-5 border border-black/5 dark:border-white/5">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Assinatura Atual</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Status</div>
                                                <div className="font-semibold text-foreground">{asaasDetails.subscription?.status || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Valor</div>
                                                <div className="font-semibold text-foreground">
                                                    {asaasDetails.subscription?.value ? `R$ ${asaasDetails.subscription.value.toFixed(2)}` : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Método</div>
                                                <div className="font-semibold text-foreground">{asaasDetails.subscription?.billingType || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Próx. Vencimento</div>
                                                <div className="font-semibold text-foreground">
                                                    {asaasDetails.subscription?.nextDueDate ? new Date(asaasDetails.subscription.nextDueDate).toLocaleDateString('pt-BR') : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">Histórico de Cobranças</h3>
                                        {asaasDetails.payments && asaasDetails.payments.length > 0 ? (
                                            <div className="space-y-2">
                                                {asaasDetails.payments.map((payment: AsaasPayment) => (
                                                    <div key={payment.id} className="bg-black/5 dark:bg-white/5 rounded-xl p-4 flex justify-between items-center border border-black/5 dark:border-white/5">
                                                        <div>
                                                            <div className="font-bold text-foreground mb-1">R$ {payment.value.toFixed(2)}</div>
                                                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <Calendar className="w-3 h-3" /> Vencimento: {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <Badge className={`shadow-none ${
                                                                payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                                payment.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                                                                payment.status === 'OVERDUE' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' :
                                                                'bg-black/10 dark:bg-white/10 text-foreground border-black/20 dark:border-white/20'
                                                            }`}>{payment.status}</Badge>
                                                            {payment.invoiceUrl && (
                                                                <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                                                                    Ver Fatura <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-6 text-center text-muted-foreground bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 font-medium">
                                                Nenhuma cobrança encontrada.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center">
                                    <p className="text-red-500 font-medium bg-red-500/10 px-6 py-4 rounded-xl border border-red-500/20">Não foi possível carregar os dados do Asaas.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionManagement;
