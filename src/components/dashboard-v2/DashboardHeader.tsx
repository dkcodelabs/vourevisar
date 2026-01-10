import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles } from 'lucide-react';
import { ExamCountdown } from './ExamCountdown';

export const DashboardHeader = ({ subjectsCount = 0 }: { subjectsCount?: number }) => {
    const { user } = useAuth();
    const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante';

    // Mensagem baseada no horário
    const hour = new Date().getHours();
    let greeting = 'Olá';
    if (hour < 12) greeting = 'Bom dia';
    else if (hour < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    return (
        <div className="flex flex-col gap-6 mb-8">
            {/* Linha 1: Saudação */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 transition-all">
                        {greeting}, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{firstName}</span>!
                        <span className="animate-bounce-slow">👋</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2 text-lg">
                        {subjectsCount === 0 ? (
                            <>
                                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                                <span>Sua jornada de aprovação começa agora. Que tal dar o primeiro passo?</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                <span>Foco total nos estudos! O seu sucesso depende da sua constância.</span>
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* Linha 2: Contagem regressiva da prova - só aparece se tiver matérias */}
            {subjectsCount > 0 && (
                <div className="max-w-sm">
                    <ExamCountdown />
                </div>
            )}
        </div>
    );
};
