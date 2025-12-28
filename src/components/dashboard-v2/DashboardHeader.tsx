import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles } from 'lucide-react';

export const DashboardHeader = () => {
    const { user } = useAuth();
    const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante';

    // Mensagem baseada no horário
    const hour = new Date().getHours();
    let greeting = 'Olá';
    if (hour < 12) greeting = 'Bom dia';
    else if (hour < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    {greeting}, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{firstName}</span>!
                    <span className="animate-pulse">👋</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Pronto para superar seus limites hoje?
                </p>
            </div>

            {/* Aqui poderia entrar um botão de ação rápida global se necessário */}
        </div>
    );
};
