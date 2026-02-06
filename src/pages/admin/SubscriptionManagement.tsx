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
                .select('id, email, name')
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
                    role: role as any,
                    subscription_plan: subscription?.plan || null,
                    subscription_status: subscription?.status || null,
                    is_active: isActive,
                    days_remaining: daysRemaining,
                    subscription_ends_at: subscription?.subscription_ends_at || subscription?.trial_ends_at || null
                };
            });

            setUsers(processedUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
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
                        plan: plan as any,
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
                        plan: plan as any,
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

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao alterar assinatura');
        } finally {
            setProcessingUserId(null);
        }
    };

    const getSubscriptionBadge = (user: UserWithSubscription) => {
        if (user.role === 'owner') return <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200"><Crown className="w-3 h-3 mr-1" />Proprietário</Badge>;
        if (user.role === 'admin') return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;

        if (user.subscription_status === 'expired' || (user.subscription_ends_at && new Date(user.subscription_ends_at) < new Date())) {
            return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200"><XCircle className="w-3 h-3 mr-1" />Expirado</Badge>;
        }
        if (user.is_active && user.subscription_status === 'trial') {
            return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200"><UserCheck className="w-3 h-3 mr-1" />Trial ({user.days_remaining}d)</Badge>;
        }
        if (user.is_active && user.subscription_plan === 'monthly') {
            return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"><UserCheck className="w-3 h-3 mr-1" />Mensal</Badge>;
        }
        if (user.is_active && user.subscription_plan === 'annual') {
            return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200"><UserCheck className="w-3 h-3 mr-1" />Anual</Badge>;
        }
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"><User className="w-3 h-3 mr-1" />Free</Badge>;
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in font-sans text-slate-900">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/admin')}
                    className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1 mb-2 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            Gestão de Assinaturas
                        </h1>
                        <p className="text-slate-500 mt-1.5 text-sm">Controle de planos, status de pagamento e acesso dos usuários.</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <span className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-2">Total de Usuários</span>
                    <span className="text-3xl font-black text-slate-900">{users.length}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center border-l-4 border-l-amber-400">
                    <span className="text-amber-600 text-xs uppercase font-bold tracking-wider mb-2">Trial Ativo</span>
                    <span className="text-3xl font-black text-amber-600">{stats.loading ? '-' : stats.freeActiveUsers}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center border-l-4 border-l-blue-500">
                    <span className="text-blue-600 text-xs uppercase font-bold tracking-wider mb-2">Planos Mensais</span>
                    <span className="text-3xl font-black text-blue-600">{stats.loading ? '-' : stats.monthlyUsers}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center border-l-4 border-l-indigo-600">
                    <span className="text-indigo-600 text-xs uppercase font-bold tracking-wider mb-2">Planos Anuais</span>
                    <span className="text-3xl font-black text-indigo-600">{stats.loading ? '-' : stats.annualUsers}</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-wrap gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 w-full text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-200 outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { fetchUsers(); stats.refresh(); }} disabled={loading} className="gap-2">
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 text-sm border-b border-red-100">
                        {error}
                    </div>
                )}

                <div className="divide-y divide-slate-50">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400">Carregando...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">Nenhum usuário encontrado.</div>
                    ) : (
                        filteredUsers.map(user => (
                            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900 flex items-center gap-2">
                                            {user.name}
                                            <span className="text-xs font-normal text-slate-400">({user.role})</span>
                                        </div>
                                        <div className="text-sm text-slate-500">{user.email}</div>
                                        {user.subscription_ends_at && (
                                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Vence em: {new Date(user.subscription_ends_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {getSubscriptionBadge(user)}

                                    <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block"></div>

                                    <Select
                                        disabled={processingUserId === user.id || user.role === 'owner'}
                                        onValueChange={(value) => changeSubscription(user.id, value as any)}
                                    >
                                        <SelectTrigger className="w-[180px] h-9 text-xs">
                                            <SelectValue placeholder="Ações de Assinatura" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="activate_trial">🆓 Ativar Trial (7 dias)</SelectItem>
                                            <SelectItem value="activate_monthly">💰 Ativar Mensal</SelectItem>
                                            <SelectItem value="activate_annual">💎 Ativar Anual</SelectItem>
                                            <SelectItem value="deactivate" className="text-red-600 focus:text-red-700 focus:bg-red-50">❌ Remover Acesso</SelectItem>
                                        </SelectContent>
                                    </Select>
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
