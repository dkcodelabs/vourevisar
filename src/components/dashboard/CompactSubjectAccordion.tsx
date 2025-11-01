import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, BookOpen, Target, Zap, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Subject } from '@/types';
import { ReviewProfile, REVIEW_PROFILES } from '@/types/study';
// import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { startOfDay } from 'date-fns';

interface CompactSubjectAccordionProps {
    subjects: Subject[];
}

interface SubjectHealth {
    percentage: number;
    status: 'excellent' | 'good' | 'attention' | 'critical';
    label: string;
    icon: string;
    color: string;
    barColor: string;
    reviewsCompleted: number;
    reviewsTotal: number;
}

export const CompactSubjectAccordion: React.FC<CompactSubjectAccordionProps> = React.memo(({ subjects }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [userReviewProfile, setUserReviewProfile] = useState<ReviewProfile>(ReviewProfile.INTERMEDIATE);
    const navigate = useNavigate();
    // const { userSettings } = useApp();
    const { user } = useAuth();

    // Buscar perfil de revisão do usuário
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!user) return;

            try {
                const { data, error } = await supabase
                    .from('user_settings')
                    .select('review_profile')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) {
                    console.warn('Erro ao buscar perfil do usuário:', error);
                    return;
                }

                if (data?.review_profile) {
                    setUserReviewProfile(data.review_profile as ReviewProfile);
                    // console.log(`👤 Perfil do usuário carregado: ${data.review_profile}`);
                }
            } catch (error) {
                console.warn('Erro ao buscar perfil:', error);
            }
        };

        fetchUserProfile();
    }, [user]);

    if (subjects.length === 0) return null;

    const today = startOfDay(new Date());

    // Função para calcular a saúde da matéria
    const calculateSubjectHealth = (subject: Subject): SubjectHealth => {
        // Usar perfil real do usuário
        const reviewProfile = userReviewProfile;
        const maxReviewsPerTopic = REVIEW_PROFILES[reviewProfile].maxReviews;
        // console.log(`👤 Perfil: ${reviewProfile} - Max revisões por tópico: ${maxReviewsPerTopic}`);

        const totalTopics = subject.topics.length;

        if (totalTopics === 0) {
            return {
                percentage: 0,
                status: 'critical',
                label: 'Sem Tópicos',
                icon: '📝',
                color: 'text-gray-700 bg-gray-50 border-gray-200',
                barColor: 'bg-gray-400',
                reviewsCompleted: 0,
                reviewsTotal: 0
            };
        }

        // Calcular progresso real considerando reviewCount de cada tópico
        const totalProgress = subject.topics.reduce((sum, topic) => {
            const topicProgress = Math.min(topic.reviewCount || 0, maxReviewsPerTopic);
            // console.log(`🔍 ${subject.name} - Tópico: ${topic.name}, reviewCount: ${topic.reviewCount}, progresso: ${topicProgress}/${maxReviewsPerTopic}`);
            return sum + (topicProgress / maxReviewsPerTopic);
        }, 0);

        const percentage = Math.round((totalProgress / totalTopics) * 100);
        // console.log(`📊 ${subject.name} - Progresso: ${totalProgress}/${totalTopics} = ${percentage}%`);
        // console.log(`🎯 ${subject.name} - Tópicos concluídos: ${subject.topics.filter(t => t.reviewStage === 'Concluído').length}/${totalTopics}`);

        const totalReviewsNeeded = totalTopics * maxReviewsPerTopic;
        const completedReviews = subject.topics.reduce((sum, topic) =>
            sum + Math.min(topic.reviewCount || 0, maxReviewsPerTopic), 0
        );

        // Verificar se há tópicos realmente dominados (reviewStage === 'Concluído')
        const hasCompletedTopics = subject.topics.some(topic => topic.reviewStage === 'Concluído');
        const allTopicsCompleted = subject.topics.every(topic => topic.reviewStage === 'Concluído');

        // Determinar status baseado na lógica corrigida
        let status: SubjectHealth['status'];
        let label: string;
        let icon: string;
        let color: string;
        let barColor: string;

        if (percentage === 100) {
            // Exatamente 100% das revisões = Dominada
            status = 'excellent';
            label = 'Dominada';
            icon = '🎯';
            color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
            barColor = 'bg-emerald-500';
        } else if (percentage >= 60) {
            // 60%+ das revisões feitas, mas ainda não finalizada
            status = 'good';
            label = 'Progredindo';
            icon = '⚡';
            color = 'text-blue-700 bg-blue-50 border-blue-200';
            barColor = 'bg-blue-500';
        } else if (percentage >= 40) {
            status = 'attention';
            label = 'Precisa Atenção';
            icon = '⚠️';
            color = 'text-orange-700 bg-orange-50 border-orange-200';
            barColor = 'bg-orange-500';
        } else {
            status = 'critical';
            label = 'Crítica';
            icon = '🚨';
            color = 'text-red-700 bg-red-50 border-red-200';
            barColor = 'bg-red-500';
        }

        return {
            percentage,
            status,
            label,
            icon,
            color,
            barColor,
            reviewsCompleted: completedReviews,
            reviewsTotal: totalReviewsNeeded
        };
    };

    // Calcular estatísticas por matéria com sistema de saúde
    const subjectStats = subjects.map(subject => {
        const health = calculateSubjectHealth(subject);

        // Manter cálculos de urgência para o resumo geral
        const criticalCount = subject.topics.filter(topic => {
            if (!topic.nextReview) return false;
            const reviewDate = startOfDay(new Date(topic.nextReview));
            return reviewDate < today;
        }).length;

        const todayCount = subject.topics.filter(topic => {
            if (!topic.nextReview) return false;
            const reviewDate = startOfDay(new Date(topic.nextReview));
            return reviewDate.getTime() === today.getTime();
        }).length;

        return {
            ...subject,
            health,
            criticalCount,
            todayCount,
            totalTopics: subject.topics.length
        };
    });

    // Estatísticas gerais baseadas no novo sistema
    const totalCritical = subjectStats.reduce((sum, s) => sum + s.criticalCount, 0);
    const totalToday = subjectStats.reduce((sum, s) => sum + s.todayCount, 0);
    const totalExcellent = subjectStats.filter(s => s.health.status === 'excellent').length;
    const totalCriticalHealth = subjectStats.filter(s => s.health.status === 'critical').length;

    const getSubjectIcon = (subject: any) => {
        const name = subject.name.toLowerCase();
        if (name.includes('matemática') || name.includes('matematica')) return '📐';
        if (name.includes('português') || name.includes('portugues')) return '📝';
        if (name.includes('física') || name.includes('fisica')) return '⚛️';
        if (name.includes('química') || name.includes('quimica')) return '🧪';
        if (name.includes('biologia')) return '🧬';
        if (name.includes('história') || name.includes('historia')) return '📚';
        if (name.includes('geografia')) return '🌍';
        if (name.includes('inglês') || name.includes('ingles')) return '🇺🇸';
        return '📖';
    };

    // Função para obter resumo inteligente do header
    const getHeaderSummary = () => {
        if (totalCriticalHealth > 0) {
            return `${totalCriticalHealth} crítica${totalCriticalHealth > 1 ? 's' : ''}`;
        }
        if (totalExcellent > 0) {
            return `${totalExcellent} dominada${totalExcellent > 1 ? 's' : ''}`;
        }
        if (totalCritical > 0) {
            return `${totalCritical} pendente${totalCritical > 1 ? 's' : ''}`;
        }
        return 'Todas progredindo';
    };

    return (
        <TooltipProvider>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                {/* Header do Accordion */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-xl"
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-500 transition-transform flex-shrink-0" />
                        ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500 transition-transform flex-shrink-0" />
                        )}
                        <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="text-left flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    Suas Matérias ({subjects.length})
                                </h3>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer">
                                            <Info className="h-4 w-4" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                        <div className="space-y-2 text-sm">
                                            <div className="font-medium">Como são calculadas:</div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span>🎯</span>
                                                    <span>100% = Dominada</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span>⚡</span>
                                                    <span>60-99% = Progredindo</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span>⚠️</span>
                                                    <span>40-59% = Precisa Atenção</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span>🚨</span>
                                                    <span>0-39% = Crítica</span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 pt-1 border-t">
                                                Seu perfil: {userReviewProfile} ({REVIEW_PROFILES[userReviewProfile].maxReviews} revisões/tópico)
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {getHeaderSummary()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                        {totalCriticalHealth > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                                <AlertCircle className="h-3 w-3" />
                                <span className="hidden sm:inline">{totalCriticalHealth}</span>
                            </div>
                        )}
                        {totalExcellent > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
                                <Target className="h-3 w-3" />
                                <span className="hidden sm:inline">{totalExcellent}</span>
                            </div>
                        )}
                    </div>
                </button>

                {/* Conteúdo Expandido */}
                {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                        <div className="p-4 sm:p-6 space-y-4">
                            {subjectStats.map((subject) => (
                                <div
                                    key={subject.id}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border transition-colors hover:shadow-sm ${subject.health.color}`}
                                >
                                    <div className="flex items-center gap-3 flex-1 mb-3 sm:mb-0">
                                        <span className="text-2xl flex-shrink-0">{getSubjectIcon(subject)}</span>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {subject.name}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {subject.totalTopics} tópico{subject.totalTopics > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                        <div className="flex-1 sm:text-right">
                                            <div className="text-sm font-medium mb-2 flex items-center gap-2 justify-start sm:justify-end">
                                                <span>{subject.health.icon}</span>
                                                <span>{subject.health.percentage}% - {subject.health.label}</span>
                                            </div>
                                            <div className="w-full sm:w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                <div
                                                    className={`${subject.health.barColor} h-2 rounded-full transition-all`}
                                                    style={{ width: `${subject.health.percentage}%` }}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/materias/${subject.id}/topicos`);
                                            }}
                                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors whitespace-nowrap"
                                        >
                                            Ver →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
});