import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, BookOpen, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Subject } from '@/types';

interface SummaryCardsProps {
    subjects: Subject[];
    overdueCount: number;
    todayCount: number;
    futureCount: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
    subjects,
    overdueCount,
    todayCount,
    futureCount
}) => {
    const navigate = useNavigate();

    // Calcular estatísticas de matérias
    const totalSubjects = subjects.length;
    const completedSubjects = subjects.filter(subject => {
        if (!subject.topics || subject.topics.length === 0) return false;
        return subject.topics.every(topic => topic.reviewStage === 'Concluído');
    }).length;
    const subjectsProgress = totalSubjects > 0 ? Math.round((completedSubjects / totalSubjects) * 100) : 0;

    // Calcular estatísticas de tópicos
    const totalTopics = subjects.reduce((sum, subject) => sum + subject.topics.length, 0);
    const completedTopics = subjects.reduce((sum, subject) =>
        sum + subject.topics.filter(topic => topic.reviewStage === 'Concluído').length, 0
    );
    const topicsProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    const totalReviews = overdueCount + todayCount + futureCount;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Card de Revisão */}
            <div onClick={() => navigate('/revisoes')} className="cursor-pointer group">
                <Card className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 h-full relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                </div>
                                <span className="font-bold text-gray-900 text-lg">Revisão</span>
                            </div>
                            <div className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
                                {totalReviews}
                            </div>
                        </div>

                        <div className="flex justify-between items-end text-center">
                            <div>
                                <div className="text-2xl font-bold text-red-500">{overdueCount}</div>
                                <div className="text-xs text-gray-500 font-medium mt-1">Atrasados</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-orange-500">{todayCount}</div>
                                <div className="text-xs text-gray-500 font-medium mt-1">Hoje</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-500">{futureCount}</div>
                                <div className="text-xs text-gray-500 font-medium mt-1">Futuras</div>
                            </div>
                            <div className="border-l pl-4 ml-2">
                                <div className="text-2xl font-bold text-gray-700">{totalReviews}</div>
                                <div className="text-xs text-gray-500 font-medium mt-1">Total</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Card de Ciclo */}
            <div onClick={() => navigate('/ciclo-estudos')} className="cursor-pointer group">
                <Card className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 h-full relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <BookOpen className="h-5 w-5 text-blue-500" />
                                </div>
                                <span className="font-bold text-gray-900 text-lg">Ciclo de Estudos</span>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500 font-medium mb-0.5">Progresso</div>
                                <div className="text-lg font-bold text-gray-900">{subjectsProgress}%</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-sm text-gray-600 font-medium">
                                {completedSubjects}/{totalSubjects} Concluídas
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${subjectsProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Card de Tópicos */}
            <div onClick={() => navigate('/ciclo-estudos')} className="cursor-pointer group">
                <Card className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 h-full relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500"></div>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <Target className="h-5 w-5 text-green-500" />
                                </div>
                                <span className="font-bold text-gray-900 text-lg">Tópicos</span>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500 font-medium mb-0.5">Progresso</div>
                                <div className="text-lg font-bold text-gray-900">{topicsProgress}%</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-sm text-gray-600 font-medium">
                                {completedTopics}/{totalTopics} Concluídos
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${topicsProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
