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
import { UserCheck, User, Crown, Shield, Users, Calendar, DollarSign, XCircle, ArrowLeft, RefreshCw, Smartphone, Search } from 'lucide-react';
import { useSubscriptionStats } from '@/hooks/useSubscriptionStats';
import { useNavigate } from 'react-router-dom';
import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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
    avatar_url?: string | null;
}

const SubscriptionManagement = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserWithSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingUserId, setProcessingUserId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const stats = useSubscriptionStats();

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
                .select('user_id, plan, status, trial_ends_at, subscription_ends_at, trial_started_at, subscription_started_at');

            if (subscriptionsError) throw subscriptionsError;

            const processedUsers: UserWithSubscription[] = profiles.map(user => {
                const userRole = roles?.find(r => r.user_id === user.id);
                const subscription = subscriptions?.find(s => s.user_id === user.id);
                const role = userRole?.role || 'user';

                let daysRemaining = null;
                let isActive = false;

                if (subscription) {
                    const now = new Date();
                    if (subscription.status === 'trial' && subscription.trial_ends_at) {
                        const trialEndDate = new Date(subscription.trial_ends_at);
                        isActive = trialEndDate > now;
                        daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                    }
                    if (subscription.status === 'active' && subscription.subscription_ends_at) {
                        const subEndDate = new Date(subscription.subscription_ends_at);
                        isActive = subEndDate > now;
                        daysRemaining = Math.max(0, Math.ceil((subEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                    }
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name || user.email?.split('@')[0] || 'Sem nome',
                    role: role as UserWithSubscription['role'],
                    subscription_plan: subscription?.plan || null,
                    subscription_status: subscription?.status || null,
                    is_active: isActive,
                    days_remaining: daysRemaining,
                    subscription_ends_at: subscription?.subscription_ends_at || subscription?.trial_ends_at || null,
                    avatar_url: user.avatar_url || null
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

    const changeSubscription = async (userId: string, action: 'activate_monthly' | 'activate_annual' | 'activate_trial' | 'deactivate') => {
        try {
            setProcessingUserId(userId);
            setError(null);

            if (action === 'deactivate') {
                const { error } = await supabase.rpc('deactivate_subscription', { target_user_id: userId });
                if (error) throw error;
            } else if (action === 'activate_trial') {
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 7);
                const { error: updateError } = await supabase
                    .from('user_subscriptions')
                    .update({
                        plan: 'free_trial',
                        status: 'trial',
                        trial_started_at: new Date().toISOString(),
                        trial_ends_at: trialEndDate.toISOString(),
                        subscription_started_at: null,
                        subscription_ends_at: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);

                if (updateError) {
                    const { error: insertError } = await supabase.from('user_subscriptions').insert({
                        user_id: userId,
                        plan: 'free_trial',
                        status: 'trial',
                        trial_started_at: new Date().toISOString(),
                        trial_ends_at: trialEndDate.toISOString(),
                        updated_at: new Date().toISOString()
                    });
                    if (insertError) throw insertError;
                }
            } else {
                const planMap = { 'activate_monthly': 'monthly', 'activate_annual': 'annual' };
                const plan = planMap[action];
                const subscriptionEndDate = new Date();
                subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + (plan === 'annual' ? 12 : 1));

                const { error: updateError } = await supabase
                    .from('user_subscriptions')
                    .update({
                        plan: plan as 'free_trial' | 'monthly' | 'annual',
                        status: 'active',
                        subscription_started_at: new Date().toISOString(),
                        subscription_ends_at: subscriptionEndDate.toISOString(),
                        trial_started_at: null,
                        trial_ends_at: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);

                if (updateError) {
                    const { error: insertError } = await supabase.from('user_subscriptions').insert({
                        user_id: userId,
                        plan: plan as 'free_trial' | 'monthly' | 'annual',
                        status: 'active',
                        subscription_started_at: new Date().toISOString(),
                        subscription_ends_at: subscriptionEndDate.toISOString(),
                        updated_at: new Date().toISOString()
                    });
                    if (insertError) throw insertError;
                }
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
                                        {user.subscription_ends_at && (
                                            <div className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1 font-medium">
                                                <Calendar className="w-3 h-3" />
                                                Vence em: {new Date(user.subscription_ends_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pr-2">
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
                                                disabled={user.role === 'owner'}
                                                onValueChange={(value) => changeSubscription(user.id, value as 'activate_monthly' | 'activate_annual' | 'activate_trial' | 'deactivate')}
                                            >
                                                <SelectTrigger className="w-full h-full text-xs font-semibold bg-black/5 dark:bg-white/5 border-transparent outline-none ring-0 hover:bg-black/10 dark:hover:bg-white/10 transition-colors rounded-xl focus:ring-0">
                                                    <SelectValue placeholder="Ações de Assinatura" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl shadow-xl overflow-hidden glass-card p-1 border border-black/10 dark:border-white/10">
                                                    <SelectItem value="activate_trial" className="rounded-xl font-medium m-0.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">🆓 Ativar Trial (7 dias)</SelectItem>
                                                    <SelectItem value="activate_monthly" className="rounded-xl font-medium m-0.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">💰 Ativar Mensal</SelectItem>
                                                    <SelectItem value="activate_annual" className="rounded-xl font-medium m-0.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">💎 Ativar Anual</SelectItem>
                                                    <SelectItem value="deactivate" className="rounded-xl font-bold m-0.5 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10 hover:bg-red-500/10">❌ Remover Acesso</SelectItem>
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
        </div>
    );
};

export default SubscriptionManagement;
